import { WebSocketServer } from 'ws';
import { ClientMsg, ServerMsg, REACTION_EMOJIS } from './protocol.js';
import { roomManager } from './rooms.js';
import {
	startGame,
	handleGuess,
	updateSettings,
	notifyPlayerLeft,
	cleanupRoom,
	pauseGame,
	resumeGame,
	abortGame,
	syncJoiner
} from './game.js';
import { getLeaderboard, getPlayerStats, closeDb } from './db.js';
import { cleanText } from './moderation.js';
import { isAvatarStyle, DEFAULT_AVATAR } from './avatars.js';
import { createRateLimiter } from './ratelimit.js';
import {
	RATE_LIMITS,
	MAX_ROOMS,
	MAX_MESSAGE_BYTES,
	RECONNECT_GRACE_MS,
	HEARTBEAT_MS,
	ROOM_IDLE_MS,
	ROOM_SWEEP_MS,
	SHUTDOWN_GRACE_MS
} from './config.js';
import { guard, safeTimeout, safeInterval, logError, installProcessGuards } from './safety.js';

const WS_PATH = '/ws';
const ATTACHED = Symbol.for('geoshape.wss.attached');

/**
 * Sockets that have answered our last ping.
 * @type {WeakSet<import('ws').WebSocket>}
 */
const alive = new WeakSet();

/**
 * @param {import('http').Server | import('http2').Http2SecureServer} httpServer
 * @param {{ dev?: boolean }} [options]
 * @returns {WebSocketServer}
 */
export function attachWebSocketServer(httpServer, { dev = false } = {}) {
	if (/** @type {any} */ (httpServer)[ATTACHED]) {
		return /** @type {any} */ (httpServer)[ATTACHED];
	}

	const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MESSAGE_BYTES });

	httpServer.on('upgrade', (req, socket, head) => {
		let pathname;
		try {
			pathname = new URL(req.url ?? '', 'http://localhost').pathname;
		} catch {
			return;
		}
		if (pathname !== WS_PATH) return;
		if (!isAllowedOrigin(req, dev)) {
			socket.destroy();
			return;
		}
		wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
	});

	wss.on('connection', (ws) => {
		alive.add(ws);
		ws.on('pong', () => alive.add(ws));
		handleConnection(ws);
	});

	const timers = [
		safeInterval('heartbeat', () => dropDeadSockets(wss), HEARTBEAT_MS),
		safeInterval('roomSweeper', sweepStaleRooms, ROOM_SWEEP_MS)
	];

	if (!dev) {
		const shutdown = createShutdown(httpServer, wss, timers);
		installProcessGuards({ onFatal: () => shutdown('uncaughtException', 1) });
		process.once('SIGTERM', () => shutdown('SIGTERM', 0));
		process.once('SIGINT', () => shutdown('SIGINT', 0));
	}

	/** @type {any} */ (httpServer)[ATTACHED] = wss;
	console.log(`[ws] WebSocket server attached on ${WS_PATH}`);
	return wss;
}

/**
 * Terminates sockets that missed the last ping, then pings the rest.
 * @param {WebSocketServer} wss
 */
function dropDeadSockets(wss) {
	for (const ws of wss.clients) {
		if (!alive.has(ws)) {
			ws.terminate();
			continue;
		}
		alive.delete(ws);
		guard('ping', () => ws.ping());
	}
}

function sweepStaleRooms() {
	for (const room of roomManager.findStale(ROOM_IDLE_MS)) {
		const idleMin = Math.round((Date.now() - room.lastActivityAt) / 60000);
		console.log(`[ws] closing idle room ${room.code} (${idleMin}m, ${room.players.size} players)`);
		cleanupRoom(room);
		roomManager.evict(room, 'Room closed after a long period of inactivity.');
	}
}

/**
 * Graceful shutdown: tell clients we are going away so they reconnect on their own
 * instead of hanging, stop the timers, flush the DB, then close.

 * @param {import('http').Server | import('http2').Http2SecureServer} httpServer
 * @param {WebSocketServer} wss
 * @param {ReturnType<typeof setInterval>[]} timers
 */
