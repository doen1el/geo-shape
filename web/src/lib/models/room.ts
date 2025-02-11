import type { Message } from './message';
import type { Profile } from './profile';

/**
 * Represents a room in the geo-shape application.
 *
 * @typedef {Object} Room
 * @property {string} id - The unique identifier for the room.
 * @property {string} roomCode - The code used to join the room.
 * @property {User[]} [players] - The list of players in the room.
 * @property {Message[]} [messages] - The list of messages in the room.
 * @property {number} currentRound - The current round number.
 * @property {number} maxRounds - The maximum number of rounds.
 * @property {string} [currentSvgCode] - The current SVG code being used.
 * @property {number} currentTime - The current time in the game.
 * @property {number} maxTime - The maximum time allowed in the game.
 * @property {boolean} isPlaying - Indicates if the game is currently being played.
 * @property {boolean} isDrawing - Indicates if the drawing phase is active.
 * @property {string} [created] - The timestamp when the room was created.
 * @property {object} [expand] - Additional properties for the room.
 */
export type Room = {
	id: string;
	roomCode?: string;
	players?: string[];
	messages?: string[];
	currentRound?: number;
	maxRounds?: number;
	currentSvgCode?: number;
	currentTime?: number;
	maxTime?: number;
	isPlaying?: boolean;
	isDrawing?: boolean;
	created?: string;
	updated?: string;
	svgCode?: string;
	category?: number;
	usedSvgCodes?: string;
	winnerName?: string;
	expand?: {
		players?: Profile[];
		messages?: Message[];
	};
};

/**
 * Creates a new Room with default values.
 *
 * @param {Partial<Room>} [overrides] - Optional overrides for the default values.
 * @returns {Room} - The new Room object with default values.
 */
export function createRoom(overrides: Partial<Room> = {}): Room {
	return {
		id: '',
		roomCode: '',
		players: [],
		messages: [],
		currentRound: 0,
		maxRounds: 5,
		currentSvgCode: 0,
		currentTime: 0,
		maxTime: 120,
		isPlaying: false,
		isDrawing: false,
		svgCode: '',
		category: 0,
		created: new Date().toISOString(),
		updated: new Date().toISOString(),
		usedSvgCodes: '',
		winnerName: '',
		expand: {
			players: [],
			messages: []
		},
		...overrides
	};
}
