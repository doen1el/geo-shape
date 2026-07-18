import { CATEGORY_SIZES } from './data/shapes.js';
import { getUnlocked, getSolvedShapes, getCounters, getPlayerStats } from './db.js';
import { ACHIEVEMENT_DEFS } from './achievement-defs.js';

/**
 * The unlock conditions. Metadata (icon, tier, group, scope) lives in `achievement-defs.js`
 *
 * @typedef {import('./achievement-defs.js').AchievementDef} AchievementDef
 * @typedef {import('./achievement-defs.js').Event} Event
 */

/**
 * Everything an achievement may look at. Assembled fresh per evaluation in game.js.
 *
 * @typedef {Object} Ctx
 * @property {Set<string>} unlocked Lifetime, mutated as we go.
 * @property {Set<string>} solvedKeys Lifetime, `<categoryId>:<shapeId>`.
 * @property {Record<string, number>} counters Lifetime.
 * @property {{ gamesPlayed: number, gamesWon: number, totalScore: number, bestScore: number, dailyStreak: number }} stats
 * @property {Run} run This game only.
 * @property {boolean} isContest More than one player in the room.
 * @property {Solve | null} solve Set on the `solve` event.
 * @property {GameEnd | null} game Set on the `game_end` event.
 * @property {(categoryId: number) => number} progress Distinct shapes solved in a category.
 *
 * @typedef {Object} Solve
 * @property {number} solveMs How long the player took this round.
 * @property {number} timeLeftMs
 * @property {number} order 0 = first to solve.
 * @property {number} categoryId
 * @property {number} wrongThisRound Wrong guesses this player made before getting it.
 *
 * @typedef {Object} GameEnd
 * @property {boolean} won
 * @property {number} score
 * @property {number} runnerUpScore
 * @property {number} rounds
 * @property {boolean} solo
 *
 * @typedef {Object} Run
 * @property {number} roundsSolved
 * @property {number} wrong Wrong guesses across the whole game.
 * @property {number} wrongThisRound
 * @property {number} firstBlood Rounds this player solved first.
 * @property {number} streak Consecutive rounds solved.
 * @property {number} maxStreak
 * @property {number} totalSolveMs Summed solve times — the daily's tie-breaker.
 */

/** Counter keys kept in `player_counters`. */
export const Counter = /** @type {const} */ ({
	FAST_SOLVES: 'fast_solves',
	SOLVES: 'solves',
	FIRST_BLOOD: 'first_blood',
	FLAWLESS: 'flawless'
});

/** Every shape in a category — the target for a collection badge. */
const all = (/** @type {number} */ id) => CATEGORY_SIZES[id] ?? Infinity;

/**
 * Counter-based badges that show a progress bar (no category to fill).
 * Keep the target in sync with the matching predicate in CHECKS.
 * @type {Record<string, { counter: string, target: number }>}
 */
const COUNT_TARGETS = {
	explorer: { counter: Counter.SOLVES, target: 25 }
};

/**
 * One predicate per badge id. A collection badge just needs its category filled.
 * @type {Record<string, (ctx: Ctx) => boolean>}
 */