function createShutdown(httpServer, wss, timers) {
	let shuttingDown = false;

	return function shutdown(/** @type {string} */ reason, /** @type {number} */ exitCode) {
		if (shuttingDown) return;
		shuttingDown = true;
		console.log(`[ws] shutting down (${reason}) — ${roomManager.rooms.size} rooms open`);

		for (const timer of timers) clearInterval(timer);
		for (const room of roomManager.rooms.values()) guard('cleanupRoom', () => cleanupRoom(room));

		const notice = JSON.stringify({ type: ServerMsg.SERVER_SHUTDOWN });
		for (const ws of wss.clients) {
			if (ws.readyState === 1) guard('shutdownNotice', () => ws.send(notice));
		}

		// Force-exit if a socket or the listener refuses to close in time.
		const hardExit = safeTimeout('hardExit', () => process.exit(exitCode), SHUTDOWN_GRACE_MS * 4);
		hardExit.unref?.();

		safeTimeout(
			'closeSockets',
			() => {
				for (const ws of wss.clients) ws.close(1012, 'Server restarting');
				wss.close();
				httpServer.close(() => {
					closeDb();
					process.exit(exitCode);
				});
			},
			SHUTDOWN_GRACE_MS
		);
	};
}

/**
 * Cross-site WebSocket (CSWSH) protection.
 * @param {import('http').IncomingMessage} req
 * @param {boolean} dev
 * @returns {boolean}
 */
function isAllowedOrigin(req, dev) {
	if (dev) return true;
	const origin = req.headers.origin;
	if (!origin) return true;
	let originHost;
	try {
		originHost = new URL(origin).host;
	} catch {
		return false;
	}
	if (req.headers.host && originHost === req.headers.host) return true;
	const allowed = (process.env.GEOSHAPE_ALLOWED_ORIGINS || '')
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);
	return allowed.includes(origin);
}

/**
 * Per-connection state and message dispatch.
 * @param {import('ws').WebSocket} ws
 */
