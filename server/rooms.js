import { ServerMsg } from './protocol.js';
import { DEFAULT_MAX_ROUNDS, ROUND_DURATION_SEC } from './config.js';
import { PLAYABLE_CATEGORY_IDS } from './data/shapes.js';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 4;

let playerSeq = 0;

/**
 * @typedef {import('./protocol.js').Profile} Profile
 * @typedef {import('./protocol.js').PublicRoom} PublicRoom
 * @typedef {import('./protocol.js').PublicPlayer} PublicPlayer
 */

/**
 * @typedef {Object} Player
 * @property {string} id
 * @property {Profile} profile
 * @property {number} score
 * @property {boolean} connected
 * @property {import('ws').WebSocket} socket
 */

/**
 * @typedef {import('./data/shapes.js').Shape} Shape
 *
 * @typedef {Object} Room
 * @property {string} code
 * @property {'lobby' | 'playing' | 'finished'} status
 * @property {Map<string, Player>} players
 * @property {string | null} hostId
 * @property {number} round
 * @property {number} maxRounds
 * @property {number} categoryId
 * @property {number} roundDurationSec
 * @property {number} createdAt
 * @property {Set<number>} usedShapeIds
 * @property {Shape | null} currentShape
 * @property {boolean} roundActive
 * @property {number} roundEndsAt
 * @property {Set<string>} solved
 * @property {ReturnType<typeof setTimeout> | null} roundTimer
 * @property {ReturnType<typeof setTimeout> | null} pauseTimer
 */

export class RoomManager {
	constructor() {
		/** @type {Map<string, Room>} */
		this.rooms = new Map();
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
	 * @returns {Room}
	 */
	createRoom() {
		/** @type {Room} */
		const room = {
			code: this.generateCode(),
			status: 'lobby',
			players: new Map(),
			hostId: null,
			round: 0,
			maxRounds: DEFAULT_MAX_ROUNDS,
			categoryId: PLAYABLE_CATEGORY_IDS[0] ?? 0,
			roundDurationSec: ROUND_DURATION_SEC,
			createdAt: Date.now(),
			usedShapeIds: new Set(),
			currentShape: null,
			roundActive: false,
			roundEndsAt: 0,
			solved: new Set(),
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
		const id = `p${++playerSeq}`;
		/** @type {Player} */
		const player = { id, profile, score: 0, connected: true, socket };
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
		room.players.delete(playerId);
		if (room.players.size === 0) {
			this.rooms.delete(room.code);
			return;
		}
		if (room.hostId === playerId) {
			room.hostId = room.players.keys().next().value ?? null;
		}
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
			round: room.round,
			maxRounds: room.maxRounds,
			categoryId: room.categoryId,
			roundDurationSec: room.roundDurationSec,
			players: [...room.players.values()].map((p) => ({
				id: p.id,
				name: p.profile.name,
				avatar: p.profile.avatar,
				score: p.score,
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
		this.broadcast(room, { type: ServerMsg.ROOM_STATE, room: this.toPublic(room) });
	}
}

export const roomManager = new RoomManager();
