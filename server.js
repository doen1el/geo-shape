import { createServer } from 'node:http';
import { handler } from './build/handler.js';
import { attachWebSocketServer } from './server/index.js';
import { serveHealth } from './server/health.js';

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || '0.0.0.0';

const server = createServer((req, res) => {
	if (req.url === '/healthz') return serveHealth(res);
	handler(req, res);
});
attachWebSocketServer(server);

server.listen(port, host, () => {
	console.log(`[geo-shape] listening on http://${host}:${port}`);
});
