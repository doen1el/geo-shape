import { ServerMsg } from './protocol.js';
import {
	DEFAULT_MAX_ROUNDS,
	ROUND_DURATION_SEC,
	DEFAULT_MAX_PLAYERS,
	LOBBY_PUSH_MS
} from './config.js';
import { PLAYABLE_CATEGORY_IDS, CATEGORY_SIZES } from './data/shapes.js';
import { getPlayerStats, touchPlayer, getPinned, getPublicId } from './db.js';
import { safeTimeout } from './safety.js';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 4;

let playerSeq = 0;

/**
 * @typedef {import('./protocol.js').Profile} Profile
 * @typedef {import('./protocol.js').PublicRoom} PublicRoom
 * @typedef {import('./protocol.js').PublicPlayer} PublicPlayer
 * @typedef {import('./protocol.js').PublicRoomSummary} PublicRoomSummary
 */

/**
 * @typedef {Object} Player
 * @property {string} id
 * @property {Profile} profile
 * @property {number} score
 * @property {number} roundPoints
 * @property {number} wins
 * @property {string[]} badges
 * @property {string} publicId
 * @property {boolean} connected
 * @property {import('ws').WebSocket} socket
 * @property {ReturnType<typeof setTimeout> | null} disconnectTimer
 * @property {import('./achievements.js').Run | null} run
 * @property {AchState | null} ach
 *
 * @typedef {ReturnType<typeof import('./achievements.js').loadPlayerState>} AchState
 */

/**
 * @typedef {import('./data/shapes.js').Shape} Shape
 *
 * @typedef {Object} Room
 * @property {string} code
 * @property {boolean} solo
 * @property {string} daily
 * @property {number[]} dailyShapeIds
 * @property {boolean} isPublic
 * @property {number} maxPlayers
 * @property {'easy' | 'hard'} difficulty
 * @property {'lobby' | 'playing' | 'finished'} status
 * @property {Map<string, Player>} players
 * @property {string | null} hostId
 * @property {number} round
 * @property {number} maxRounds
 * @property {boolean} allRounds
 * @property {number} categoryId
 * @property {number} roundDurationSec
 * @property {number} createdAt
 * @property {number} lastActivityAt
 * @property {Set<number>} usedShapeIds
 * @property {Shape | null} currentShape
 * @property {string} roundPath
 * @property {boolean} roundActive
 * @property {number} roundEndsAt
 * @property {boolean} paused
 * @property {number} pauseRemainingMs
 * @property {number} countdownEndsAt
 * @property {Set<string>} solved
 * @property {Array<{kind: string, name?: string, text?: string, playerId?: string, points?: number, variant?: string, round?: number}>} chatLog
 * @property {ReturnType<typeof setTimeout> | null} roundTimer
 * @property {ReturnType<typeof setTimeout> | null} pauseTimer
 */

export class RoomManager {
	constructor() {
		/** @type {Map<string, Room>} */
		this.rooms = new Map();
		/** @type {Set<import('ws').WebSocket>} */
		this.lobbyWatchers = new Set();
		/** @type {ReturnType<typeof setTimeout> | null} */
		this.lobbyPushTimer = null;
	}

	/** @returns {string} A unique, unused room code. */
	generateCode() {
		let code;
		do {
			code = '';
			for (let i = 0; i < CODE_LENGTH; i++) {
				code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
			}
		} while (this.rooms.has(code));
		return code;
	}

	/**
	 * Creates an empty room and returns it.
	 * @param {{ solo?: boolean, difficulty?: string, daily?: import('./daily.js').DailyPlan }} [options]
	 * @returns {Room}
	 */
	createRoom({ solo = false, difficulty, daily } = {}) {
		/** @type {Room} */
		const room = {
			code: this.generateCode(),
			solo,
			daily: daily ? daily.day : '',
			dailyShapeIds: daily ? daily.shapeIds : [],
			isPublic: false,
			maxPlayers: DEFAULT_MAX_PLAYERS,
			difficulty: difficulty === 'hard' ? 'hard' : 'easy',
			status: 'lobby',
			players: new Map(),
			hostId: null,
			round: 0,
			maxRounds: DEFAULT_MAX_ROUNDS,
			allRounds: false,
			categoryId: PLAYABLE_CATEGORY_IDS.includes(1) ? 1 : (PLAYABLE_CATEGORY_IDS[0] ?? 0),
			roundDurationSec: ROUND_DURATION_SEC,
			createdAt: Date.now(),
			lastActivityAt: Date.now(),
			usedShapeIds: new Set(),
			currentShape: null,
			roundPath: '',
			roundActive: false,
			roundEndsAt: 0,
			paused: false,
			pauseRemainingMs: 0,
			countdownEndsAt: 0,
			solved: new Set(),
			chatLog: [],
			roundTimer: null,
			pauseTimer: null
		};
		this.rooms.set(room.code, room);
		return room;
	}

