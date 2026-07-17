import { browser } from '$app/environment';
import { settings } from '$lib/stores/settings.svelte';

function createSound(src: string): HTMLAudioElement | null {
	if (!browser) return null;
	const audio = new Audio(src);
	audio.preload = 'auto';
	return audio;
}

const hoverSound = createSound('/sounds/hover.mp3');
const clickSound = createSound('/sounds/mouseClick.mp3');

function playSound(audio: HTMLAudioElement | null): void {
	if (!audio || !settings.soundOn || settings.sfxVolume <= 0) return;
	audio.volume = clamp01(settings.sfxVolume);
	audio.currentTime = 0;
	void audio.play().catch(() => {
		// Ignore autoplay-policy rejections; user interactions will unlock audio.
	});
}

function clamp01(v: number): number {
	if (!Number.isFinite(v)) return 0;
	return Math.min(1, Math.max(0, v));
}

export function playButtonHoverSound(): void {
	playSound(hoverSound);
}

export function playButtonClickSound(): void {
	playSound(clickSound);
}
