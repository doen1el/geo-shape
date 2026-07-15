import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocket } from 'ws';

const HERE = dirname(fileURLToPath(import.meta.url));
const ENTRY = join(HERE, 'fixtures', 'server-entry.mjs');

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Boots a real server process on a free port, with its own throwaway database.
 * @param {Record<string, string>} [env] GEOSHAPE_* overrides for this run.
 */
export async function startServer(env = {}) {
	const dir = mkdtempSync(join(tmpdir(), 'geoshape-test-'));
	const child = spawn('node', [ENTRY], {
		env: { ...process.env, GEOSHAPE_DB: join(dir, 'test.db'), PORT: '0', ...env },
		stdio: ['ignore', 'pipe', 'pipe']
	});

	let output = '';
	child.stdout.on('data', (d) => (output += d.toString()));
	child.stderr.on('data', (d) => (output += d.toString()));

	const port = await new Promise((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error(`server never started:\n${output}`)), 15000);
		const check = setInterval(() => {
			const match = output.match(/READY (\d+)/);
			if (!match) return;
			clearInterval(check);
			clearTimeout(timer);
			resolve(Number(match[1]));
		}, 50);
	});

	const exited = new Promise((resolve) => child.on('exit', (code) => resolve(code)));

	return {
		port,
		dir,
		pid: child.pid,
		url: `http://127.0.0.1:${port}`,
		wsUrl: `ws://127.0.0.1:${port}/ws`,
		log: () => output,
		exited,
		health: () => fetch(`http://127.0.0.1:${port}/healthz`).then((r) => r.json()),
		/** SIGTERM, resolving with the exit code. */
		async terminate() {
			child.kill('SIGTERM');
			return exited;
		},
		async stop() {
			child.kill('SIGKILL');
			await exited.catch(() => {});
			rmSync(dir, { recursive: true, force: true });
		}
	};
}

/** A WebSocket client that records everything it is sent. */
export function connect(wsUrl, options = {}) {
	const ws = new WebSocket(wsUrl, options);
	const seen = [];
	let closeCode = null;
	ws.on('message', (data) => seen.push(JSON.parse(data.toString())));
	ws.on('close', (code) => (closeCode = code));
	ws.on('error', () => {});

	return {
		ws,
		seen,
		get closeCode() {
			return closeCode;
		},
		opened: new Promise((resolve, reject) => {
			ws.once('open', () => resolve('open'));
			ws.once('error', (err) => reject(err));
		}),
		send: (msg) => ws.send(JSON.stringify(msg)),
		/** Waits for a message matching `pred`. */
		async wait(pred, { timeout = 8000, label = 'message' } = {}) {
			const deadline = Date.now() + timeout;
			while (Date.now() < deadline) {
				const hit = seen.find(pred);
				if (hit) return hit;
				await sleep(25);
			}
			throw new Error(`timed out waiting for ${label}. Got: ${JSON.stringify(seen)}`);
		},
		ofType: (type) => seen.filter((m) => m.type === type),
		last: (type) => [...seen].reverse().find((m) => m.type === type),
		close: () => ws.close()
	};
}

/** Polls until `pred()` is true. */
export async function until(pred, { timeout = 8000, label = 'condition' } = {}) {
	const deadline = Date.now() + timeout;
	while (Date.now() < deadline) {
		if (pred()) return true;
		await sleep(25);
	}
	throw new Error(`timed out waiting for ${label}`);
}

/**
 * The answer the server just picked, scraped from its log.
 *
 * Polled, not read once: `startRound` logs the answer *after* it broadcasts `round_start`,
 * and the child process's stdout reaches us asynchronously on top of that — so the line is
 * routinely still missing at the moment the client sees the round begin.
 */
export async function answerFor(server, code, round, { from = 0, timeout = 5000 } = {}) {
	const pattern = `${code} round ${round}/\\d+: answer = (.+)$`;
	let answer;
	await until(
		() => (answer = [...server.log().slice(from).matchAll(new RegExp(pattern, 'gm'))].pop()?.[1]),
		{ timeout, label: `logged answer for ${code} round ${round}` }
	);
	return answer;
}

/**
 * Waits for round `round`, then guesses it correctly.
 *
 * `from` is the log offset the game started at — take it with `server.log().length` right
 * before sending `start`. Replaying a room logs "round 1" all over again, so without it a
 * second game would scrape the *first* game's answer. It must mark the start of the game,
 * not the moment this is called: a second player enters here only after the first has
 * already solved, by which point the answer is long since logged.
 */
export async function solveRound(client, server, code, round, from = 0) {
	await client.wait((m) => m.type === 'round_start' && m.round === round, {
		label: `round_start ${round}`,
		timeout: 15000
	});
	const correct = () => client.ofType('guess_result').filter((m) => m.verdict === 'correct').length;

	// Count from a mark: `seen` keeps every earlier round's verdict, so "a correct result
	// exists" would match instantly and hide a wrong guess.
	const mark = correct();
	client.send({ type: 'guess', text: await answerFor(server, code, round, { from }) });
	await until(() => correct() > mark, { label: `correct guess in round ${round}` });
}

/** A profile whose identity the server has already signed. */
export async function identifiedProfile(wsUrl, name) {
	const client = connect(wsUrl);
	await client.opened;
	client.send({ type: 'create', profile: { name, avatar: 'avataaars' } });
	const identity = await client.wait((m) => m.type === 'identity', { label: 'identity' });
	await client.wait((m) => m.type === 'created', { label: 'created' });
	client.send({ type: 'leave' });
	client.close();
	return {
		name,
		avatar: 'avataaars',
		clientId: identity.clientId,
		clientSig: identity.sig
	};
}
