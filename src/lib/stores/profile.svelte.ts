import { browser } from '$app/environment';

const STORAGE_KEY = 'geoshape:profile';

// Every DiceBear style.
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
] as const;

export const AVATAR_PICKER_STYLES = [
	'notionists',
	'notionists-neutral',
	'fun-emoji',
	'avataaars',
	'avataaars-neutral',
	'lorelei',
	'lorelei-neutral',
	'bottts',
	'bottts-neutral'
] as const;

const DEFAULT_STYLE = AVATAR_STYLES[0];

export type Profile = { name: string; avatar: string; clientId: string; clientSig: string };
type StoredProfile = Profile;

class ProfileStore {
	name = $state('');
	avatar = $state<string>(DEFAULT_STYLE);
	clientId = $state('');
	clientSig = $state('');

	constructor() {
		if (!browser) return;
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (raw) {
				const parsed = JSON.parse(raw) as Partial<StoredProfile>;
				this.name = parsed.name ?? '';
				this.avatar = isStyle(parsed.avatar) ? parsed.avatar : DEFAULT_STYLE;
				this.clientId = parsed.clientId ?? '';
				this.clientSig = parsed.clientSig ?? '';
			}
			this.persist();
		} catch {}
	}

	setIdentity(clientId: string, clientSig: string): void {
		this.clientId = clientId;
		this.clientSig = clientSig;
		this.persist();
	}

	clearIdentity(): void {
		this.clientId = '';
		this.clientSig = '';
		this.persist();
	}

	get isComplete(): boolean {
		return this.name.trim().length > 0;
	}

	set(name: string): void {
		this.name = name.trim().slice(0, 20);
		this.persist();
	}

	setAvatar(style: string): void {
		if (!isStyle(style)) return;
		this.avatar = style;
		this.persist();
	}

	toJSON(): StoredProfile {
		return {
			name: this.name.trim(),
			avatar: this.avatar,
			clientId: this.clientId,
			clientSig: this.clientSig
		};
	}

	private persist(): void {
		if (!browser) return;
		localStorage.setItem(STORAGE_KEY, JSON.stringify(this.toJSON()));
	}
}

function isStyle(value: unknown): value is string {
	return typeof value === 'string' && (AVATAR_STYLES as readonly string[]).includes(value);
}

export const profile = new ProfileStore();
