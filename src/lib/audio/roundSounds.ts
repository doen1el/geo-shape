import { browser } from '$app/environment';
import { settings } from '$lib/stores/settings.svelte';

function createSound(src: string, loop = false): HTMLAudioElement | null {
	if (!browser) return null;
	const audio = new Audio(encodeURI(src));
	audio.preload = 'auto';
	audio.loop = loop;
	return audio;
}

function clamp01(v: number): number {
	if (!Number.isFinite(v)) return 0;
	return Math.min(1, Math.max(0, v));
}

function syncVolume(audio: HTMLAudioElement, scale = 1): void {
	audio.volume = settings.soundOn ? clamp01(settings.sfxVolume * scale) : 0;
}

function playSound(audio: HTMLAudioElement | null, scale = 1): void {
	if (!audio || !settings.soundOn || settings.sfxVolume <= 0) return;
	syncVolume(audio, scale);
	audio.currentTime = 0;
	void audio.play().catch(() => {
		// Ignore autoplay-policy rejections; user interactions will unlock audio.
	});
}

function stopSound(audio: HTMLAudioElement | null): void {
	if (!audio) return;
	audio.pause();
	audio.currentTime = 0;
}

const tickingClock = createSound('/sounds/tickingClock.mp3', true);
const revealSound = createSound(
	'/sounds/chrysalyn-cheerful-traditional-harp-positive-ui-alert- AUFLOSUNG-540977.mp3'
);
const startCountdownSound = createSound('/sounds/countdown.mp3');
const revealCountdownSound = createSound('/sounds/countdown-beep-104007.mp3');

const TICKING_CLOCK_BASE_VOLUME = 0.55;
const TICKING_CLOCK_RAMP_VOLUME = 0.15;
const START_COUNTDOWN_SOUND_VOLUME = 0.55;
const REVEAL_SOUND_VOLUME = 0.55;
const REVEAL_COUNTDOWN_SOUND_VOLUME = 0.55;

export function syncTickingClockSound(active: boolean, rampProgress = 0): void {
	if (!tickingClock) return;
	if (!active) {
		stopSound(tickingClock);
		return;
	}

	const volumeScale = TICKING_CLOCK_BASE_VOLUME + TICKING_CLOCK_RAMP_VOLUME * clamp01(rampProgress);
	syncVolume(tickingClock, volumeScale);
	if (tickingClock.paused) {
		void tickingClock.play().catch(() => {
			// Ignore autoplay-policy rejections; user interactions will unlock audio.
		});
	}
}

export function stopTickingClockSound(): void {
	stopSound(tickingClock);
}

export function playRoundRevealSound(): void {
	playSound(revealSound, REVEAL_SOUND_VOLUME);
}

export function playStartCountdownSound(): void {
	playSound(startCountdownSound, START_COUNTDOWN_SOUND_VOLUME);
}

export function playRevealCountdownSound(): void {
	if (!revealCountdownSound || !settings.soundOn || settings.sfxVolume <= 0) return;
	if (!revealCountdownSound.paused && !revealCountdownSound.ended) return;
	playSound(revealCountdownSound, REVEAL_COUNTDOWN_SOUND_VOLUME);
}