import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, connect, sleep, solveRound, identifiedProfile, until } from './helpers.mjs';

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

/** Plays one solo round so the player has a badge and a public id worth looking at. */
async function playerWithBadge(name) {
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

test('a public profile never exposes the secret client id', async () => {
	const { me, client, profile } = await playerWithBadge('Publicist');
	assert.ok(profile.publicId, 'the player has a shareable handle');
	assert.notEqual(profile.publicId, me.clientId, 'which is not the client id');

	const visitor = connect(server.wsUrl);
	await visitor.opened;
	visitor.send({ type: 'get_profile', publicId: profile.publicId });
	const seen = await visitor.wait((m) => m.type === 'profile', { label: 'profile' });

	assert.equal(seen.profile.name, 'Publicist');
	assert.ok(seen.profile.achievements.length > 0, 'the visitor sees the badges');
	assert.ok(
		!JSON.stringify(seen).includes(me.clientId),
		'but the client id is nowhere in the payload'
	);

	// Only this one player holds any badge, so each of theirs is held by 100%.
	const held = seen.profile.achievements[0].id;
	assert.equal(seen.profile.rarity[held], 100, 'rarity is reported for the tooltip');

	client.close();
	visitor.close();
});

test('an unknown handle simply has no profile', async () => {
	const visitor = connect(server.wsUrl);
	await visitor.opened;
	visitor.send({ type: 'get_profile', publicId: 'not-a-real-handle' });
	const seen = await visitor.wait((m) => m.type === 'profile', { label: 'profile' });
	assert.equal(seen.profile, null);
	visitor.close();
});

test('going private hides the stats but keeps the name', async () => {
	const { me, client, profile } = await playerWithBadge('Hermit');

	client.send({
		type: 'set_profile_prefs',
		clientId: me.clientId,
		sig: me.clientSig,
		isPrivate: true,
		pinned: []
	});
	await client.wait((m) => m.type === 'my_profile' && m.profile.isPrivate, { label: 'saved' });

	const visitor = connect(server.wsUrl);
	await visitor.opened;
	visitor.send({ type: 'get_profile', publicId: profile.publicId });
	const seen = await visitor.wait((m) => m.type === 'profile', { label: 'profile' });

	assert.equal(seen.profile.isPrivate, true);
	assert.equal(seen.profile.name, 'Hermit', 'the name stays — it is on the leaderboard anyway');
	assert.equal(seen.profile.achievements, undefined, 'the badges do not');
	assert.equal(seen.profile.gamesPlayed, undefined, 'nor the stats');

	client.close();
	visitor.close();
});

test('you can only pin badges you actually earned', async () => {
	const { me, client, profile } = await playerWithBadge('Pinner');
	const earned = profile.achievements[0].id;

	// playerWithBadge already pulled a my_profile — wait for a *fresh* one, not that.
	const mark = client.ofType('my_profile').length;
	client.send({
		type: 'set_profile_prefs',
		clientId: me.clientId,
		sig: me.clientSig,
		isPrivate: false,
		pinned: [earned, 'collect_world', 'not_even_a_badge']
	});
	await until(() => client.ofType('my_profile').length > mark, { label: 'saved' });

	const saved = client.last('my_profile');
	assert.deepEqual(saved.profile.pinned, [earned], 'the unearned ones are dropped');
	client.close();
});

test('an unsigned caller gets nothing and changes nothing', async () => {
	const { me, client, profile } = await playerWithBadge('Victim');
	client.close();

	const mallory = connect(server.wsUrl);
	await mallory.opened;

	mallory.send({ type: 'get_my_profile', clientId: me.clientId, sig: 'forged' });
	const mine = await mallory.wait((m) => m.type === 'my_profile', { label: 'my_profile' });
	assert.equal(mine.profile, null, 'a forged signature reads nothing');

	mallory.send({
		type: 'set_profile_prefs',
		clientId: me.clientId,
		sig: 'forged',
		isPrivate: true,
		pinned: []
	});
	const err = await mallory.wait((m) => m.type === 'error', { label: 'denied' });
	assert.equal(err.code, 'denied');

	// And the victim's profile is untouched.
	mallory.send({ type: 'get_profile', publicId: profile.publicId });
	const seen = await mallory.wait((m) => m.type === 'profile', { label: 'profile' });
	assert.ok(!seen.profile.isPrivate, 'the forged write did not land');

	mallory.close();
});
