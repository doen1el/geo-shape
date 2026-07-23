import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, connect, sleep, solveRound, identifiedProfile } from './helpers.mjs';

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

/** Plays one solo round so the player holds at least one badge, then reads their profile. */
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
	assert.ok(mine.profile.achievements.length > 0, 'earned a badge to pin');
	return { me, client, profile: mine.profile };
}

test('pinning an earned badge sticks and comes back on the profile', async () => {
	const { me, client, profile } = await playerWithBadge('Pinner');
	const badge = profile.achievements[0].id;
	assert.equal(profile.pinnedBadge, '', 'nothing is pinned to begin with');

	client.send({
		type: 'set_pinned_badge',
		clientId: me.clientId,
		sig: me.clientSig,
		badgeId: badge
	});
	const saved = await client.wait(
		(m) => m.type === 'my_profile' && m.profile?.pinnedBadge === badge,
		{ label: 'pinned' }
	);
	assert.equal(saved.profile.pinnedBadge, badge);

	client.close();
});

test('picking a new badge replaces the old one, and empty clears it', async () => {
	const { me, client, profile } = await playerWithBadge('Switcher');
	const [first, second] = profile.achievements.map((a) => a.id);
	assert.ok(second, 'this player holds more than one badge');

	const pin = (badgeId) =>
		client.send({ type: 'set_pinned_badge', clientId: me.clientId, sig: me.clientSig, badgeId });

	pin(first);
	await client.wait((m) => m.type === 'my_profile' && m.profile?.pinnedBadge === first, {
		label: 'first pinned'
	});
	pin(second);
	await client.wait((m) => m.type === 'my_profile' && m.profile?.pinnedBadge === second, {
		label: 'switched — only one at a time'
	});
	pin('');
	await client.wait((m) => m.type === 'my_profile' && m.profile?.pinnedBadge === '', {
		label: 'unpinned'
	});

	client.close();
});

test('a badge you have not earned cannot be pinned', async () => {
	const { me, client } = await playerWithBadge('Faker');
	// collect_world needs every country in the world — never earned in one solo round.
	client.send({
		type: 'set_pinned_badge',
		clientId: me.clientId,
		sig: me.clientSig,
		badgeId: 'collect_world'
	});
	const res = await client.wait((m) => m.type === 'my_profile', { label: 'my_profile' });
	assert.equal(res.profile.pinnedBadge, '', 'an unheld badge is refused, not stored');
	client.close();
});

test('the pinned badge is shown next to the name in the lobby', async () => {
	const { me, client, profile } = await playerWithBadge('Host');
	const badge = profile.achievements[0].id;
	client.send({
		type: 'set_pinned_badge',
		clientId: me.clientId,
		sig: me.clientSig,
		badgeId: badge
	});
	await client.wait((m) => m.type === 'my_profile' && m.profile?.pinnedBadge === badge, {
		label: 'pinned'
	});
	client.close();

	// A fresh room: addPlayer reads the pin straight from storage.
	const host = connect(server.wsUrl);
	await host.opened;
	host.send({ type: 'create', profile: me });
	const { code } = await host.wait((m) => m.type === 'created', { label: 'created' });

	const guest = connect(server.wsUrl);
	await guest.opened;
	guest.send({ type: 'join', code, profile: await identifiedProfile(server.wsUrl, 'Guest') });
	const state = await guest.wait((m) => m.type === 'room_state' && m.room.players.length === 2, {
		label: 'room_state'
	});
	const hostView = state.room.players.find((p) => p.name === 'Host');
	assert.equal(hostView.pinnedBadge, badge, 'the guest sees the host’s pinned badge');

	host.close();
	guest.close();
});

test('a forged signature cannot pin on your behalf', async () => {
	const { me, client, profile } = await playerWithBadge('Victim');
	const badge = profile.achievements[0].id;
	client.close();

	const mallory = connect(server.wsUrl);
	await mallory.opened;
	mallory.send({ type: 'set_pinned_badge', clientId: me.clientId, sig: 'forged', badgeId: badge });
	const err = await mallory.wait((m) => m.type === 'error', { label: 'denied' });
	assert.equal(err.code, 'denied');

	// And nothing was written.
	const check = connect(server.wsUrl);
	await check.opened;
	check.send({ type: 'get_my_profile', clientId: me.clientId, sig: me.clientSig });
	const mine = await check.wait((m) => m.type === 'my_profile', { label: 'my_profile' });
	assert.equal(mine.profile.pinnedBadge, '', 'the forged pin did not land');

	mallory.close();
	check.close();
});
