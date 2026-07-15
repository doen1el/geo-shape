import { sign } from './identity.js';
import { CATEGORIES, PLAYABLE_CATEGORY_IDS } from './data/shapes.js';
import { DAILY_ROUNDS } from './config.js';

/** `YYYY-MM-DD` in UTC. `GEOSHAPE_TODAY` overrides it, which is what makes streaks testable. */
export function dailyKey(date = new Date()) {
	return process.env.GEOSHAPE_TODAY || date.toISOString().slice(0, 10);
}

/** The day before `day`, for streak continuity. @param {string} day */
export function previousDay(day) {
	const d = new Date(`${day}T00:00:00Z`);
	d.setUTCDate(d.getUTCDate() - 1);
	return d.toISOString().slice(0, 10);
}

/** Folds a signature into a 32-bit seed. @param {string} s */
function seedFrom(s) {
	let h = 2166136261;
	for (let i = 0; i < s.length; i++) {
		h ^= s.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

/** @param {number} seed @returns {() => number} */
function mulberry32(seed) {
	let a = seed;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * @typedef {Object} DailyPlan
 * @property {string} day
 * @property {number} categoryId
 * @property {number[]} shapeIds Exactly `DAILY_ROUNDS` of them, in order.
 */

/** @type {Map<string, DailyPlan>} */
const cache = new Map();

/**
 * The plan for `day`. Deterministic, so every player gets the identical run.
 *
 * @param {string} day
 * @returns {DailyPlan}
 */
export function dailyPlan(day) {
	const hit = cache.get(day);
	if (hit) return hit;

	const rng = mulberry32(seedFrom(sign(`daily:${day}`)));
	const pool = PLAYABLE_CATEGORY_IDS;
	const categoryId = pool[Math.floor(rng() * pool.length)];

	const shapes = [...(CATEGORIES[categoryId]?.shapes ?? [])];
	for (let i = shapes.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[shapes[i], shapes[j]] = [shapes[j], shapes[i]];
	}
	const shapeIds = shapes.slice(0, DAILY_ROUNDS).map((s) => s.id);

	const plan = { day, categoryId, shapeIds };
	cache.set(day, plan);
	return plan;
}
