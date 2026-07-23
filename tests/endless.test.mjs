import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startServer, connect, sleep, answerFor, until } from './helpers.mjs';

const REVEAL_MS = 400;
const ENV = {
	GEOSHAPE_SECRET: 'test-secret',
	GEOSHAPE_ROUND_END_PAUSE_MS: String(REVEAL_MS),
	GEOSHAPE_COUNTDOWN_MS: '100'
};

let server;
before(async () => (server = await startServer(ENV)));
after(() => server.stop());

const profile = (name) => ({ name, avatar: 'avataaars' });

async function endlessAtReveal() {
	const host = connect(server.wsUrl);
	await host.opened;
	host.send({ type: 'create', profile: profile('Host') });
	const { code } = await host.wait((m) => m.type === 'created', { label: 'created' });

	const from = server.log().length;
	host.send({ type: 'settings', endless: true, roundDurationSec: 30 });
	host.send({ type: 'start' });
	await host.wait((m) => m.type === 'round_start' && m.round === 1, { label: 'round 1' });

	host.send({ type: 'guess', text: await answerFor(server, code, 1, { from }) });
	const end = await host.wait((m) => m.type === 'round_end', { label: 'round_end' });
	return { host, code, from, end };
}

test('an endless reveal is flagged manual and never auto-advances', async () => {
	const { host, end } = await endlessAtReveal();

	assert.equal(end.endless, true, 'round_end tells the client this is an endless reveal');
	assert.equal(end.nextInMs, 0, 'no countdown — the reveal waits for the host');

	await sleep(REVEAL_MS * 3);
	assert.ok(
		!host.ofType('round_start').some((m) => m.round === 2),
		'the reveal sits open until the host chooses Next or Finish'
	);

	host.close();
});

test('Next draws the following shape, Finish ends the run with results', async () => {
	const { host, code, from } = await endlessAtReveal();
	const first = host.last('round_start');

	// Next
	host.send({ type: 'skip' });
	const second = await host.wait((m) => m.type === 'round_start' && m.round === 2, {
		label: 'round 2',
		timeout: 4000
	});
	assert.notEqual(second.path, first.path, 'a fresh, unseen shape');

	// round_end carries no round number, so count past the first reveal.
	const endMark = host.ofType('round_end').length;
	host.send({ type: 'guess', text: await answerFor(server, code, 2, { from }) });
	await until(() => host.ofType('round_end').length > endMark, { label: 'round_end 2' });

	// Finish
	host.send({ type: 'finish' });
	const over = await host.wait((m) => m.type === 'game_over', { label: 'game_over' });
	assert.ok(Array.isArray(over.players) && over.players.length === 1, 'results carry the scores');

	host.close();
});

test('only the host can finish an endless run', async () => {
	const host = connect(server.wsUrl);
	const guest = connect(server.wsUrl);
	await Promise.all([host.opened, guest.opened]);

	host.send({ type: 'create', profile: profile('Host') });
	const { code } = await host.wait((m) => m.type === 'created', { label: 'created' });
	guest.send({ type: 'join', code, profile: profile('Guest') });
	await guest.wait((m) => m.type === 'created', { label: 'join ack' });

	const from = server.log().length;
	host.send({ type: 'settings', endless: true, roundDurationSec: 30 });
	host.send({ type: 'start' });
	await host.wait((m) => m.type === 'round_start' && m.round === 1, { label: 'round 1' });

	const answer = await answerFor(server, code, 1, { from });
	host.send({ type: 'guess', text: answer });
	guest.send({ type: 'guess', text: answer });
	await host.wait((m) => m.type === 'round_end', { label: 'round_end' });

	guest.send({ type: 'finish' });
	await sleep(500);
	assert.equal(guest.ofType('game_over').length, 0, 'a guest cannot end the run');

	host.close();
	guest.close();
});
