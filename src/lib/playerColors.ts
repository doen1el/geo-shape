export const PLAYER_COLORS = [
	'#ffb3ba',
	'#ffd5b8',
	'#ffdfbf',
	'#ffe8a3',
	'#fff3a0',
	'#d4f0a0',
	'#b9fbc0',
	'#a0e8c9',
	'#a3e4dd',
	'#b6e3f4',
	'#a5d8ff',
	'#b8c0ff',
	'#d1d4f9',
	'#c0aede',
	'#d8b4f8',
	'#f0b6e8',
	'#ffbde0',
	'#ffd5dc',
	'#e2c8a8',
	'#cde0c9'
] as const;

export const PLAYER_COLORS_BARE: string[] = PLAYER_COLORS.map((c) => c.slice(1));

function hashString(str: string): number {
	let h = 2166136261;
	for (let i = 0; i < str.length; i++) {
		h ^= str.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}

export function playerColor(id: string | null | undefined): string {
	if (!id) return PLAYER_COLORS[0];
	return PLAYER_COLORS[hashString(id) % PLAYER_COLORS.length];
}
