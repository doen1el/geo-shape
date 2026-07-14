import { createServer } from 'node:http';
import { serveHealth } from './health.js';

/**
 * The HTTP server, with /healthz handled ahead of the app.
 *
 * @param {import('http').RequestListener} handler The SvelteKit handler.
 */
export function createAppServer(handler) {
	return createServer((req, res) => {
		if (req.url === '/healthz') return serveHealth(res);
		handler(req, res);
	});
}
