<script lang="ts">
	import { onMount } from 'svelte';
	import { settings } from '$lib/stores/settings.svelte';

	const MUSIC_SRC = '/sounds/music.mp3';
	let audio: HTMLAudioElement | null = null;

	function clamp01(v: number): number {
		if (!Number.isFinite(v)) return 0;
		return Math.min(1, Math.max(0, v));
	}

	function syncVolume() {
		if (!audio) return;
		audio.volume = settings.soundOn ? clamp01(settings.volume) : 0;
	}

	async function tryPlay() {
		if (!audio || !settings.soundOn || settings.volume <= 0) return;
		try {
			await audio.play();
		} catch {
			// Autoplay can be blocked until the first user gesture.
		}
	}

	onMount(() => {
		audio = new Audio(MUSIC_SRC);
		audio.loop = true;
		audio.preload = 'auto';
		syncVolume();

		const startOnInteraction = () => {
			void tryPlay();
		};

		document.addEventListener('pointerdown', startOnInteraction, { capture: true });
		document.addEventListener('keydown', startOnInteraction, { capture: true });
		void tryPlay();

		return () => {
			document.removeEventListener('pointerdown', startOnInteraction, { capture: true });
			document.removeEventListener('keydown', startOnInteraction, { capture: true });
			audio?.pause();
			audio = null;
		};
	});

	$effect(() => {
		syncVolume();
		if (!audio) return;
		if (settings.soundOn && settings.volume > 0) {
			void tryPlay();
		} else {
			audio.pause();
		}
	});
</script>
