import { WebSocketServer } from 'ws';
import { ClientMsg, ServerMsg } from './protocol.js';
import { roomManager } from './rooms.js';
import {
	startGame,
	handleGuess,
	updateSettings,
	notifyPlayerLeft,
	cleanupRoom
} from './game.js';
import { getLeaderboard, getPlayerStats } from './db.js';

const WS_PATH = '/ws';
const ATTACHED = Symbol.for('geoshape.wss.attached');

/**
 * @param {import('http').Server | import('http2').Http2SecureServer} httpServer
 * @returns {WebSocketServer}
 */
export function attachWebSocketServer(httpServer) {
	if (/** @type {any} */ (httpServer)[ATTACHED]) {
		return /** @type {any} */ (httpServer)[ATTACHED];
	}

	const wss = new WebSocketServer({ noServer: true });

	httpServer.on('upgrade', (req, socket, head) => {
		let pathname;
		try {
			pathname = new URL(req.url ?? '', 'http://localhost').pathname;
		} catch {
			return;
		}
		if (pathname !== WS_PATH) return;
		wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
	});

	wss.on('connection', (ws) => handleConnection(/** @type {any} */ (ws)));

	/** @type {any} */ (httpServer)[ATTACHED] = wss;
	console.log(`[ws] WebSocket server attached on ${WS_PATH}`);
	return wss;
}

/**
 * Per-connection state and message dispatch.
 * @param {import('ws').WebSocket} ws
 */
function handleConnection(ws) {
	/** @type {{ room: import('./rooms.js').Room, playerId: string } | null} */
	let session = null;

	const send = (/** @type {object} */ msg) => {
		if (ws.readyState === 1) ws.send(JSON.stringify(msg));
	};

	ws.on('message', (data) => {
		let msg;
		try {
			msg = JSON.parse(data.toString());
		} catch {
			return send({ type: ServerMsg.ERROR, message: 'Invalid message' });
		}

		switch (msg.type) {
			case ClientMsg.CREATE: {
				const profile = sanitizeProfile(msg.profile);
				if (!profile) return send({ type: ServerMsg.ERROR, message: 'Invalid profile' });
				const room = roomManager.createRoom();
				const player = roomManager.addPlayer(room, profile, ws);
				session = { room, playerId: player.id };
				console.log(`[ws] ${profile.name} created room ${room.code}`);
				send({ type: ServerMsg.CREATED, code: room.code, playerId: player.id });
				roomManager.broadcastState(room);
				break;
			}

			case ClientMsg.JOIN: {
				const profile = sanitizeProfile(msg.profile);
				if (!profile) return send({ type: ServerMsg.ERROR, message: 'Invalid profile' });
				const room = roomManager.getRoom(msg.code);
				if (!room) return send({ type: ServerMsg.ERROR, message: 'Room not found', code: 'not_found' });

				if (session) leaveCurrent();

				const player = roomManager.addPlayer(room, profile, ws);
				session = { room, playerId: player.id };
				console.log(`[ws] ${profile.name} joined room ${room.code} (${room.players.size} total)`);
				send({ type: ServerMsg.CREATED, code: room.code, playerId: player.id });
				roomManager.broadcastState(room);
				break;
			}

			case ClientMsg.LEAVE: {
				leaveCurrent();
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

			case ClientMsg.GUESS: {
				if (!session) break;
				const player = session.room.players.get(session.playerId);
				if (player) handleGuess(session.room, player, msg.text);
				break;
			}

			case ClientMsg.GET_LEADERBOARD: {
				send({ type: ServerMsg.LEADERBOARD, players: getLeaderboard(10) });
				break;
			}

			case ClientMsg.GET_STATS: {
				const clientId = typeof msg.clientId === 'string' ? msg.clientId : '';
				send({ type: ServerMsg.STATS, stats: getPlayerStats(clientId) });
				break;
			}

			default:
				send({ type: ServerMsg.ERROR, message: `Unknown message type: ${msg.type}` });
		}
	});

	ws.on('close', () => leaveCurrent());
	ws.on('error', () => leaveCurrent());

	function leaveCurrent() {
		if (!session) return;
		const { room, playerId } = session;
		const name = room.players.get(playerId)?.profile.name ?? playerId;
		session = null;
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
}

/**
 * Validates and trims an incoming profile.
 * @param {any} raw
 * @returns {import('./protocol.js').Profile | null}
 */
function sanitizeProfile(raw) {
	if (!raw || typeof raw.name !== 'string') return null;
	const name = raw.name.trim().slice(0, 20);
	if (name.length === 0) return null;
	const avatar = typeof raw.avatar === 'string' && raw.avatar ? raw.avatar.slice(0, 40) : name;
	const clientId = typeof raw.clientId === 'string' ? raw.clientId.slice(0, 64) : '';
	return { name, avatar, clientId };
}
