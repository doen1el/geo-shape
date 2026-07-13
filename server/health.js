import { roomManager } from './rooms.js';
import { connectionCount } from './index.js';

export function healthSnapshot() {
	const rooms = [...roomManager.rooms.values()];
	const mem = process.memoryUsage();
	const mb = (/** @type {number} */ bytes) => Math.round(bytes / 1048576);

	return {
		status: 'ok',
		uptimeSec: Math.round(process.uptime()),
		connections: connectionCount(),
		rooms: rooms.length,
		playing: rooms.filter((r) => r.status === 'playing').length,
		players: rooms.reduce((n, r) => n + r.players.size, 0),
		rssMb: mb(mem.rss),
		heapUsedMb: mb(mem.heapUsed)
	};
}

/**
 * @param {import('http').ServerResponse} res
 */
export function serveHealth(res) {
	res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' });
	res.end(JSON.stringify(healthSnapshot()));
}