	/**
	 * @param {string} code
	 * @returns {Room | undefined}
	 */
	getRoom(code) {
		return this.rooms.get(code?.toUpperCase());
	}

	/**
	 * Adds a player to a room (creating their player record). The first player
	 * to join becomes the host.
	 *
	 * @param {Room} room
	 * @param {Profile} profile
	 * @param {import('ws').WebSocket} socket
	 * @returns {Player}
	 */
	addPlayer(room, profile, socket) {
		if (profile.clientId) {
			for (const existing of room.players.values()) {
				if (existing.profile.clientId !== profile.clientId) continue;
				if (existing.disconnectTimer) {
					clearTimeout(existing.disconnectTimer);
					existing.disconnectTimer = null;
				}
				existing.socket = socket;
				existing.connected = true;
				existing.profile = profile;
				touchPlayer({ clientId: profile.clientId, name: profile.name, avatar: profile.avatar });
				return existing;
			}
		}

		const id = `p${++playerSeq}`;
		const wins = getPlayerStats(profile.clientId)?.gamesWon ?? 0;

		touchPlayer({ clientId: profile.clientId, name: profile.name, avatar: profile.avatar });
		const badges = getPinned(profile.clientId);
		const publicId = getPublicId(profile.clientId);
		/** @type {Player} */
		const player = {
			id,
			profile,
			score: 0,
			roundPoints: 0,
			wins,
			badges,
			publicId,
			connected: true,
			socket,
			disconnectTimer: null,
			run: null,
			ach: null
		};
		room.players.set(id, player);
		if (!room.hostId) room.hostId = id;
		return player;
	}

	/**
	 * Removes a player from a room. Drops the room if it becomes empty and
	 * reassigns the host if the host left.
	 *
	 * @param {Room} room
	 * @param {string} playerId
	 */
	removePlayer(room, playerId) {
		const leaving = room.players.get(playerId);
		if (leaving?.disconnectTimer) {
			clearTimeout(leaving.disconnectTimer);
			leaving.disconnectTimer = null;
		}
		room.players.delete(playerId);
		if (room.players.size === 0) {
			this.rooms.delete(room.code);
			this.publishLobby();
			return;
		}
		if (room.hostId === playerId) {
			room.hostId = room.players.keys().next().value ?? null;
		}
	}

	/**
	 * A room at capacity takes no new players
	 * @param {Room} room
	 */
	isFull(room) {
		return room.players.size >= room.maxPlayers;
	}

	/**
	 * Projects internal room state to the public shape sent to clients.
	 * @param {Room} room
	 * @returns {PublicRoom}
	 */
	toPublic(room) {
		return {
			code: room.code,
			status: room.status,
			difficulty: room.difficulty,
			round: room.round,
			maxRounds: room.maxRounds,
			allRounds: room.allRounds,
			categoryId: room.categoryId,
			categorySizes: CATEGORY_SIZES,
			roundDurationSec: room.roundDurationSec,
			isPublic: room.isPublic,
			maxPlayers: room.maxPlayers,
			players: [...room.players.values()].map((p) => ({
				id: p.id,
				name: p.profile.name,
				avatar: p.profile.avatar,
				score: p.score,
				roundPoints: p.roundPoints,
				wins: p.wins,
				badges: p.badges,
				publicId: p.publicId,
				isHost: p.id === room.hostId,
				connected: p.connected,
				solved: room.solved.has(p.id)
			}))
		};
	}

