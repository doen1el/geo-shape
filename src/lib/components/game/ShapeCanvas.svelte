<script lang="ts">
	import { onMount } from 'svelte';
	import { draw } from 'svelte/transition';
	import { linear } from 'svelte/easing';
	import type { RoundInfo } from '$lib/ws.svelte';
	import { t } from '$lib/i18n/index.svelte';

	let { round, revealed = false }: { round: RoundInfo; revealed?: boolean } = $props();

	let now = $state(Date.now());

	onMount(() => {
		const id = setInterval(() => (now = Date.now()), 200);
		return () => clearInterval(id);
	});

	const remainingMs = $derived(Math.max(0, round.endsAt - now));
	const secondsLeft = $derived(Math.ceil(remainingMs / 1000));
	const progress = $derived(Math.min(100, (remainingMs / (round.durationSec * 1000)) * 100));
	const revealMs = $derived(Math.max(1000, round.endsAt - now));
</script>

<div class="flex flex-col gap-3">
	<div class="flex items-center justify-between text-sm font-bold">
		<span>{t('game.round', { round: round.round, max: round.maxRounds })}</span>
		<span class="text-ink/60">{t(`category.${round.categoryId}` as 'category.0')}</span>
		<span class="tabular-nums">{secondsLeft}s</span>
	</div>

	<!-- Timer bar -->
	<div class="h-3 w-full overflow-hidden rounded-base border-2 border-border bg-surface">
		<div
			class="h-full bg-main transition-[width] duration-200 ease-linear"
			style="width: {progress}%"
		></div>
	</div>

	<!-- Outline -->
	<div
		class="flex aspect-square w-full items-center justify-center rounded-base border-2 border-border bg-surface shadow-shadow"
	>
		{#key round.round}
			<svg
				viewBox={round.viewBox}
				preserveAspectRatio="xMidYMid meet"
				width="100%"
				height="100%"
				class="max-h-[55svh] p-4"
			>
				<path
					in:draw={{ duration: revealMs, easing: linear }}
					d={round.path}
					fill={revealed ? 'var(--color-main)' : 'none'}
					stroke="var(--color-border)"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="transition-[fill] duration-500"
				/>
			</svg>
		{/key}
	</div>
</div>
