import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, connect, sleep, answerFor } from './helpers.mjs';

const REVEAL_MS = 6000;
const ENV = {
	GEOSHAPE_SECRET: 'test-secret',
	GEOSHAPE_ROUND_END_PAUSE_MS: String(REVEAL_MS),
	GEOSHAPE_COUNTDOWN_MS: '100'
};

let server;
before(async () => (server = await startServer(ENV)));
after(() => server.stop());

const profile = (name) => ({ name, avatar: 'avataaars' });

async function roomAtReveal() {
	const host = connect(server.wsUrl);
	const guest = connect(server.wsUrl);
	await Promise.all([host.opened, guest.opened]);

	host.send({ type: 'create', profile: profile('Host') });
	const { code } = await host.wait((m) => m.type === 'created', { label: 'created' });
	guest.send({ type: 'join', code, profile: profile('Guest') });
	await guest.wait((m) => m.type === 'created', { label: 'join ack' });

	const from = server.log().length;
	host.send({ type: 'settings', maxRounds: 2, roundDurationSec: 30 });
	host.send({ type: 'start' });
	await host.wait((m) => m.type === 'round_start' && m.round === 1, { label: 'round 1' });

	const answer = await answerFor(server, code, 1, { from });
	host.send({ type: 'guess', text: answer });
	guest.send({ type: 'guess', text: answer });
	await host.wait((m) => m.type === 'round_end', { label: 'round_end' });

	return { host, guest, code };
}

test('the host skips the reveal instead of waiting it out', async () => {
	const { host, guest } = await roomAtReveal();

	const startedAt = Date.now();
	host.send({ type: 'skip' });
	const next = await host.wait((m) => m.type === 'round_start' && m.round === 2, {
		label: 'round 2',
		timeout: REVEAL_MS - 1000
	});
	assert.ok(Date.now() - startedAt < 1000, 'the next round follows the skip, not the timer');
	assert.equal(next.round, 2);
	await guest.wait((m) => m.type === 'round_start' && m.round === 2, { label: 'guest round 2' });

	host.close();
	guest.close();
});

test('a guest cannot skip the reveal for everyone', async () => {
	const { host, guest } = await roomAtReveal();

	guest.send({ type: 'skip' });
	await sleep(1000);
	assert.ok(
		!guest.ofType('round_start').some((m) => m.round === 2),
		'the reveal runs on regardless'
	);
	await guest.wait((m) => m.type === 'round_start' && m.round === 2, {
		label: 'round 2 on the timer',
		timeout: REVEAL_MS
	});

	host.close();
	guest.close();
});

test('the daily cannot be paused, but an ordinary room can', async () => {
	const normal = connect(server.wsUrl);
	await normal.opened;
	normal.send({ type: 'create', profile: profile('Pauser') });
	await normal.wait((m) => m.type === 'created', { label: 'created' });
	normal.send({ type: 'start' });
	await normal.wait((m) => m.type === 'round_start', { label: 'round_start' });
	normal.send({ type: 'pause' });
	await normal.wait((m) => m.type === 'paused', { label: 'paused' });
	normal.close();

	const daily = connect(server.wsUrl);
	await daily.opened;
	daily.send({ type: 'start_daily', profile: profile('DailyPauser') });
	await daily.wait((m) => m.type === 'created', { label: 'daily created' });
	await daily.wait((m) => m.type === 'round_start', { label: 'daily round_start' });

	daily.send({ type: 'pause' });
	await sleep(500);
	assert.equal(daily.ofType('paused').length, 0, 'the daily timer keeps running');

	daily.close();
});
