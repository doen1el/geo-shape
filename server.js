import { handler } from './build/handler.js';
import { attachWebSocketServer } from './server/index.js';
import { createAppServer } from './server/http.js';

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || '0.0.0.0';

const server = createAppServer(handler);
attachWebSocketServer(server);

server.listen(port, host, () => {
	console.log(`[geo-shape] listening on http://${host}:${port}`);
});
