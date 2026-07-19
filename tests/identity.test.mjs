import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, connect, identifiedProfile, sleep } from './helpers.mjs';

let server;
before(async () => (server = await startServer({ GEOSHAPE_SECRET: 'test-secret' })));
after(() => server.stop());

test('the server issues a signed identity, and does not trust an unsigned one', async () => {
	const client = connect(server.wsUrl);
	await client.opened;
	client.send({ type: 'create', profile: { name: 'Ida', avatar: 'avataaars' } });

	const identity = await client.wait((m) => m.type === 'identity', { label: 'identity' });
	assert.ok(identity.clientId, 'a clientId was issued');
	assert.ok(identity.sig, 'it came with a signature');
	client.close();

	// Claiming an id without a valid signature must not be honoured: the server
	// replaces it with a fresh one rather than taking the claim at face value.
	const forger = connect(server.wsUrl);
	await forger.opened;
	forger.send({
		type: 'create',
		profile: {
			name: 'Mallory',
			avatar: 'avataaars',
			clientId: identity.clientId,
			clientSig: 'forged'
		}
	});
	const reissued = await forger.wait((m) => m.type === 'identity', { label: 'identity' });
	assert.notEqual(reissued.clientId, identity.clientId, 'the forged id was not accepted');
	forger.close();
});

test('a validly signed identity is kept as-is', async () => {
	const profile = await identifiedProfile(server.wsUrl, 'Ines');

	const client = connect(server.wsUrl);
	await client.opened;
	client.send({ type: 'create', profile });
	await client.wait((m) => m.type === 'created', { label: 'created' });
	await sleep(300);

	assert.equal(client.ofType('identity').length, 0, 'no new identity was minted');
	client.close();
});

test('a forged id cannot take over another player’s room slot', async () => {
	const alice = await identifiedProfile(server.wsUrl, 'Alice');

	const host = connect(server.wsUrl);
	await host.opened;
	host.send({ type: 'create', profile: alice });
	const { code } = await host.wait((m) => m.type === 'created', { label: 'created' });

	// Mallory claims Alice's id. Without the signature the server treats her as a
	// new player, so she joins as a second player instead of resuming Alice's slot.
	const mallory = connect(server.wsUrl);
	await mallory.opened;
	mallory.send({
		type: 'join',
		code,
		profile: { name: 'Mallory', avatar: 'avataaars', clientId: alice.clientId, clientSig: 'nope' }
	});
	await mallory.wait((m) => m.type === 'created', { label: 'join ack' });

	const state = await host.wait((m) => m.type === 'room_state' && m.room.players.length === 2, {
		label: 'two players'
	});
	const names = state.room.players.map((p) => p.name).sort();
	assert.deepEqual(names, ['Alice', 'Mallory'], 'Mallory did not take over Alice’s slot');

	host.close();
	mallory.close();
});

test('stats are only returned for a signed id', async () => {
	const profile = await identifiedProfile(server.wsUrl, 'Stat');

	const client = connect(server.wsUrl);
	await client.opened;

	client.send({ type: 'get_stats', clientId: profile.clientId, sig: 'wrong' });
	const refused = await client.wait((m) => m.type === 'stats', { label: 'stats' });
	assert.equal(refused.stats, null, 'an unsigned request gets nothing back');

	client.close();
});
