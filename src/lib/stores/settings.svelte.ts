import { browser } from '$app/environment';

const STORAGE_KEY = 'geoshape:settings';

class Settings {
	soundOn = $state(true);
	volume = $state(0.25);
	sfxVolume = $state(0.18);

	constructor() {
		if (!browser) return;
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (raw) {
				const p = JSON.parse(raw) as { soundOn?: boolean; volume?: number; sfxVolume?: number };
				if (typeof p.soundOn === 'boolean') this.soundOn = p.soundOn;
				if (typeof p.volume === 'number') this.volume = clamp01(p.volume);
				if (typeof p.sfxVolume === 'number') this.sfxVolume = clamp01(p.sfxVolume);
			}
		} catch {
		}
	}

	setSound(on: boolean): void {
		this.soundOn = on;
		this.persist();
	}

	toggleSound(): void {
		this.setSound(!this.soundOn);
	}

	setVolume(v: number): void {
		this.volume = clamp01(v);
		this.persist();
	}

	setSfxVolume(v: number): void {
		this.sfxVolume = clamp01(v);
		this.persist();
	}

	private persist(): void {
		if (!browser) return;
		try {
			localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({ soundOn: this.soundOn, volume: this.volume, sfxVolume: this.sfxVolume })
			);
		} catch {
		}
	}
}

function clamp01(v: number): number {
	if (!Number.isFinite(v)) return 0;
	return Math.min(1, Math.max(0, v));
}

export const settings = new Settings();
