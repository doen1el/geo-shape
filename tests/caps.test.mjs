import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, connect, sleep } from './helpers.mjs';

/** Resolves 'open', or the rejection reason. */
async function tryConnect(wsUrl) {
	const client = connect(wsUrl);
	try {
		await client.opened;
		return { result: 'open', client };
	} catch (err) {
		return { result: 'rejected', reason: err.message };
	}
}

test('per-IP cap rejects the extra connection and frees up again', async () => {
	const server = await startServer({ GEOSHAPE_MAX_CONNECTIONS_PER_IP: '3' });
	try {
		const accepted = [];
		for (let i = 0; i < 3; i++) accepted.push(await tryConnect(server.wsUrl));
		assert.ok(
			accepted.every((r) => r.result === 'open'),
			'connections up to the cap are accepted'
		);

		const over = await tryConnect(server.wsUrl);
		assert.equal(over.result, 'rejected');
		assert.match(over.reason, /429/, 'refused with Too Many Requests');

		const health = await server.health();
		assert.equal(health.connections, 3, '/healthz counts the live connections');

		// A leaking counter would slowly lock real players out, so check the slot returns.
		accepted[2].client.close();
		await sleep(300);
		const retry = await tryConnect(server.wsUrl);
		assert.equal(retry.result, 'open', 'the freed slot is usable again');
	} finally {
		await server.stop();
	}
});

test('global connection cap is enforced', async () => {
	const server = await startServer({
		GEOSHAPE_MAX_CONNECTIONS: '2',
		GEOSHAPE_MAX_CONNECTIONS_PER_IP: '50'
	});
	try {
		assert.equal((await tryConnect(server.wsUrl)).result, 'open');
		assert.equal((await tryConnect(server.wsUrl)).result, 'open');

		const over = await tryConnect(server.wsUrl);
		assert.equal(over.result, 'rejected');
		assert.match(over.reason, /429/);
	} finally {
		await server.stop();
	}
});

test('/healthz reports the process state', async () => {
	const server = await startServer();
	try {
		const health = await server.health();
		assert.equal(health.status, 'ok');
		assert.equal(typeof health.uptimeSec, 'number');
		assert.equal(health.rooms, 0);
		assert.equal(typeof health.rssMb, 'number');
	} finally {
		await server.stop();
	}
});
