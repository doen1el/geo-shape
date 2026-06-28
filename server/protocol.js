/** Message types the client sends to the server. */
export const ClientMsg = /** @type {const} */ ({
	CREATE: 'create',
	JOIN: 'join',
	LEAVE: 'leave',
	SETTINGS: 'settings',
	START: 'start',
	PAUSE: 'pause',
	RESUME: 'resume',
	ABORT: 'abort',
	GUESS: 'guess',
	SAY: 'say',
	CHECK_ROOM: 'check_room',
	GET_LEADERBOARD: 'get_leaderboard',
	GET_STATS: 'get_stats'
});

/** Message types the server sends to the client. */
export const ServerMsg = /** @type {const} */ ({
	CREATED: 'created',
	ROOM_STATE: 'room_state',
	COUNTDOWN: 'countdown',
	ROUND_START: 'round_start',
	ROUND_END: 'round_end',
	PAUSED: 'paused',
	RESUMED: 'resumed',
	GAME_OVER: 'game_over',
	GUESS_RESULT: 'guess_result',
	CHAT: 'chat',
	CHAT_HISTORY: 'chat_history',
	ROOM_EXISTS: 'room_exists',
	LEADERBOARD: 'leaderboard',
	STATS: 'stats',
	ERROR: 'error'
});

/** Verdict for a submitted guess. */
export const Verdict = /** @type {const} */ ({
	CORRECT: 'correct',
	CLOSE: 'close',
	WRONG: 'wrong'
});

/**
 * @typedef {Object} Profile
 * @property {string} name
 * @property {string} avatar
 * @property {string} clientId
 */

/**
 * @typedef {Object} PublicPlayer
 * @property {string} id
 * @property {string} name
 * @property {string} avatar
 * @property {number} score
 * @property {number} roundPoints
 * @property {number} wins
 * @property {boolean} isHost
 * @property {boolean} connected
 * @property {boolean} solved
 */

/**
 * Room state as broadcast to clients.
 *
 * @typedef {Object} PublicRoom
 * @property {string} code
 * @property {'lobby' | 'playing' | 'finished'} status
 * @property {'easy' | 'hard'} difficulty
 * @property {PublicPlayer[]} players
 * @property {number} round
 * @property {number} maxRounds
 * @property {number} categoryId
 * @property {number} roundDurationSec
 */

export {};