const CHECKS = {
	first_solo: (c) => !!c.game && c.game.solo,
	first_multiplayer: (c) => !!c.game,

	blitz: (c) => !!c.solve && c.solve.solveMs <= 3000,
	quick10: (c) => (c.counters[Counter.FAST_SOLVES] ?? 0) >= 10,
	quick50: (c) => (c.counters[Counter.FAST_SOLVES] ?? 0) >= 50,

	streak5: (c) => c.run.streak >= 5,
	flawless: (c) =>
		!!c.game && c.game.rounds >= 3 && c.run.roundsSolved === c.game.rounds && c.run.wrong === 0,
	flawless5: (c) => (c.counters[Counter.FLAWLESS] ?? 0) >= 5,

	firstwin: (c) => c.stats.gamesWon >= 1,
	win10: (c) => c.stats.gamesWon >= 10,
	win50: (c) => c.stats.gamesWon >= 50,
	sniper: (c) => c.run.firstBlood >= 3,
	landslide: (c) =>
		!!c.game && c.game.won && c.game.runnerUpScore > 0 && c.game.score >= 2 * c.game.runnerUpScore,

	explorer: (c) => (c.counters[Counter.SOLVES] ?? 0) >= 25,

	daily_first: (c) => c.stats.dailyStreak >= 1,
	daily3: (c) => c.stats.dailyStreak >= 3,
	daily7: (c) => c.stats.dailyStreak >= 7,
	daily30: (c) => c.stats.dailyStreak >= 30,

	buzzer: (c) => !!c.solve && c.solve.timeLeftMs <= 2000,
	stubborn: (c) => !!c.solve && c.solve.wrongThisRound >= 5
};

/** @typedef {AchievementDef & { check: (ctx: Ctx) => boolean }} Achievement */

/** @type {Achievement[]} */
export const ACHIEVEMENTS = ACHIEVEMENT_DEFS.map((def) => {
	const categoryId = def.categoryId;
	const check =
		categoryId != null
			? // A collection badge is "every shape in the category, solved at least once".
				(/** @type {Ctx} */ ctx) => ctx.progress(categoryId) >= all(categoryId)
			: CHECKS[def.id];
	if (!check) throw new Error(`[achievements] no unlock condition for '${def.id}'`);
	return { ...def, check };
});

/** A fresh per-game scratchpad. @returns {Run} */
export function newRun() {
	return {
		roundsSolved: 0,
		wrong: 0,
		wrongThisRound: 0,
		firstBlood: 0,
		streak: 0,
		maxStreak: 0,
		totalSolveMs: 0
	};
}

/**
 * Loads the player's lifetime state once, at the start of a game.
 *
 * @param {string} clientId
 */
export function loadPlayerState(clientId) {
	const stats = getPlayerStats(clientId) ?? {
		gamesPlayed: 0,
		gamesWon: 0,
		totalScore: 0,
		bestScore: 0
	};
	return {
		unlocked: new Set(getUnlocked(clientId)),
		solvedKeys: new Set(getSolvedShapes(clientId)),
		counters: getCounters(clientId),
		stats: { ...stats, dailyStreak: 0 }
	};
}

/**
 * Runs every achievement that listens for `event` and isn't unlocked yet.
 *
 * @param {Event} event
 * @param {Ctx} ctx
 * @returns {string[]} newly unlocked ids
 */
export function evaluate(event, ctx) {
	/** @type {string[]} */
	const won = [];
	for (const def of ACHIEVEMENTS) {
		if (!def.on.includes(event)) continue;
		if (ctx.unlocked.has(def.id)) continue;
		if (def.scope === 'contest' && !ctx.isContest) continue;
		let hit = false;
		try {
			hit = def.check(ctx);
		} catch (e) {
			console.error(`[achievements] ${def.id} check threw:`, e instanceof Error ? e.message : e);
		}
		if (!hit) continue;
		ctx.unlocked.add(def.id);
		won.push(def.id);
	}
	return won;
}

/**
 * The catalogue as the client needs it — no predicates, and hidden entries stay withheld
 * until they're earned.
 *
 * @param {Set<string>} unlocked
 */
export function catalogueFor(unlocked) {
	return ACHIEVEMENTS.filter((a) => !a.hidden || unlocked.has(a.id)).map((a) => ({
		id: a.id,
		tier: a.tier,
		group: a.group,
		categoryId: a.categoryId ?? null,
		target: a.categoryId != null ? all(a.categoryId) : (COUNT_TARGETS[a.id]?.target ?? null),
		counter: a.categoryId != null ? null : (COUNT_TARGETS[a.id]?.counter ?? null)
	}));
}
