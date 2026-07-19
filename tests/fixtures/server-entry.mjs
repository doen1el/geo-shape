// A real server process for the tests: same WS server and same /healthz routing as
// production, only without the SvelteKit handler (so the suite needs no build).
import { attachWebSocketServer } from '../../server/index.js';
import { createAppServer } from '../../server/http.js';

const server = createAppServer((req, res) => {
	res.writeHead(404, { 'content-type': 'text/plain' });
	res.end('not the app');
});
attachWebSocketServer(server);

server.listen(Number(process.env.PORT) || 0, '127.0.0.1', () => {
	const { port } = /** @type {import('net').AddressInfo} */ (server.address());
	console.log(`READY ${port}`);
});
