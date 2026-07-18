import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, connect, sleep } from './helpers.mjs';

// Fast timings so the sweeper and the heartbeat can be observed in seconds.
let server;
before(
	async () =>
		(server = await startServer({
			GEOSHAPE_HEARTBEAT_MS: '500',
			GEOSHAPE_ROOM_IDLE_MS: '2500',
			GEOSHAPE_ROOM_SWEEP_MS: '400'
		}))
);
after(() => server.stop());

const profile = (name) => ({ name, avatar: 'avataaars' });

test('malformed and hostile messages cannot bring the process down', async () => {
	const client = connect(server.wsUrl);
	await client.opened;
	client.send({ type: 'create', profile: profile('Victim') });
	await client.wait((m) => m.type === 'created', { label: 'created' });

	for (const hostile of [
		{ type: { evil: true } },
		{ type: 'guess', text: { nested: [1, 2] } },
		{ type: 'guess', text: null },
		{ type: 'say', text: 12345 },
		{ type: 'settings', maxRounds: 'NaN', roundDurationSec: -Infinity, categoryId: {} },
		{ type: 'react', emoji: ['not', 'an', 'emoji'] },
		{ type: 'join', code: null, profile: null },
		{ type: 'admin_action', action: { weird: true } },
		{ type: 'unknown_type' },
		{}
	]) {
		client.send(hostile);
	}

	client.send({ type: 'ping', t0: Date.now() });
	const pong = await client.wait((m) => m.type === 'pong', { label: 'pong' });
	assert.ok(pong, 'the server is still answering');

	const health = await server.health();
	assert.equal(health.status, 'ok');
	client.close();
});

test('a socket that stops answering pings is dropped, a healthy one is not', async () => {
	const host = connect(server.wsUrl);
	await host.opened;
	host.send({ type: 'create', profile: profile('Host') });
	const { code } = await host.wait((m) => m.type === 'created', { label: 'created' });

	// autoPong: false makes this client look dead to the heartbeat.
	const zombie = connect(server.wsUrl, { autoPong: false });
	await zombie.opened;
	zombie.send({ type: 'join', code, profile: profile('Zombie') });
	await zombie.wait((m) => m.type === 'created', { label: 'join ack' });

	await host.wait(
		(m) =>
			m.type === 'room_state' && m.room.players.some((p) => p.name === 'Zombie' && !p.connected),
		{ timeout: 10000, label: 'zombie marked disconnected' }
	);
	assert.equal(host.ws.readyState, 1, 'the healthy client survived the heartbeats');

	host.close();
	zombie.close();
});

test('an idle room is swept, but a live round is not', async () => {
	const idle = connect(server.wsUrl);
	await idle.opened;
	idle.send({ type: 'create', profile: profile('Idler') });
	await idle.wait((m) => m.type === 'created', { label: 'created' });

	// Chatting keeps it alive past the (2.5s) idle window…
	for (let i = 0; i < 4; i++) {
		idle.send({ type: 'say', text: `still here ${i}` });
		await sleep(900);
	}
	assert.ok(
		!idle.seen.some((m) => m.type === 'error' && m.code === 'closed'),
		'an active room is not swept'
	);

	// …and going quiet gets it collected.
	const closed = await idle.wait((m) => m.type === 'error' && m.code === 'closed', {
		timeout: 10000,
		label: 'idle room closed'
	});
	assert.match(closed.message, /inactivity/i);
	idle.close();
});

test('a running round survives the sweeper even when nobody talks', async () => {
	const player = connect(server.wsUrl);
	await player.opened;
	player.send({ type: 'create', profile: profile('Quiet'), solo: true });
	await player.wait((m) => m.type === 'created', { label: 'created' });

	player.send({ type: 'settings', maxRounds: 1, roundDurationSec: 30 });
	player.send({ type: 'start' });
	await player.wait((m) => m.type === 'round_start', { label: 'round_start' });

	// Idle window is 2.5s here and the round runs 30s: staying silent must not evict it.
	await sleep(5000);
	assert.ok(
		!player.seen.some((m) => m.type === 'error' && m.code === 'closed'),
		'the live round was not swept'
	);
	player.close();
});

test('SIGTERM tells clients to reconnect and exits cleanly', async () => {
	const dying = await startServer();
	const client = connect(dying.wsUrl);
	await client.opened;
	client.send({ type: 'create', profile: profile('Bye') });
	await client.wait((m) => m.type === 'created', { label: 'created' });

	const exitCode = dying.terminate();
	await client.wait((m) => m.type === 'server_shutdown', { label: 'shutdown notice' });
	assert.equal(await exitCode, 0, 'exited cleanly');
	await sleep(200);
	assert.equal(client.closeCode, 1012, 'socket closed with "service restart"');

	await dying.stop();
});
