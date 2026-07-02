import * as germanStates from './german_states_paths.js';
import * as continents from './continents_paths.js';
import * as europe from './europe_paths.js';
import * as usStates from './us_states_paths.js';

/**
 * @typedef {{ key?: string, capital?: string, population?: number, areaKm2: number, funFact?: { en: string, de: string } }} StateInfo
 * @typedef {{ id: number, name: string, path: string, answers: string[], info: StateInfo | null }} Shape
 * @typedef {{ paths: Record<number, string>, names: Record<number, string>, answers: Record<number, string[]>, info?: Record<number, StateInfo> }} CategoryData
 */

/**
 * Turn a generated category module (`<key>_paths.js`) into Shape[].
 * @param {CategoryData} data
 * @returns {Shape[]}
 */
function buildShapes(data) {
	return Object.keys(data.paths)
		.map(Number)
		.sort((a, b) => a - b)
		.map((id) => ({
			id,
			name: data.names[id] ?? `#${id}`,
			path: data.paths[id],
			answers: data.answers[id] ?? [],
			info: data.info?.[id] ?? null
		}));
}

/**
 * @typedef {Object} Category
 * @property {number} id
 * @property {string} key
 * @property {string} viewBox
 * @property {Shape[]} shapes
 */

/** @type {Record<number, Category>} */
export const CATEGORIES = {
	0: {
		id: 0,
		key: 'german_states',
		viewBox: '0 0 1000 1000',
		shapes: buildShapes(germanStates)
	},
	1: {
		id: 1,
		key: 'continents',
		viewBox: '0 0 1000 1000',
		shapes: buildShapes(continents)
	},
	2: {
		id: 2,
		key: 'europe',
		viewBox: '0 0 1000 1000',
		shapes: buildShapes(europe)
	},
	3: {
		id: 3,
		key: 'us_states',
		viewBox: '0 0 1000 1000',
		shapes: buildShapes(usStates)
	}
};

/** Category ids that actually have shapes (others are hidden until populated). */
export const PLAYABLE_CATEGORY_IDS = Object.values(CATEGORIES)
	.filter((c) => c.shapes.length > 0)
	.map((c) => c.id);

/**
 * Number of distinct shapes per category, keyed by category id. The lobby uses
 * this to cap the round count (you can't play more rounds than there are shapes)
 * and to power the "all shapes" mode.
 * @type {Record<number, number>}
 */
export const CATEGORY_SIZES = Object.fromEntries(
	Object.values(CATEGORIES).map((c) => [c.id, c.shapes.length])
);

/**
 * @param {number} categoryId
 * @returns {Category | undefined}
 */
export function getCategory(categoryId) {
	return CATEGORIES[categoryId];
}

/**
 * Picks a random shape from a category, avoiding ids already used this game.
 * Resets the "used" set once every shape has been shown.
 *
 * @param {number} categoryId
 * @param {Set<number>} usedIds
 * @returns {Shape | null}
 */
export function pickShape(categoryId, usedIds) {
	const category = CATEGORIES[categoryId];
	if (!category || category.shapes.length === 0) return null;

	let available = category.shapes.filter((s) => !usedIds.has(s.id));
	if (available.length === 0) {
		usedIds.clear();
		available = category.shapes;
	}
	const shape = available[Math.floor(Math.random() * available.length)];
	usedIds.add(shape.id);
	return shape;
}
