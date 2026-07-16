import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, connect, sleep, until, solveRound, identifiedProfile } from './helpers.mjs';

let server;
before(
	async () =>
		(server = await startServer({
			GEOSHAPE_SECRET: 'test-secret',
			GEOSHAPE_ROUND_END_PAUSE_MS: '100',
			GEOSHAPE_COUNTDOWN_MS: '100'
		}))
);
after(() => server.stop());

/** A player with a game behind them, so the profile being moved is worth something. */
async function playerWithHistory(name) {
	const me = await identifiedProfile(server.wsUrl, name);
	const client = connect(server.wsUrl);
	await client.opened;

	client.send({ type: 'create', profile: me, solo: true });
	const { code } = await client.wait((m) => m.type === 'created', { label: 'created' });
	client.send({ type: 'settings', categoryId: 1, maxRounds: 1, roundDurationSec: 30 });
	const from = server.log().length;
	client.send({ type: 'start' });
	await solveRound(client, server, code, 1, from);
	await client.wait((m) => m.type === 'game_over', { label: 'game_over' });
	await sleep(200);

	client.send({ type: 'get_my_profile', clientId: me.clientId, sig: me.clientSig });
	const mine = await client.wait((m) => m.type === 'my_profile', { label: 'my_profile' });
	return { me, client, profile: mine.profile };
}

/**
 * Asks for a transfer code as `me` would from their profile page. Counted from a mark:
 * `wait` scans every message seen, so a second request would match the first code.
 */
async function codeFor(client, me) {
	const mark = client.ofType('transfer_code').length;
	client.send({ type: 'create_transfer', clientId: me.clientId, sig: me.clientSig });
	await until(() => client.ofType('transfer_code').length > mark, { label: 'transfer_code' });
	return client.last('transfer_code').code;
}

test('a code hands the profile to another browser, credential and all', async () => {
	const { me, client, profile } = await playerWithHistory('Wanderer');
	const code = await codeFor(client, me);

	// The length is load-bearing: per-connection rate limits do not slow a guesser down
	// (reconnecting resets the budget), so the search space is the actual defence.
	assert.match(code, /^[ABCDEFGHJKMNPQRSTVWXYZ23456789]{10}$/, 'the code is 10 unambiguous chars');

	// A browser that has never been here: no identity of its own.
	const other = connect(server.wsUrl);
	await other.opened;
	other.send({ type: 'redeem_transfer', code });
	const done = await other.wait((m) => m.type === 'transfer_done', { label: 'transfer_done' });

	assert.equal(done.clientId, me.clientId, 'the second browser adopts the same credential');
	assert.equal(done.name, 'Wanderer', 'and the profile’s name');
	assert.equal(done.avatar, 'avataaars', 'and avatar');

	// The handed-over signature is the real thing: it opens the profile.
	other.send({ type: 'get_my_profile', clientId: done.clientId, sig: done.sig });
	const mine = await other.wait((m) => m.type === 'my_profile', { label: 'my_profile' });
	assert.equal(mine.profile.publicId, profile.publicId, 'the same account, not a copy of it');
	assert.equal(mine.profile.achievements.length, profile.achievements.length);

	client.close();
	other.close();
});

test('a code burns on use', async () => {
	const { me, client } = await playerWithHistory('Once');
	const code = await codeFor(client, me);

	const first = connect(server.wsUrl);
	await first.opened;
	first.send({ type: 'redeem_transfer', code });
	await first.wait((m) => m.type === 'transfer_done', { label: 'transfer_done' });

	const second = connect(server.wsUrl);
	await second.opened;
	second.send({ type: 'redeem_transfer', code });
	const err = await second.wait((m) => m.type === 'error', { label: 'error' });
	assert.equal(err.code, 'bad_code');
	assert.equal(second.last('transfer_done'), undefined, 'and no identity leaks out');

	client.close();
	first.close();
	second.close();
});

test('asking for a new code invalidates the old one', async () => {
	const { me, client } = await playerWithHistory('Forgetful');
	const stale = await codeFor(client, me);
	const fresh = await codeFor(client, me);
	assert.notEqual(stale, fresh);

	const other = connect(server.wsUrl);
	await other.opened;
	other.send({ type: 'redeem_transfer', code: stale });
	const err = await other.wait((m) => m.type === 'error', { label: 'error' });
	assert.equal(err.code, 'bad_code');

	other.send({ type: 'redeem_transfer', code: fresh });
	const done = await other.wait((m) => m.type === 'transfer_done', { label: 'transfer_done' });
	assert.equal(done.clientId, me.clientId);

	client.close();
	other.close();
});

test('a guessed code gets nothing', async () => {
	const other = connect(server.wsUrl);
	await other.opened;
	other.send({ type: 'redeem_transfer', code: 'ZZZZZZZZZZ' });
	const err = await other.wait((m) => m.type === 'error', { label: 'error' });
	assert.equal(err.code, 'bad_code');
	assert.equal(other.last('transfer_done'), undefined);
	other.close();
});

test('a forged signature cannot put someone else’s profile up for transfer', async () => {
	const { me, client } = await playerWithHistory('Target');
	client.close();

	const mallory = connect(server.wsUrl);
	await mallory.opened;
	mallory.send({ type: 'create_transfer', clientId: me.clientId, sig: 'forged' });
	const err = await mallory.wait((m) => m.type === 'error', { label: 'error' });
	assert.equal(err.code, 'denied');
	assert.equal(mallory.last('transfer_code'), undefined, 'no code is issued');
	mallory.close();
});

test('a code expires', async () => {
	const shortLived = await startServer({
		GEOSHAPE_SECRET: 'test-secret',
		GEOSHAPE_TRANSFER_TTL_MS: '300'
	});
	try {
		const me = await identifiedProfile(shortLived.wsUrl, 'Slowpoke');
		const client = connect(shortLived.wsUrl);
		await client.opened;

		client.send({ type: 'create_transfer', clientId: me.clientId, sig: me.clientSig });
		const { code } = await client.wait((m) => m.type === 'transfer_code', { label: 'code' });

		await sleep(400);
		client.send({ type: 'redeem_transfer', code });
		const err = await client.wait((m) => m.type === 'error', { label: 'error' });
		assert.equal(err.code, 'bad_code');
		client.close();
	} finally {
		await shortLived.stop();
	}
});
