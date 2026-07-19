import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, connect, sleep } from './helpers.mjs';

const TOKEN = 'test-admin-token';

let server;
before(async () => (server = await startServer({ GEOSHAPE_ADMIN_TOKEN: TOKEN })));
after(() => server.stop());

const profile = (name) => ({ name, avatar: 'avataaars' });

async function signedIn() {
	const admin = connect(server.wsUrl);
	await admin.opened;
	admin.send({ type: 'admin_auth', token: TOKEN });
	await admin.wait((m) => m.type === 'admin_ok', { label: 'admin_ok' });
	return admin;
}

test('an unauthenticated socket reaches nothing', async () => {
	const intruder = connect(server.wsUrl);
	await intruder.opened;

	intruder.send({ type: 'admin_watch' });
	intruder.send({ type: 'admin_action', action: 'maintenance', on: true });
	intruder.send({ type: 'admin_search', query: '' });
	await sleep(400);

	assert.equal(intruder.seen.length, 3);
	assert.ok(
		intruder.seen.every((m) => m.type === 'error' && m.code === 'denied'),
		'every admin message was refused'
	);
	assert.equal(intruder.last('admin_state'), undefined, 'no snapshot leaked');
	intruder.close();
});

test('a wrong token is rejected and guessing is throttled', async () => {
	const guesser = connect(server.wsUrl);
	await guesser.opened;

	guesser.send({ type: 'admin_auth', token: 'nope' });
	const denied = await guesser.wait((m) => m.type === 'error', { label: 'denial' });
	assert.match(denied.message, /Invalid token/);

	for (let i = 0; i < 6; i++) guesser.send({ type: 'admin_auth', token: `guess-${i}` });
	await sleep(400);
	assert.ok(
		guesser.seen.some((m) => /Too many attempts/.test(m.message ?? '')),
		'brute force is rate-limited'
	);
	guesser.close();
});

test('admin is off entirely when no token is configured', async () => {
	const open = await startServer(); // no GEOSHAPE_ADMIN_TOKEN
	try {
		const client = connect(open.wsUrl);
		await client.opened;
		client.send({ type: 'admin_auth', token: 'anything' });
		const denied = await client.wait((m) => m.type === 'error', { label: 'denial' });
		assert.equal(denied.code, 'denied');
		assert.match(denied.message, /disabled/i);
		client.close();
	} finally {
		await open.stop();
	}
});

test('the dashboard sees live rooms and a finished game lands in the games table', async () => {
	const admin = await signedIn();
	admin.send({ type: 'admin_watch' });
	await admin.wait((m) => m.type === 'admin_state', { label: 'snapshot' });

	const alice = connect(server.wsUrl);
	const bob = connect(server.wsUrl);
	await Promise.all([alice.opened, bob.opened]);
	alice.send({ type: 'create', profile: profile('Alice') });
	const { code } = await alice.wait((m) => m.type === 'created', { label: 'created' });
	bob.send({ type: 'join', code, profile: profile('Bob') });
	await bob.wait((m) => m.type === 'created', { label: 'join ack' });

	const live = await admin.wait(
		(m) =>
			m.type === 'admin_state' &&
			m.state.rooms.some((r) => r.code === code && r.players.length === 2),
		{ label: 'room in snapshot' }
	);
	const room = live.state.rooms.find((r) => r.code === code);
	assert.deepEqual(
		room.players.map((p) => p.name).sort(),
		['Alice', 'Bob'],
		'both players are listed'
	);

	alice.send({ type: 'settings', maxRounds: 1, roundDurationSec: 30 });
	alice.send({ type: 'start' });
	await alice.wait((m) => m.type === 'round_start', { label: 'round_start' });
	const answer = [...server.log().matchAll(/round 1\/1: answer = (.+)$/gm)].pop()?.[1];
	assert.ok(answer, 'found the round answer in the log');
	alice.send({ type: 'guess', text: answer });
	bob.send({ type: 'guess', text: answer });
	await alice.wait((m) => m.type === 'game_over', { timeout: 25000, label: 'game_over' });

	const after = await admin.wait(
		(m) => m.type === 'admin_state' && m.state.recentGames.some((g) => g.code === code),
		{ label: 'game recorded' }
	);
	const record = after.state.recentGames.find((g) => g.code === code);
	assert.equal(record.players, 2);
	assert.equal(record.rounds, 1);
	assert.equal(record.solo, false);
	assert.ok(record.topScore > 0);
	assert.ok(after.state.totals.gamesToday >= 1);

	alice.close();
	bob.close();
	admin.close();
});

test('announce, maintenance, kick and close-room work', async () => {
	const admin = await signedIn();
	const player = connect(server.wsUrl);
	await player.opened;
	player.send({ type: 'create', profile: profile('Pat') });
	const { code } = await player.wait((m) => m.type === 'created', { label: 'created' });

	const browsing = connect(server.wsUrl);
	await browsing.opened;

	admin.send({ type: 'admin_action', action: 'announce', text: 'Restart in 5 minutes' });
	const notice = await player.wait((m) => m.type === 'notice', { label: 'notice' });
	assert.equal(notice.text, 'Restart in 5 minutes');

	const alsoHeard = await browsing.wait((m) => m.type === 'notice', { label: 'notice (no room)' });
	assert.equal(alsoHeard.text, 'Restart in 5 minutes', 'reaches clients outside any room');
	browsing.close();

	admin.send({ type: 'admin_action', action: 'maintenance', on: true });
	await sleep(300);
	const latecomer = connect(server.wsUrl);
	await latecomer.opened;
	latecomer.send({ type: 'create', profile: profile('Late') });
	const blocked = await latecomer.wait((m) => m.type === 'error', { label: 'maintenance refusal' });
	assert.equal(blocked.code, 'maintenance', 'no new rooms during maintenance');

	admin.send({ type: 'admin_action', action: 'maintenance', on: false });
	await sleep(300);
	latecomer.send({ type: 'create', profile: profile('Late') });
	await latecomer.wait((m) => m.type === 'created', { label: 'created after maintenance' });

	// kick, then close the room
	const guest = connect(server.wsUrl);
	await guest.opened;
	guest.send({ type: 'join', code, profile: profile('Guest') });
	const joined = await guest.wait((m) => m.type === 'created', { label: 'join ack' });
	admin.send({ type: 'admin_action', action: 'kick_player', code, playerId: joined.playerId });
	const kicked = await guest.wait((m) => m.type === 'error' && m.code === 'kicked', {
		label: 'kick'
	});
	assert.ok(kicked);

	admin.send({ type: 'admin_action', action: 'close_room', code });
	const closed = await player.wait((m) => m.type === 'error' && m.code === 'closed', {
		label: 'room closed'
	});
	assert.ok(closed);

	player.close();
	guest.close();
	latecomer.close();
	admin.close();
});

test('player records can be searched and deleted', async () => {
	const admin = await signedIn();
	admin.send({ type: 'admin_search', query: 'Alice' });
	const found = await admin.wait((m) => m.type === 'admin_players', { label: 'search' });
	const alice = found.players.find((p) => p.name === 'Alice');
	assert.ok(alice, 'the earlier game left a record');
	assert.ok(alice.clientId, 'the admin view exposes the clientId (needed to delete it)');

	admin.send({ type: 'admin_action', action: 'delete_player', clientId: alice.clientId });
	await sleep(400);
	admin.send({ type: 'admin_search', query: 'Alice' });
	await sleep(500);

	const after = admin.last('admin_players');
	assert.ok(!after.players.some((p) => p.clientId === alice.clientId), 'the record is gone');
	admin.close();
});
