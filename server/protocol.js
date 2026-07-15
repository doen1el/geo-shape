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
	REACT: 'react',
	CHECK_ROOM: 'check_room',
	LIST_ROOMS: 'list_rooms',
	UNLIST_ROOMS: 'unlist_rooms',
	GET_LEADERBOARD: 'get_leaderboard',
	GET_STATS: 'get_stats',
	PING: 'ping',

	GET_PROFILE: 'get_profile',
	GET_MY_PROFILE: 'get_my_profile',
	SET_PROFILE_PREFS: 'set_profile_prefs',
	GET_DAILY: 'get_daily',
	START_DAILY: 'start_daily',

	ADMIN_AUTH: 'admin_auth',
	ADMIN_WATCH: 'admin_watch',
	ADMIN_UNWATCH: 'admin_unwatch',
	ADMIN_ACTION: 'admin_action',
	ADMIN_SEARCH: 'admin_search'
});

/** Operator actions available from the admin dashboard. */
export const AdminAction = /** @type {const} */ ({
	CLOSE_ROOM: 'close_room',
	KICK_PLAYER: 'kick_player',
	ANNOUNCE: 'announce',
	MAINTENANCE: 'maintenance',
	DELETE_PLAYER: 'delete_player',
	BACKUP: 'backup'
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
	REACTION: 'reaction',
	ROOM_EXISTS: 'room_exists',
	PUBLIC_ROOMS: 'public_rooms',
	LEADERBOARD: 'leaderboard',
	STATS: 'stats',
	PONG: 'pong',
	SERVER_SHUTDOWN: 'server_shutdown',
	NOTICE: 'notice',
	IDENTITY: 'identity',
	ACHIEVEMENT: 'achievement',
	PROFILE: 'profile',
	MY_PROFILE: 'my_profile',
	DAILY: 'daily',
	ADMIN_OK: 'admin_ok',
	ADMIN_STATE: 'admin_state',
	ADMIN_PLAYERS: 'admin_players',
	ERROR: 'error'
});

/** Verdict for a submitted guess. */
export const Verdict = /** @type {const} */ ({
	CORRECT: 'correct',
	CLOSE: 'close',
	WRONG: 'wrong'
});

/**
 * Reaction identifiers carried over the wire. Each side maps a key to its own icon
 * (`src/lib/reactions.ts` on the client)
 */
export const REACTION_KEYS = /** @type {const} */ ([
	'fire',
	'laugh',
	'thumbs',
	'heart',
	'skull',
	'party'
]);

/** The one reaction that also rains confetti. */
export const CONFETTI_KEY = 'party';

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
 * @property {string[]} badges
 * @property {string} publicId
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
 * @property {boolean} allRounds
 * @property {number} categoryId
 * @property {Record<number, number>} categorySizes
 * @property {number} roundDurationSec
 * @property {boolean} isPublic
 * @property {number} maxPlayers
 */

/**
 * A public room as listed in the lobby browser on the landing page.
 *
 * @typedef {Object} PublicRoomSummary
 * @property {string} code
 * @property {'lobby' | 'playing' | 'finished'} status
 * @property {'easy' | 'hard'} difficulty
 * @property {number} categoryId
 * @property {number} players
 * @property {number} maxPlayers
 * @property {number} round
 * @property {number} maxRounds
 * @property {string} hostName
 */

export {};
