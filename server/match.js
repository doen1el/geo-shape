import { Verdict } from './protocol.js';

/**
 * Lowercase, strip accents/ß, drop everything but a–z0–9.
 * @param {string} s
 */
export function normalize(s) {
	return String(s)
		.toLowerCase()
		.replace(/ß/g, 'ss')
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]/g, '');
}

/**
 * Classic Levenshtein edit distance.
 * @param {string} a
 * @param {string} b
 */
export function levenshtein(a, b) {
	if (a === b) return 0;
	if (!a.length) return b.length;
	if (!b.length) return a.length;
	let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
	let curr = new Array(b.length + 1);
	for (let i = 1; i <= a.length; i++) {
		curr[0] = i;
		for (let j = 1; j <= b.length; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
		}
		[prev, curr] = [curr, prev];
	}
	return prev[b.length];
}

/**
 * Number of leading characters two strings share.
 * @param {string} a
 * @param {string} b
 */
function commonPrefixLen(a, b) {
	const n = Math.min(a.length, b.length);
	let i = 0;
	while (i < n && a[i] === b[i]) i++;
	return i;
}

/**
 * @param {string} guess
 * @param {string[]} answers
 * @param {string[]} [neighbors] Guessable names of bordering countries
 * @returns {typeof Verdict[keyof typeof Verdict]}
 */
export function judgeGuess(guess, answers, neighbors = []) {
	const g = normalize(guess);
	if (!g) return Verdict.WRONG;

	const normalized = answers.map(normalize);
	if (normalized.includes(g)) return Verdict.CORRECT;

	const threshold = g.length <= 5 ? 1 : 2;
	for (let i = 0; i < answers.length; i++) {
		if (answers[i].length < 4) continue;
		const target = normalized[i];
		if (g.length >= 4 && target.startsWith(g)) return Verdict.CLOSE;

		if (levenshtein(g, target) <= threshold && commonPrefixLen(g, target) >= 2)
			return Verdict.CLOSE;

		if (g.length >= 4 && answers[i].includes(' ')) {
			for (const word of answers[i].split(/[\s-]+/)) {
				if (normalize(word) === g) return Verdict.CLOSE;
			}
		}

		if (g.length >= 5 && target.includes(g)) return Verdict.CLOSE;
	}

	if (neighbors.some((n) => normalize(n) === g)) return Verdict.CLOSE;

	return Verdict.WRONG;
}
