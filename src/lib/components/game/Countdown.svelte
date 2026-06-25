<script lang="ts">
	import { onMount } from 'svelte';
	import { scale } from 'svelte/transition';
	import { backOut } from 'svelte/easing';
	import { t } from '$lib/i18n/index.svelte';

	let { until }: { until: number } = $props();

	let now = $state(Date.now());
	onMount(() => {
		const id = setInterval(() => (now = Date.now()), 100);
		return () => clearInterval(id);
	});

	const secs = $derived(Math.max(0, Math.ceil((until - now) / 1000)));
	const label = $derived(secs > 0 ? String(secs) : t('game.go'));
</script>

<div class="flex flex-1 flex-col items-center justify-center gap-4">
	<p class="text-lg font-bold text-ink/50">{t('game.getReady')}</p>
	{#key label}
		<div
			in:scale={{ duration: 320, start: 0.3, easing: backOut }}
			class="flex h-36 w-36 items-center justify-center rounded-base border-4 border-border bg-main text-7xl font-extrabold shadow-shadow-lg"
		>
			{label}
		</div>
	{/key}
</div>