function handleConnection(ws) {
	/** @type {{ room: import('./rooms.js').Room, playerId: string } | null} */
	let session = null;

	const limiter = createRateLimiter();
	/** @param {string} key @returns {boolean} true when the action is rate-limited */
	const limited = (key) => {
		const l = RATE_LIMITS[key] ?? RATE_LIMITS.default;
		return !limiter.allow(key, l.max, l.windowMs);
	};

	const send = (/** @type {object} */ msg) => {
		if (ws.readyState === 1) ws.send(JSON.stringify(msg));
	};

	ws.on('message', (data) => {
		if (!limiter.allow('__global', RATE_LIMITS.default.max, RATE_LIMITS.default.windowMs)) return;

		let msg;
		try {
			msg = JSON.parse(data.toString());
		} catch {
			return send({ type: ServerMsg.ERROR, message: 'Invalid message' });
		}

		try {
			dispatch(msg);
		} catch (err) {
			logError(`message:${String(msg?.type)}`, err);
			send({ type: ServerMsg.ERROR, message: 'Something went wrong.' });
		}
	});

	/** @param {any} msg */
	function dispatch(msg) {
		switch (msg.type) {
			case ClientMsg.PING:
				return send({ type: ServerMsg.PONG, t0: msg.t0, serverTime: Date.now() });

			case ClientMsg.CREATE: {
				if (limited('create'))
					return send({ type: ServerMsg.ERROR, message: 'Too many rooms — slow down.' });
				const profile = sanitizeProfile(msg.profile);
				if (!profile) return send({ type: ServerMsg.ERROR, message: 'Invalid profile' });
				if (roomManager.rooms.size >= MAX_ROOMS)
					return send({
						type: ServerMsg.ERROR,
						message: 'Server is at capacity, try again later.'
					});
				const room = roomManager.createRoom({ solo: !!msg.solo, difficulty: msg.difficulty });
				const player = roomManager.addPlayer(room, profile, ws);
				session = { room, playerId: player.id };
				console.log(`[ws] ${profile.name} created room ${room.code}`);
				send({ type: ServerMsg.CREATED, code: room.code, playerId: player.id });
				roomManager.broadcastState(room);
				break;
			}

			case ClientMsg.JOIN: {
				if (limited('join'))
					return send({ type: ServerMsg.ERROR, message: 'Too many attempts — slow down.' });
				const profile = sanitizeProfile(msg.profile);
				if (!profile) return send({ type: ServerMsg.ERROR, message: 'Invalid profile' });
				const room = roomManager.getRoom(msg.code);

				const reconnecting =
					!!room &&
					!!profile.clientId &&
					[...room.players.values()].some((p) => p.profile.clientId === profile.clientId);

				if (!room || (room.solo && !reconnecting))
					return send({ type: ServerMsg.ERROR, message: 'Room not found', code: 'not_found' });

				if (!reconnecting && roomManager.isFull(room))
					return send({ type: ServerMsg.ERROR, message: 'Room is full', code: 'full' });

				if (session) leaveCurrent(true);

				const player = roomManager.addPlayer(room, profile, ws);
				session = { room, playerId: player.id };
				console.log(
					`[ws] ${profile.name} ${reconnecting ? 'reconnected to' : 'joined'} room ${room.code} (${room.players.size} total)`
				);
				send({ type: ServerMsg.CREATED, code: room.code, playerId: player.id });
				roomManager.broadcastState(room);

				syncJoiner(room, player);
				if (room.chatLog.length) send({ type: ServerMsg.CHAT_HISTORY, entries: room.chatLog });
				break;
			}

			case ClientMsg.LEAVE: {
				leaveCurrent(true);
				break;
			}

			case ClientMsg.SETTINGS: {
				if (!session) break;
				const player = session.room.players.get(session.playerId);
				if (player) updateSettings(session.room, player, msg);
				break;
			}

			case ClientMsg.START: {
				if (!session) break;
				const player = session.room.players.get(session.playerId);
				if (player) startGame(session.room, player);
				break;
			}

			case ClientMsg.PAUSE: {
				if (!session) break;
				const player = session.room.players.get(session.playerId);
				if (player) pauseGame(session.room, player);
				break;
			}

			case ClientMsg.RESUME: {
				if (!session) break;
				const player = session.room.players.get(session.playerId);
				if (player) resumeGame(session.room, player);
				break;
			}

			case ClientMsg.ABORT: {
				if (!session) break;
				const player = session.room.players.get(session.playerId);
				if (player) abortGame(session.room, player);
				break;
			}

			case ClientMsg.GUESS: {
				if (!session || limited('guess')) break;
				const player = session.room.players.get(session.playerId);
				if (player) handleGuess(session.room, player, msg.text);
				break;
			}

			case ClientMsg.SAY: {
				if (!session || limited('say')) break;
				const player = session.room.players.get(session.playerId);
				const text =
					typeof msg.text === 'string' ? cleanText(msg.text.trim().slice(0, 120)).trim() : '';
				if (player && text) {
					roomManager.chat(session.room, {
						kind: 'msg',
						name: player.profile.name,
						text,
						playerId: player.id
					});
				}
				break;
			}

			case ClientMsg.REACT: {
				if (!session || limited('react')) break;
				const player = session.room.players.get(session.playerId);

				if (player && REACTION_EMOJIS.includes(msg.emoji)) {
					roomManager.broadcast(session.room, {
						type: ServerMsg.REACTION,
						emoji: msg.emoji,
						playerId: player.id,
						name: player.profile.name
					});
				}
				break;
			}

			case ClientMsg.CHECK_ROOM: {
				if (limited('check_room')) break;
				const code = typeof msg.code === 'string' ? msg.code.toUpperCase().slice(0, 8) : '';
				const r = roomManager.getRoom(code);
				send({
					type: ServerMsg.ROOM_EXISTS,
					code,
					exists: !!r && !r.solo,
					full: !!r && roomManager.isFull(r)
				});
				break;
			}

			case ClientMsg.LIST_ROOMS: {
				if (limited('list_rooms')) break;
				roomManager.watchLobby(ws);
				send({ type: ServerMsg.PUBLIC_ROOMS, rooms: roomManager.listPublic() });
				break;
			}

			case ClientMsg.UNLIST_ROOMS: {
				roomManager.unwatchLobby(ws);
				break;
			}

			case ClientMsg.GET_LEADERBOARD: {
				send({ type: ServerMsg.LEADERBOARD, players: getLeaderboard(10) });
				break;
			}

			case ClientMsg.GET_STATS: {
				const clientId =
					typeof msg.clientId === 'string'
						? msg.clientId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)
						: '';
				send({ type: ServerMsg.STATS, stats: getPlayerStats(clientId) });
				break;
			}

			default:
				send({ type: ServerMsg.ERROR, message: `Unknown message type: ${String(msg.type)}` });
		}
	}

	ws.on('close', () => {
		roomManager.unwatchLobby(ws);
		leaveCurrent(false);
	});
	ws.on('error', () => {
		roomManager.unwatchLobby(ws);
		leaveCurrent(false);
	});

	/**
	 * @param {boolean} explicit `true` = user-initiated leave (remove now);
	 *   `false` = the socket dropped (keep the slot & score for a grace window so
	 *   a refresh / reconnect can resume).
	 */
	function leaveCurrent(explicit) {
		if (!session) return;
		const { room, playerId } = session;
		session = null;
		const player = room.players.get(playerId);
		if (!player) return;

		if (player.socket !== ws) return;

		if (explicit) {
			finalizeRemoval(room, playerId);
			return;
		}

		player.connected = false;
		if (player.disconnectTimer) clearTimeout(player.disconnectTimer);
		player.disconnectTimer = safeTimeout(
			`finalizeRemoval ${room.code}`,
			() => finalizeRemoval(room, playerId),
			RECONNECT_GRACE_MS
		);

		if (room.hostId === playerId) {
			const next = [...room.players.values()].find((p) => p.connected && p.id !== playerId);
			if (next) room.hostId = next.id;
		}

		console.log(
			`[ws] ${player.profile.name} disconnected from ${room.code} — ${Math.round(RECONNECT_GRACE_MS / 1000)}s to reconnect`
		);
		notifyPlayerLeft(room);
		roomManager.broadcastState(room);
	}
}

