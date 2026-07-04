export const AVATAR_STYLES = [
	'fun-emoji',
	'adventurer',
	'adventurer-neutral',
	'avataaars',
	'avataaars-neutral',
	'big-ears',
	'big-ears-neutral',
	'big-smile',
	'bottts',
	'bottts-neutral',
	'croodles',
	'croodles-neutral',
	'dylan',
	'lorelei',
	'lorelei-neutral',
	'micah',
	'miniavs',
	'notionists',
	'notionists-neutral',
	'open-peeps',
	'personas',
	'pixel-art',
	'pixel-art-neutral',
	'toon-head',
	'thumbs',
	'disco',
	'glass',
	'glyphs',
	'icons',
	'identicon',
	'initial-face',
	'initials',
	'rings',
	'shape-grid',
	'shapes',
	'stripes',
	'triangles'
];

export const DEFAULT_AVATAR = AVATAR_STYLES[0];

/** @param {unknown} value @returns {boolean} */
export function isAvatarStyle(value) {
	return typeof value === 'string' && AVATAR_STYLES.includes(value);
}
