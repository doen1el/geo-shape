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
