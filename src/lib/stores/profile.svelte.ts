import { browser } from '$app/environment';

const STORAGE_KEY = 'geoshape:profile';

export const AVATAR_STYLES = [
	'fun-emoji',
	'adventurer',
	'bottts',
	'croodles',
	'thumbs',
	'micah',
	'notionists',
	'lorelei',
	'open-peeps',
	'pixel-art'
] as const;

const DEFAULT_STYLE = AVATAR_STYLES[0];

function uuid(): string {
	if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
	return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export type Profile = { name: string; avatar: string; clientId: string };
type StoredProfile = Profile;

class ProfileStore {
	name = $state('');
	avatar = $state<string>(DEFAULT_STYLE);
	clientId = $state(uuid());

	constructor() {
		if (!browser) return;
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (raw) {
				const parsed = JSON.parse(raw) as Partial<StoredProfile>;
				this.name = parsed.name ?? '';
				this.avatar = isStyle(parsed.avatar) ? parsed.avatar : DEFAULT_STYLE;
				this.clientId = parsed.clientId || uuid();
			}
			this.persist();
		} catch {
		}
	}

	get isComplete(): boolean {
		return this.name.trim().length > 0;
	}

	set(name: string): void {
		this.name = name.trim().slice(0, 20);
		this.persist();
	}

	cycleAvatar(): void {
		const i = AVATAR_STYLES.indexOf(this.avatar as (typeof AVATAR_STYLES)[number]);
		this.avatar = AVATAR_STYLES[(i + 1) % AVATAR_STYLES.length];
		this.persist();
	}

	toJSON(): StoredProfile {
		return { name: this.name.trim(), avatar: this.avatar, clientId: this.clientId };
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

export function avatarUrl(style: string, seed: string): string {
	const safeStyle = isStyle(style) ? style : DEFAULT_STYLE;
	const safeSeed = seed && seed.trim() ? seed.trim() : 'anon';
	return `https://api.dicebear.com/9.x/${safeStyle}/svg?seed=${encodeURIComponent(safeSeed)}&backgroundColor=ffdfbf,ffd5dc,d1d4f9,c0aede,b6e3f4&radius=10`;
}
