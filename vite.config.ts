import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type PluginOption, type ViteDevServer } from 'vite';
import { attachWebSocketServer } from './server/index.js';

const webSocketServer: PluginOption = {
	name: 'geo-shape-websocket',
	configureServer(server: ViteDevServer) {
		if (server.httpServer) attachWebSocketServer(server.httpServer);
	},
	configurePreviewServer(server) {
		if (server.httpServer) attachWebSocketServer(server.httpServer);
	}
};

export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), webSocketServer]
});
