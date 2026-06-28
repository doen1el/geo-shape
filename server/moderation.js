import {
	DataSet,
	RegExpMatcher,
	TextCensor,
	pattern,
	englishDataset,
	englishRecommendedTransformers
} from 'obscenity';
import { GERMAN_WORDS } from './german-words.js';

let dataset = new DataSet().addAll(englishDataset);
for (const word of GERMAN_WORDS) {
	dataset = dataset.addPhrase((phrase) =>
		phrase.setMetadata({ originalWord: word }).addPattern(pattern`|${word}|`)
	);
}

const matcher = new RegExpMatcher({
	...dataset.build(),
	...englishRecommendedTransformers
});
const censor = new TextCensor();

/**
 * Replaces any detected profanity with grawlix symbols. Obfuscation-resistant
 * (leetspeak, spacing, etc.) via the recommended transformers.
 * @param {unknown} input
 * @returns {string}
 */
export function cleanText(input) {
	if (typeof input !== 'string' || input.length === 0) return '';
	const matches = matcher.getAllMatches(input);
	return matches.length ? censor.applyTo(input, matches) : input;
}

/**
 * @param {unknown} input
 * @returns {boolean} whether the text contains detectable profanity.
 */
export function isProfane(input) {
	return typeof input === 'string' && matcher.hasMatch(input);
}
