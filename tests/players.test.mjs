import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { startServer, connect, sleep } from './helpers.mjs';

const TOKEN = 'test-admin-token';

let server;
before(async () => (server = await startServer({ GEOSHAPE_ADMIN_TOKEN: TOKEN })));
after(() => server.stop());

const profile = (name) => ({ name, avatar: 'avataaars' });

async function admin() {
	const a = connect(server.wsUrl);
	await a.opened;
	a.send({ type: 'admin_auth', token: TOKEN });
	await a.wait((m) => m.type === 'admin_ok', { label: 'admin_ok' });
	return a;
}

test('joining creates the account — the roster is not limited to finished games', async () => {
	const adm = await admin();

	const rookie = connect(server.wsUrl);
	await rookie.opened;
	rookie.send({ type: 'create', profile: profile('Rookie') });
	await rookie.wait((m) => m.type === 'created', { label: 'created' });
	await sleep(300);

	adm.send({ type: 'admin_search', query: 'Rookie' });
	const found = await adm.wait((m) => m.type === 'admin_players', { label: 'search' });
	const rec = found.players.find((p) => p.name === 'Rookie');
	assert.ok(rec, 'the account exists straight after joining');
	assert.equal(rec.gamesPlayed, 0, 'but with no games to its name yet');

	rookie.send({ type: 'get_leaderboard' });
	const board = await rookie.wait((m) => m.type === 'leaderboard', { label: 'leaderboard' });
	assert.ok(
		!board.players.some((p) => p.name === 'Rookie'),
		'a 0-game account stays off the board'
	);

	rookie.close();
	adm.close();
});

test('finishing a multiplayer game puts the players on the board', async () => {
	const alice = connect(server.wsUrl);
	const bob = connect(server.wsUrl);
	await Promise.all([alice.opened, bob.opened]);

	alice.send({ type: 'create', profile: profile('Alice') });
	const { code } = await alice.wait((m) => m.type === 'created', { label: 'created' });
	bob.send({ type: 'join', code, profile: profile('Bob') });
	await bob.wait((m) => m.type === 'created', { label: 'join ack' });

	alice.send({ type: 'settings', maxRounds: 1, roundDurationSec: 30 });
	alice.send({ type: 'start' });
	await alice.wait((m) => m.type === 'round_start', { label: 'round_start' });

	const answer = [...server.log().matchAll(/round 1\/1: answer = (.+)$/gm)].pop()?.[1];
	alice.send({ type: 'guess', text: answer });
	bob.send({ type: 'guess', text: answer });
	await alice.wait((m) => m.type === 'game_over', { timeout: 25000, label: 'game_over' });
	await sleep(400);

	alice.send({ type: 'get_leaderboard' });
	const board = await alice.wait((m) => m.type === 'leaderboard', { label: 'leaderboard' });
	const names = board.players.map((p) => p.name);
	assert.ok(names.includes('Alice') && names.includes('Bob'), 'both are on the board');
	assert.ok(
		board.players.every((p) => p.gamesPlayed > 0),
		'the board only shows accounts that actually played'
	);

	alice.close();
	bob.close();
});
