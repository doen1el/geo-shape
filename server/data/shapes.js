import * as germanStates from './german_states_paths.js';
import * as continents from './continents_paths.js';
import * as europe from './europe_paths.js';
import * as usStates from './us_states_paths.js';
import * as africa from './africa_paths.js';
import * as asia from './asia_paths.js';
import * as northAmerica from './north_america_paths.js';
import * as southAmerica from './south_america_paths.js';
import * as oceania from './oceania_paths.js';

/**
 * @typedef {{ key?: string, capital?: string, population?: number, areaKm2: number, funFact?: { en: string, de: string } }} StateInfo
 * @typedef {{ name: string, nameDe: string, path: string, border: string, cx?: number, cy?: number }} NeighborShape
 * @typedef {{ id: number, name: string, nameDe: string, path: string, answers: string[], info: StateInfo | null, capital: number[] | null, neighbors: string[], context: NeighborShape[], revealPath: string | null }} Shape
 * @typedef {{ paths: Record<number, string>, names: Record<number, string>, namesDe?: Record<number, string>, answers: Record<number, string[]>, info?: Record<number, StateInfo>, capitals?: Record<number, number[]>, neighbors?: Record<number, string[]>, context?: Record<number, NeighborShape[]>, revealPaths?: Record<number, string> }} CategoryData
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
			nameDe: data.namesDe?.[id] ?? data.names[id] ?? `#${id}`,
			path: data.paths[id],
			answers: data.answers[id] ?? [],
			info: data.info?.[id] ?? null,
			capital: data.capitals?.[id] ?? null,
			neighbors: data.neighbors?.[id] ?? [],
			context: data.context?.[id] ?? [],
			revealPath: data.revealPaths?.[id] ?? null
		}));
}

const country = {
	europe: buildShapes(europe),
	africa: buildShapes(africa),
	asia: buildShapes(asia),
	northAmerica: buildShapes(northAmerica),
	southAmerica: buildShapes(southAmerica),
	oceania: buildShapes(oceania)
};

/**
 * Concatenate country lists into one "world" category.
 * @param {Shape[][]} lists
 * @returns {Shape[]}
 */
function mergeShapes(lists) {
	return lists
		.flat()
		.sort((a, b) => a.name.localeCompare(b.name, 'en'))
		.map((s, i) => ({ ...s, id: i }));
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
		shapes: country.europe
	},
	3: {
		id: 3,
		key: 'us_states',
		viewBox: '0 0 1000 1000',
		shapes: buildShapes(usStates)
	},
	4: {
		id: 4,
		key: 'africa',
		viewBox: '0 0 1000 1000',
		shapes: country.africa
	},
	5: {
		id: 5,
		key: 'asia',
		viewBox: '0 0 1000 1000',
		shapes: country.asia
	},
	6: {
		id: 6,
		key: 'north_america',
		viewBox: '0 0 1000 1000',
		shapes: country.northAmerica
	},
	7: {
		id: 7,
		key: 'south_america',
		viewBox: '0 0 1000 1000',
		shapes: country.southAmerica
	},
	8: {
		id: 8,
		key: 'world',
		viewBox: '0 0 1000 1000',
		shapes: mergeShapes([
			country.europe,
			country.africa,
			country.asia,
			country.northAmerica,
			country.southAmerica,
			country.oceania
		])
	}
};

/** Category ids that actually have shapes (others are hidden until populated). */
export const PLAYABLE_CATEGORY_IDS = Object.values(CATEGORIES)
	.filter((c) => c.shapes.length > 0)
	.map((c) => c.id);

/**
 * Number of distinct shapes per category, keyed by category id.
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
 * Looks a shape up by id — the daily challenge replays a fixed, pre-drawn list.
 *
 * @param {number} categoryId
 * @param {number} shapeId
 * @returns {Shape | null}
 */
export function getShapeById(categoryId, shapeId) {
	return CATEGORIES[categoryId]?.shapes.find((s) => s.id === shapeId) ?? null;
}

/**
 * Picks a random shape from a category, avoiding ids already used this game.
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

/**
 * The country categories overlap: `world` (8) re-keys the very same countries with fresh
 * ids, so France is `2:11` in Europe and something else entirely in World. Collection
 * progress has to see through that, or "every country in Africa" would be unreachable
 * for someone who plays World.
 *
 * Deliberately limited to the country categories — US states and countries share names
 * ("Georgia"), and crediting one for the other would be wrong.
 */
const COUNTRY_CATEGORY_IDS = [2, 4, 5, 6, 7, 8];

/** @type {Map<string, string[]>} name -> every `<categoryId>:<shapeId>` that means it */
const EQUIVALENT_KEYS = new Map();
for (const id of COUNTRY_CATEGORY_IDS) {
	for (const shape of CATEGORIES[id]?.shapes ?? []) {
		const keys = EQUIVALENT_KEYS.get(shape.name) ?? [];
		keys.push(`${id}:${shape.id}`);
		EQUIVALENT_KEYS.set(shape.name, keys);
	}
}

/**
 * Every progress key one solve should credit.
 *
 * @param {number} categoryId
 * @param {Shape} shape
 * @returns {string[]} `<categoryId>:<shapeId>` keys
 */
export function shapeKeys(categoryId, shape) {
	const own = `${categoryId}:${shape.id}`;
	if (!COUNTRY_CATEGORY_IDS.includes(categoryId)) return [own];
	return EQUIVALENT_KEYS.get(shape.name) ?? [own];
}
