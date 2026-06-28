<script lang="ts">
	import { onMount } from 'svelte';
	import type { RoundInfo } from '$lib/ws.svelte';
	import { t } from '$lib/i18n/index.svelte';

	// Hard mode: the outline finishes drawing this many seconds before the round ends.
	const REVEAL_TAIL_MS = 10000;

	let {
		round,
		revealed = false,
		paused = null,
		reveal = null
	}: {
		round: RoundInfo;
		revealed?: boolean;
		paused?: { remainingMs: number } | null;
		reveal?: { nextRoundAt: number; totalMs: number; isLast: boolean } | null;
	} = $props();

	let now = $state(Date.now());

	onMount(() => {
		const id = setInterval(() => (now = Date.now()), 120);
		return () => clearInterval(id);
	});

	const remainingMs = $derived(paused ? paused.remainingMs : Math.max(0, round.endsAt - now));
	const secondsLeft = $derived(Math.ceil(remainingMs / 1000));
	const progress = $derived(Math.min(100, (remainingMs / (round.durationSec * 1000)) * 100));

	// Outline build: 0 = hidden … 1 = fully drawn. Easy mode is always full; hard
	// mode grows from 0 to full, reaching 1 with REVEAL_TAIL_MS left on the clock.
	const buildMs = $derived(Math.max(0, round.durationSec * 1000 - REVEAL_TAIL_MS));
	const elapsedMs = $derived(round.durationSec * 1000 - remainingMs);
	const drawProgress = $derived(
		revealed || round.difficulty !== 'hard' || buildMs <= 0
			? 1
			: Math.min(1, Math.max(0, elapsedMs / buildMs))
	);

	const showNext = $derived(revealed && !!reveal && reveal.totalMs > 0);
	const nextRemainingMs = $derived(reveal ? Math.max(0, reveal.nextRoundAt - now) : 0);
	const nextSeconds = $derived(Math.ceil(nextRemainingMs / 1000));
	const nextProgress = $derived(
		reveal && reveal.totalMs > 0 ? Math.min(100, (nextRemainingMs / reveal.totalMs) * 100) : 0
	);
</script>

<div class="flex h-full min-h-0 flex-col gap-2">
	<div class="flex shrink-0 items-center justify-between text-sm font-bold">
		<span>{t('game.round', { round: round.round, max: round.maxRounds })}</span>
		<span class="text-ink/60">{t(`category.${round.categoryId}` as 'category.0')}</span>
		{#if showNext}
			<span class="tabular-nums">
				{reveal?.isLast
					? t('game.resultsIn', { seconds: nextSeconds })
					: t('game.nextRoundIn', { seconds: nextSeconds })}
			</span>
		{:else if paused}
			<span class="rounded border-2 border-border bg-secondary px-1.5 text-xs font-extrabold">
				⏸ {t('game.paused')}
			</span>
		{:else}
			<span class="tabular-nums">{secondsLeft}s</span>
		{/if}
	</div>

	<!-- Round timer / next-round wait bar -->
	<div class="h-3 w-full shrink-0 overflow-hidden rounded-base border-2 border-border bg-surface">
		<div
			class="h-full transition-[width] duration-200 ease-linear {showNext || paused
				? 'bg-secondary'
				: 'bg-main'}"
			style="width: {showNext ? nextProgress : progress}%"
		></div>
	</div>

	<!-- Outline (fills remaining height, never forces overflow) -->
	<div
		class="flex min-h-0 flex-1 items-center justify-center rounded-base border-2 border-border bg-surface p-2 shadow-shadow"
	>
		{#key round.round}
			<svg
				viewBox={round.viewBox}
				preserveAspectRatio="xMidYMid meet"
				class="h-full max-h-full w-full"
			>
				<path
					d={round.path}
					pathLength="1"
					stroke-dasharray="1"
					stroke-dashoffset={1 - drawProgress}
					fill={revealed ? 'var(--color-main)' : 'none'}
					stroke="var(--color-border)"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					style="transition: stroke-dashoffset 160ms linear, fill 500ms ease;"
				/>
			</svg>
		{/key}
	</div>
</div>
