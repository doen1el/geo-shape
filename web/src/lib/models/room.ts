import type { Message } from './message';
import type { User } from './user';

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
	players?: User[];
	messages?: Message[];
	currentRound?: number;
	maxRounds?: number;
	currentSvgCode?: string;
	currentTime?: number;
	maxTime?: number;
	isPlaying?: boolean;
	created?: string;
	expand?: {
		players?: User[];
		messages?: Message[];
	};
};
