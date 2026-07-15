import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, connect, sleep, solveRound } from './helpers.mjs';

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

const profile = (name) => ({ name, avatar: 'avataaars' });

/** All ids the server has pushed to this client so far. */
const unlocked = (client) => client.ofType('achievement').flatMap((m) => m.ids);

const solve = (client, code, round, from) => solveRound(client, server, code, round, from);

/** The log offset a game begins at — see `solveRound`. */
const mark = () => server.log().length;

test('a fast solve unlocks blitz, and it does not fire a second time', async () => {
	const alice = connect(server.wsUrl);
	await alice.opened;

	alice.send({ type: 'create', profile: profile('Blitzer'), solo: true });
	const { code } = await alice.wait((m) => m.type === 'created', { label: 'created' });

	alice.send({ type: 'settings', categoryId: 1, maxRounds: 1, roundDurationSec: 30 });
	const game1 = mark();
	alice.send({ type: 'start' });
	await solve(alice, code, 1, game1);

	const got = await alice.wait((m) => m.type === 'achievement', { label: 'achievement' });
	assert.ok(got.ids.includes('blitz'), `expected blitz, got ${JSON.stringify(got.ids)}`);
	await alice.wait((m) => m.type === 'game_over', { label: 'game_over' });
	await sleep(300);

	// Second game, same player: the badge is already theirs.
	const before = unlocked(alice).filter((id) => id === 'blitz').length;
	alice.send({ type: 'settings', categoryId: 1, maxRounds: 1, roundDurationSec: 30 });
	const game2 = mark();
	alice.send({ type: 'start' });
	await solve(alice, code, 1, game2);
	await alice.wait((m) => m.type === 'game_over', { label: 'game_over 2' });
	await sleep(300);

	assert.equal(
		unlocked(alice).filter((id) => id === 'blitz').length,
		before,
		'blitz is not awarded twice'
	);
	alice.close();
});

test('solo play earns collection badges but never a competition badge', async () => {
	const solo = connect(server.wsUrl);
	await solo.opened;

	solo.send({ type: 'create', profile: profile('Hermit'), solo: true });
	const { code } = await solo.wait((m) => m.type === 'created', { label: 'created' });

	// Continents is the only category small enough (7) to complete inside a test.
	solo.send({ type: 'settings', categoryId: 1, maxRounds: 7, roundDurationSec: 30 });
	const game = mark();
	solo.send({ type: 'start' });
	for (let round = 1; round <= 7; round++) await solve(solo, code, round, game);
	await solo.wait((m) => m.type === 'game_over', { label: 'game_over', timeout: 20000 });
	await sleep(300);

	const ids = unlocked(solo);
	assert.ok(ids.includes('collect_continents'), 'every continent solved → the collection badge');
	assert.ok(ids.includes('first_solo'), 'a first solo game is rewarded immediately');
	assert.ok(!ids.includes('first_multiplayer'), 'but not the multiplayer starter badge');
	assert.ok(!ids.includes('firstwin'), 'a one-player room is not a contest — no win badge');
	assert.ok(!ids.includes('sniper'), 'and no first-blood badge either');
	solo.close();
});

test('winning a real two-player game awards the competition badge', async () => {
	const alice = connect(server.wsUrl);
	const bob = connect(server.wsUrl);
	await Promise.all([alice.opened, bob.opened]);

	alice.send({ type: 'create', profile: profile('Winner') });
	const { code } = await alice.wait((m) => m.type === 'created', { label: 'created' });
	bob.send({ type: 'join', code, profile: profile('Loser') });
	await bob.wait((m) => m.type === 'created', { label: 'join ack' });

	alice.send({ type: 'settings', categoryId: 1, maxRounds: 1, roundDurationSec: 30 });
	const game = mark();
	alice.send({ type: 'start' });

	// Alice first, Bob second: she takes the +30 first-solve bonus against his +20, so she
	// wins outright. Both solving also ends the round at once instead of burning the clock.
	await solve(alice, code, 1, game);
	await solve(bob, code, 1, game);
	await alice.wait((m) => m.type === 'game_over', { label: 'game_over', timeout: 20000 });
	await sleep(300);

	assert.ok(unlocked(alice).includes('firstwin'), 'the winner gets the win badge');
	assert.ok(!unlocked(bob).includes('firstwin'), 'the loser does not');
	assert.ok(
		unlocked(alice).includes('first_multiplayer'),
		'both get the multiplayer starter badge'
	);
	assert.ok(unlocked(bob).includes('first_multiplayer'), 'winner and loser alike');
	assert.ok(!unlocked(bob).includes('first_solo'), 'a multiplayer game is not a solo game');

	alice.close();
	bob.close();
});