	/**
	 * Sends an arbitrary message to every connected player in a room.
	 * @param {Room} room
	 * @param {object} msg
	 */
	broadcast(room, msg) {
		const payload = JSON.stringify(msg);
		for (const player of room.players.values()) {
			if (player.connected && player.socket.readyState === 1) {
				player.socket.send(payload);
			}
		}
	}

	/**
	 * Broadcasts the current public room state to every connected player.
	 * @param {Room} room
	 */
	broadcastState(room) {
		this.touch(room);
		this.broadcast(room, { type: ServerMsg.ROOM_STATE, room: this.toPublic(room) });
		this.publishLobby();
	}

	/**
	 * Marks the room as alive for the idle sweeper.
	 * @param {Room} room
	 */
	touch(room) {
		room.lastActivityAt = Date.now();
	}

	/**
	 * Rooms with no activity for `idleMs`.
	 *
	 * @param {number} idleMs
	 * @returns {Room[]}
	 */
	findStale(idleMs) {
		const cutoff = Date.now() - idleMs;
		return [...this.rooms.values()].filter((room) => {
			if (room.lastActivityAt >= cutoff) return false;

			const gameRunning = room.roundTimer !== null || room.pauseTimer !== null;
			return !gameRunning;
		});
	}

	/**
	 * Drops a room and disconnects whoever is still in it.
	 * @param {Room} room
	 * @param {string} message
	 */
	evict(room, message) {
		this.broadcast(room, { type: ServerMsg.ERROR, message, code: 'closed' });
		for (const player of room.players.values()) {
			if (player.disconnectTimer) clearTimeout(player.disconnectTimer);
			player.disconnectTimer = null;
		}
		this.rooms.delete(room.code);
		this.publishLobby();
	}

	/**
	 * The public rooms for the landing-page browser
	 * @returns {PublicRoomSummary[]}
	 */
	listPublic() {
		return [...this.rooms.values()]
			.filter((room) => room.isPublic && !room.solo && room.players.size > 0)
			.map((room) => ({
				code: room.code,
				status: room.status,
				difficulty: room.difficulty,
				categoryId: room.categoryId,
				players: room.players.size,
				maxPlayers: room.maxPlayers,
				round: room.round,
				maxRounds: room.maxRounds,
				hostName: (room.hostId ? room.players.get(room.hostId)?.profile.name : '') ?? ''
			}))
			.sort((a, b) => {
				const joinable = (/** @type {PublicRoomSummary} */ r) =>
					(r.status === 'lobby' ? 0 : 1) + (r.players >= r.maxPlayers ? 2 : 0);
				return joinable(a) - joinable(b) || b.players - a.players;
			});
	}

	/** @param {import('ws').WebSocket} socket */
	watchLobby(socket) {
		this.lobbyWatchers.add(socket);
	}

	/** @param {import('ws').WebSocket} socket */
	unwatchLobby(socket) {
		this.lobbyWatchers.delete(socket);
	}

	/**
	 * Pushes the public-room list to every watcher.
	 */
	publishLobby() {
		if (this.lobbyWatchers.size === 0 || this.lobbyPushTimer) return;
		this.lobbyPushTimer = safeTimeout(
			'publishLobby',
			() => {
				this.lobbyPushTimer = null;
				const payload = JSON.stringify({
					type: ServerMsg.PUBLIC_ROOMS,
					rooms: this.listPublic()
				});
				for (const socket of this.lobbyWatchers) {
					if (socket.readyState === 1) socket.send(payload);
					else this.lobbyWatchers.delete(socket);
				}
			},
			LOBBY_PUSH_MS
		);
	}

	/**
	 * Records a chat entry in the room's history (capped) and broadcasts it, so
	 * players who join later can be sent the backlog.
	 * @param {Room} room
	 * @param {{kind: string, name?: string, text?: string, playerId?: string, points?: number, variant?: string, round?: number}} entry
	 */
	chat(room, entry) {
		this.touch(room);
		room.chatLog.push(entry);
		if (room.chatLog.length > 50) room.chatLog.shift();
		this.broadcast(room, { type: ServerMsg.CHAT, ...entry });
	}
}

export const roomManager = new RoomManager();
