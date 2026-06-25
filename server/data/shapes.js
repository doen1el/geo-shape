import { paths as germanStatePaths } from './german_states_paths.js';
import { correctAnswers } from './correct_answers.js';
import { germanStateInfo } from './german_states_info.js';

/**
 * @typedef {import('./german_states_info.js').StateInfo} StateInfo
 * @typedef {{ id: number, name: string, path: string, answers: string[], info: StateInfo | null }} Shape
 */

/**
 * Title-cases a canonical answer like `baden-württemberg` -> `Baden-Württemberg`.
 * @param {string} canonical
 */
function toDisplayName(canonical) {
	return canonical
		.split(/([\s-])/)
		.map((part) => (part.length > 1 ? part[0].toUpperCase() + part.slice(1) : part))
		.join('');
}

/**
 * @param {Record<number, string>} pathMap
 * @param {Record<number, string[]>} answerMap
 * @param {Record<number, StateInfo>} [infoMap]
 * @returns {Shape[]}
 */
function buildShapes(pathMap, answerMap, infoMap = {}) {
	return Object.keys(pathMap)
		.map(Number)
		.sort((a, b) => a - b)
		.map((id) => {
			const answers = answerMap[id] ?? [];
			return {
				id,
				name: answers.length ? toDisplayName(answers[0]) : `#${id}`,
				path: pathMap[id],
				answers,
				info: infoMap[id] ?? null
			};
		});
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
		viewBox: '0 0 400 400',
		shapes: buildShapes(germanStatePaths, correctAnswers[0] ?? {}, germanStateInfo)
	}
};

/** Category ids that actually have shapes (others are hidden until populated). */
export const PLAYABLE_CATEGORY_IDS = Object.values(CATEGORIES)
	.filter((c) => c.shapes.length > 0)
	.map((c) => c.id);

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
