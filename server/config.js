export const ROUND_DURATION_SEC = 90;
export const MIN_ROUND_DURATION_SEC = 30;
export const MAX_ROUND_DURATION_SEC = 180;
export const ROUND_END_PAUSE_MS = 15000;

export const COUNTDOWN_MS = 3000;

export const DEFAULT_MAX_ROUNDS = 5;
export const MIN_ROUNDS = 1;
export const MAX_ROUNDS = 15;

export const ROUND_OPTIONS = [3, 5, 8, 10];

export const MAX_ROUND_POINTS = 100;
export const MIN_ROUND_POINTS = 20;

export const FIRST_SOLVE_BONUS = 30;
export const ORDER_BONUS_STEP = 10;

export const DEFAULT_MAX_PLAYERS = 10;
export const MIN_MAX_PLAYERS = 2;
export const MAX_MAX_PLAYERS = 20;

export const MAX_ROOMS = 500;

export const LOBBY_PUSH_MS = 400;

export const RECONNECT_GRACE_MS = 120000;

export const MAX_MESSAGE_BYTES = 16 * 1024;

/**
 * Per-connection sliding-window rate limits: `max` actions per `windowMs`.
 * @type {Record<string, { max: number, windowMs: number }>}
 */
export const RATE_LIMITS = {
	default: { max: 40, windowMs: 5000 },
	create: { max: 6, windowMs: 60000 },
	join: { max: 12, windowMs: 60000 },
	say: { max: 6, windowMs: 4000 },
	guess: { max: 15, windowMs: 4000 },
	react: { max: 8, windowMs: 4000 },
	check_room: { max: 30, windowMs: 10000 },
	list_rooms: { max: 20, windowMs: 10000 }
};
