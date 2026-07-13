import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type PluginOption, type ViteDevServer } from 'vite';
import { attachWebSocketServer } from './server/index.js';
import { serveHealth } from './server/health.js';

const webSocketServer: PluginOption = {
	name: 'geo-shape-websocket',
	configureServer(server: ViteDevServer) {
		server.middlewares.use('/healthz', (_req, res) => serveHealth(res));
		if (server.httpServer) attachWebSocketServer(server.httpServer, { dev: true });
	},
	configurePreviewServer(server) {
		if (server.httpServer) attachWebSocketServer(server.httpServer);
	}
};

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), webSocketServer]
});