/**
 * Permanently removes a player from a room and tidies up
 * @param {import('./rooms.js').Room} room
 * @param {string} playerId
 */
function finalizeRemoval(room, playerId) {
	const player = room.players.get(playerId);
	if (!player) return;
	const name = player.profile.name;
	roomManager.removePlayer(room, playerId);
	if (roomManager.getRoom(room.code) === room) {
		console.log(`[ws] ${name} left ${room.code} (${room.players.size} left)`);
		notifyPlayerLeft(room);
		roomManager.broadcastState(room);
	} else {
		console.log(`[ws] ${name} left — room ${room.code} closed`);
		cleanupRoom(room);
	}
}

/**
 * Validates, normalizes and moderates an incoming profile.
 * @param {any} raw
 * @returns {import('./protocol.js').Profile | null}
 */
function sanitizeProfile(raw) {
	if (!raw || typeof raw.name !== 'string') return null;
	const name = cleanText(
		raw.name
			.replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g, '')
			.replace(/\s+/g, ' ')
			.trim()
			.slice(0, 20)
	).trim();
	if (name.length === 0) return null;
	const avatar = isAvatarStyle(raw.avatar) ? raw.avatar : DEFAULT_AVATAR;
	const clientId =
		typeof raw.clientId === 'string'
			? raw.clientId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)
			: '';
	return { name, avatar, clientId };
}
