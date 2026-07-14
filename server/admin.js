import { timingSafeEqual } from 'node:crypto';
import { ServerMsg, AdminAction } from './protocol.js';
import { roomManager } from './rooms.js';
import { cleanupRoom } from './game.js';
import { getRecentGames, getTotals, searchPlayers, deletePlayer } from './db.js';
import { connectionCount, uniqueAddresses } from './metrics.js';
import { runBackup, lastBackup } from './backup.js';
import { ADMIN_TOKEN, ADMIN_PUSH_MS } from './config.js';
import { safeInterval } from './safety.js';

/** Admin is off unless a token is configured */
export function adminEnabled() {
	return ADMIN_TOKEN.length > 0;
}

/**
 * Constant-time token check, so a wrong guess can't be narrowed down by timing.
 * @param {unknown} candidate
 */
export function verifyToken(candidate) {
	if (!adminEnabled() || typeof candidate !== 'string') return false;
	const a = Buffer.from(candidate);
	const b = Buffer.from(ADMIN_TOKEN);
	return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Maintenance mode: existing games run on, but no new rooms are created.
 */
let maintenance = false;
export function inMaintenance() {
	return maintenance;
}

/** @type {Set<import('ws').WebSocket>} */
const watchers = new Set();

/** @param {import('ws').WebSocket} ws */
export function watchAdmin(ws) {
	watchers.add(ws);
}

/** @param {import('ws').WebSocket} ws */
export function unwatchAdmin(ws) {
	watchers.delete(ws);
}

/** Everything the dashboard shows, in one snapshot. */
export function adminSnapshot() {
	const now = Date.now();
	const mem = process.memoryUsage();
	const rooms = [...roomManager.rooms.values()].map((room) => ({
		code: room.code,
		status: room.status,
		solo: room.solo,
		isPublic: room.isPublic,
		difficulty: room.difficulty,
		categoryId: room.categoryId,
		round: room.round,
		maxRounds: room.maxRounds,
		maxPlayers: room.maxPlayers,
		ageSec: Math.round((now - room.createdAt) / 1000),
		idleSec: Math.round((now - room.lastActivityAt) / 1000),
		players: [...room.players.values()].map((p) => ({
			id: p.id,
			name: p.profile.name,
			score: p.score,
			connected: p.connected,
			isHost: p.id === room.hostId
		}))
	}));

	return {
		maintenance,
		lastBackupAt: lastBackup(),
		uptimeSec: Math.round(process.uptime()),
		connections: connectionCount(),
		addresses: uniqueAddresses(),
		rssMb: Math.round(mem.rss / 1048576),
		heapUsedMb: Math.round(mem.heapUsed / 1048576),
		rooms: rooms.sort((a, b) => b.players.length - a.players.length),
		totals: getTotals(),
		recentGames: getRecentGames(15)
	};
}

/** Pushes a fresh snapshot to every open dashboard. */
export function publishAdmin() {
	if (watchers.size === 0) return;
	const payload = JSON.stringify({ type: ServerMsg.ADMIN_STATE, state: adminSnapshot() });
	for (const ws of watchers) {
		if (ws.readyState === 1) ws.send(payload);
		else watchers.delete(ws);
	}
}

/** @param {ReturnType<typeof setInterval>[]} timers */
export function startAdminPush(timers) {
	timers.push(safeInterval('adminPush', publishAdmin, ADMIN_PUSH_MS));
}

/**
 * Runs an operator action. Returns a short result line for the dashboard log.
 * @param {any} msg
 * @param {import('ws').WebSocketServer} wss 
 * @returns {string}
 */
export function runAdminAction(msg, wss) {
	switch (msg.action) {
		case AdminAction.CLOSE_ROOM: {
			const room = roomManager.getRoom(String(msg.code ?? ''));
			if (!room) return `Room ${msg.code} not found`;
			cleanupRoom(room);
			roomManager.evict(room, 'This room was closed by an admin.');
			return `Closed room ${room.code}`;
		}

		case AdminAction.KICK_PLAYER: {
			const room = roomManager.getRoom(String(msg.code ?? ''));
			const player = room?.players.get(String(msg.playerId ?? ''));
			if (!room || !player) return `Player not found`;
			const name = player.profile.name;
			if (player.socket.readyState === 1) {
				player.socket.send(
					JSON.stringify({
						type: ServerMsg.ERROR,
						message: 'You were removed by an admin.',
						code: 'kicked'
					})
				);
			}
			// Drop the reconnect grace as well, or they would simply rejoin.
			if (player.disconnectTimer) clearTimeout(player.disconnectTimer);
			roomManager.removePlayer(room, player.id);
			player.socket.close(4003, 'Kicked');
			if (roomManager.getRoom(room.code) === room) roomManager.broadcastState(room);
			else cleanupRoom(room);
			return `Kicked ${name} from ${room.code}`;
		}

		case AdminAction.ANNOUNCE: {
			const text = String(msg.text ?? '')
				.trim()
				.slice(0, 200);
			if (!text) return 'Nothing to announce';

			const payload = JSON.stringify({ type: ServerMsg.NOTICE, text });
			let sent = 0;
			for (const client of wss.clients) {
				if (client.readyState !== 1) continue;
				client.send(payload);
				sent++;
			}
			return `Announced to ${sent} client(s)`;
		}

		case AdminAction.MAINTENANCE: {
			maintenance = !!msg.on;
			return maintenance ? 'Maintenance mode ON — no new rooms' : 'Maintenance mode OFF';
		}

		case AdminAction.DELETE_PLAYER: {
			const clientId = String(msg.clientId ?? '');
			return deletePlayer(clientId) ? `Deleted record ${clientId}` : 'Delete failed';
		}

		case AdminAction.BACKUP: {
			const file = runBackup();
			return file ? `Backup written to ${file}` : 'Backup failed or disabled';
		}

		default:
			return `Unknown action: ${String(msg.action)}`;
	}
}

/**
 * @param {any} msg
 * @returns {ReturnType<typeof searchPlayers>}
 */
export function runAdminSearch(msg) {
	const query = String(msg.query ?? '')
		.trim()
		.slice(0, 64);
	return searchPlayers(query);
}
