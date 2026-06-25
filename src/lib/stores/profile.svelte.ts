import { browser } from '$app/environment';

const STORAGE_KEY = 'geoshape:profile';

function randomSeed(): string {
	return Math.random().toString(36).slice(2, 10);
}

function uuid(): string {
	if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
	return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export type Profile = { name: string; avatar: string; clientId: string };
type StoredProfile = Profile;

class ProfileStore {
	name = $state('');
	avatar = $state(randomSeed());
	clientId = $state(uuid());

	constructor() {
		if (!browser) return;
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (raw) {
				const parsed = JSON.parse(raw) as Partial<StoredProfile>;
				this.name = parsed.name ?? '';
				this.avatar = parsed.avatar || randomSeed();
				this.clientId = parsed.clientId || uuid();
			}
			this.persist();
		} catch {
		}
	}

	get isComplete(): boolean {
		return this.name.trim().length > 0;
	}

	set(name: string, avatar?: string): void {
		this.name = name.trim().slice(0, 20);
		if (avatar) this.avatar = avatar;
		this.persist();
	}

	shuffleAvatar(): void {
		this.avatar = randomSeed();
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

export const profile = new ProfileStore();

export function avatarUrl(seed: string): string {
	return `https://api.dicebear.com/9.x/croodles/svg?seed=${encodeURIComponent(seed)}&backgroundColor=ffdfbf,ffd5dc,d1d4f9,c0aede,b6e3f4&scale=110&radius=10`;
}
