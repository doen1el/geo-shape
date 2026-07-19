import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startServer, connect, sleep, solveRound, answerFor } from './helpers.mjs';

// A pinned secret makes the day's plan reproducible; a pinned date makes it addressable.
const ENV = {
	GEOSHAPE_SECRET: 'test-secret',
	GEOSHAPE_ROUND_END_PAUSE_MS: '100',
	GEOSHAPE_COUNTDOWN_MS: '100'
};

let server;
before(async () => (server = await startServer({ ...ENV, GEOSHAPE_TODAY: '2026-03-01' })));
after(() => server.stop());

const profile = (name) => ({ name, avatar: 'avataaars' });

/** Plays a whole daily run to completion, returning the shapes it was served. */
async function playDaily(client, prof, srv = server) {
	const from = srv.log().length;
	client.send({ type: 'start_daily', profile: prof });
	const { code } = await client.wait((m) => m.type === 'created', { label: 'daily created' });
	const shapes = [];
	for (let round = 1; round <= 5; round++) {
		await solveRound(client, srv, code, round, from);
		shapes.push(await answerFor(srv, code, round, { from }));
	}
	await client.wait((m) => m.type === 'game_over', { label: 'game_over', timeout: 20000 });
	return shapes;
}

test('everyone gets the identical run on the same day', async () => {
	const alice = connect(server.wsUrl);
	const bob = connect(server.wsUrl);
	await Promise.all([alice.opened, bob.opened]);

	const aliceShapes = await playDaily(alice, profile('DailyAlice'));
	const bobShapes = await playDaily(bob, profile('DailyBob'));

	assert.equal(aliceShapes.length, 5, 'five rounds');
	assert.deepEqual(bobShapes, aliceShapes, 'the same five shapes, in the same order');

	alice.close();
	bob.close();
});

/**
 * The signed identity the server just issued. Replaying it is what makes the server treat
 * you as the same player — a profile without it is a brand new stranger.
 */
const signedProfile = (client, name) => {
	const identity = client.last('identity');
	return { ...profile(name), clientId: identity.clientId, clientSig: identity.sig };
};

test('a second attempt on the same day is refused', async () => {
	const client = connect(server.wsUrl);
	await client.opened;

	await playDaily(client, profile('OneShot'));
	await sleep(300);

	client.send({ type: 'start_daily', profile: signedProfile(client, 'OneShot') });
	const err = await client.wait((m) => m.type === 'error', { label: 'refusal' });
	assert.equal(err.code, 'daily_done', 'the attempt is spent');

	client.close();
});

test('an abandoned run still burns the attempt', async () => {
	const client = connect(server.wsUrl);
	await client.opened;

	client.send({ type: 'start_daily', profile: profile('Quitter') });
	await client.wait((m) => m.type === 'created', { label: 'created' });
	await client.wait((m) => m.type === 'round_start', { label: 'round 1' });
	client.send({ type: 'leave' });
	await sleep(300);

	client.send({ type: 'start_daily', profile: signedProfile(client, 'Quitter') });
	const err = await client.wait((m) => m.type === 'error', { label: 'refusal' });
	assert.equal(err.code, 'daily_done', 'claiming at the start is what makes this one attempt');

	client.close();
});

test('the board ranks finished runs and hides abandoned ones', async () => {
	const client = connect(server.wsUrl);
	await client.opened;

	client.send({ type: 'get_daily' });
	const daily = await client.wait((m) => m.type === 'daily', { label: 'daily' });

	assert.equal(daily.daily.day, '2026-03-01');
	assert.equal(daily.daily.rounds, 5);
	const names = daily.daily.board.map((r) => r.name);
	assert.ok(names.includes('DailyAlice'), 'a finished run is on the board');
	assert.ok(!names.includes('Quitter'), 'an abandoned run is not');
	assert.ok(
		!JSON.stringify(daily).includes('clientId'),
		'the board never leaks the secret client id'
	);

	client.close();
});

test('the streak grows on consecutive days and resets after a gap', async () => {
	// One database that outlives the servers — each "day" is a fresh boot against it,
	// because GEOSHAPE_TODAY is only read from the environment.
	const shared = mkdtempSync(join(tmpdir(), 'geoshape-streak-'));
	const dbPath = join(shared, 'streak.db');

	/** Plays the whole daily on `day` and returns the streak the server reports back. */
	const streakOn = async (day, me) => {
		const s = await startServer({ ...ENV, GEOSHAPE_TODAY: day, GEOSHAPE_DB: dbPath });
		const c = connect(s.wsUrl);
		await c.opened;

		const from = s.log().length;
		c.send({ type: 'start_daily', profile: me });
		const { code } = await c.wait((m) => m.type === 'created', { label: `created ${day}` });
		const identity = c.last('identity');
		if (identity) me = { ...me, clientId: identity.clientId, clientSig: identity.sig };

		for (let round = 1; round <= 5; round++) await solveRound(c, s, code, round, from);
		await c.wait((m) => m.type === 'game_over', { label: 'game_over', timeout: 20000 });
		await sleep(200);

		c.send({ type: 'get_daily', clientId: me.clientId, sig: me.clientSig });
		const res = await c.wait((m) => m.type === 'daily', { label: `daily ${day}` });
		c.close();
		await s.stop();
		return { streak: res.daily.streak, me };
	};

	let me = profile('Streaker');
	let out = await streakOn('2026-04-01', me);
	assert.equal(out.streak, 1, 'first day');

	out = await streakOn('2026-04-02', out.me);
	assert.equal(out.streak, 2, 'the very next day continues it');

	out = await streakOn('2026-04-04', out.me);
	assert.equal(out.streak, 1, 'a skipped day resets it');

	rmSync(shared, { recursive: true, force: true });
});
