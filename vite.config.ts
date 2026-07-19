import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv, type PluginOption } from 'vite';


const webSocketServer: PluginOption = {
	name: 'geo-shape-websocket',
	async configureServer(server) {
		const { attachWebSocketServer } = await import('./server/index.js');
		const { serveHealth } = await import('./server/health.js');
		server.middlewares.use('/healthz', (_req, res) => serveHealth(res));
		if (server.httpServer) attachWebSocketServer(server.httpServer, { dev: true });
	},
	async configurePreviewServer(server) {
		const { attachWebSocketServer } = await import('./server/index.js');
		const { serveHealth } = await import('./server/health.js');
		server.middlewares.use('/healthz', (_req, res) => serveHealth(res));
		if (server.httpServer) attachWebSocketServer(server.httpServer);
	}
};

export default defineConfig(({ mode }) => {
	for (const [key, value] of Object.entries(loadEnv(mode, process.cwd(), 'GEOSHAPE_'))) {
		process.env[key] ??= value;
	}

	return {
		plugins: [tailwindcss(), sveltekit(), webSocketServer]
	};
});
