<script lang="ts">
	import { onMount } from 'svelte';
	import type { RoundInfo, NeighborShape } from '$lib/ws.svelte';
	import { i18n, t } from '$lib/i18n/index.svelte';

	const REVEAL_TAIL_MS = 10000;
	const CAP_R = 24;
	const CAP_W = 12;
	const CAP_OFF = 5;

	let {
		round,
		revealed = false,
		paused = null,
		reveal = null,
		context = null,
		revealPath = null
	}: {
		round: RoundInfo;
		revealed?: boolean;
		paused?: { remainingMs: number } | null;
		reveal?: { nextRoundAt: number; totalMs: number; isLast: boolean } | null;
		context?: NeighborShape[] | null;
		revealPath?: string | null;
	} = $props();

	let now = $state(Date.now());

	onMount(() => {
		const id = setInterval(() => (now = Date.now()), 120);
		return () => clearInterval(id);
	});

	const remainingMs = $derived(paused ? paused.remainingMs : Math.max(0, round.endsAt - now));
	const secondsLeft = $derived(Math.ceil(remainingMs / 1000));
	const progress = $derived(Math.min(100, (remainingMs / (round.durationSec * 1000)) * 100));

	const buildMs = $derived(Math.max(0, round.durationSec * 1000 - REVEAL_TAIL_MS));
	const elapsedMs = $derived(round.durationSec * 1000 - remainingMs);
	const drawProgress = $derived(
		revealed || round.difficulty !== 'hard' || buildMs <= 0
			? 1
			: Math.min(1, Math.max(0, elapsedMs / buildMs))
	);

	const shapeFill = $derived(
		revealed ? 'var(--color-main)' : drawProgress >= 1 ? 'var(--color-surface)' : 'none'
	);

	const showNext = $derived(revealed && !!reveal && reveal.totalMs > 0);
	const nextRemainingMs = $derived(reveal ? Math.max(0, reveal.nextRoundAt - now) : 0);
	const nextSeconds = $derived(Math.ceil(nextRemainingMs / 1000));
	const nextProgress = $derived(
		reveal && reveal.totalMs > 0 ? Math.min(100, (nextRemainingMs / reveal.totalMs) * 100) : 0
	);

	const VIEWBOX_PAD = 12;
	const viewBox = $derived.by(() => {
		const [x, y, w, h] = round.viewBox.split(/[\s,]+/).map(Number);
		if ([x, y, w, h].some((n) => !Number.isFinite(n))) return round.viewBox;
		return `${x - VIEWBOX_PAD} ${y - VIEWBOX_PAD} ${w + VIEWBOX_PAD * 2} ${h + VIEWBOX_PAD * 2}`;
	});

	const neighbors = $derived(revealed && context?.length ? context : []);
	const nbName = (n: NeighborShape) => (i18n.locale === 'de' ? n.nameDe : n.name);

	const targetPath = $derived(revealed && revealPath ? revealPath : round.path);
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

	<div
		class="canvas-box min-h-0 flex-1 overflow-hidden rounded-base border-2 border-border bg-surface shadow-shadow {neighbors.length
			? 'p-0'
			: 'p-2'}"
	>
		{#key round.round}
			<svg {viewBox} preserveAspectRatio="xMidYMid meet" class="h-full w-full">
				{#if neighbors.length}
					<g class="neighbors">
						{#each neighbors as nb (nb.name)}
							<path d={nb.path} class="nb-shape" />
						{/each}
						{#each neighbors as nb (nb.name)}
							<path
								d={nb.border}
								fill="none"
								stroke="var(--color-border)"
								stroke-width="3"
								stroke-linejoin="round"
								stroke-linecap="round"
							/>
						{/each}
					</g>
				{/if}

				<g class="reveal-group" class:stamp={revealed}>
					<path
						d={targetPath}
						pathLength="1"
						stroke-dasharray="1"
						stroke-dashoffset={1 - drawProgress}
						fill={shapeFill}
						stroke="var(--color-border)"
						stroke-width="6"
						stroke-linecap="round"
						stroke-linejoin="round"
						style="transition: stroke-dashoffset 160ms linear;"
					/>

					{#if revealed && round.capital}
						{@const cx = round.capital[0]}
						{@const cy = round.capital[1]}
						<g class="capital">
							<!-- hard offset shadow -->
							<g
								transform="translate({CAP_OFF} {CAP_OFF})"
								stroke="var(--color-border)"
								stroke-width={CAP_W}
								stroke-linecap="round"
							>
								<line x1={cx - CAP_R} y1={cy - CAP_R} x2={cx + CAP_R} y2={cy + CAP_R} />
								<line x1={cx - CAP_R} y1={cy + CAP_R} x2={cx + CAP_R} y2={cy - CAP_R} />
							</g>
							<!-- the X itself — red, matching the danger "Leave" button -->
							<g stroke="var(--color-danger)" stroke-width={CAP_W} stroke-linecap="round">
								<line x1={cx - CAP_R} y1={cy - CAP_R} x2={cx + CAP_R} y2={cy + CAP_R} />
								<line x1={cx - CAP_R} y1={cy + CAP_R} x2={cx + CAP_R} y2={cy - CAP_R} />
							</g>
						</g>
					{/if}
				</g>

				{#if neighbors.length}
					<g class="neighbors">
						{#each neighbors as nb (nb.name)}
							{#if nb.cx != null && nb.cy != null}
								<text x={nb.cx} y={nb.cy} class="nb-label">{nbName(nb)}</text>
							{/if}
						{/each}
					</g>
				{/if}
			</svg>
		{/key}
	</div>
</div>

<style>
	.canvas-box {
		background-image: repeating-linear-gradient(
			-45deg,
			color-mix(in srgb, var(--color-border) 4%, transparent) 0,
			color-mix(in srgb, var(--color-border) 4%, transparent) 1.5px,
			transparent 1.5px,
			transparent 13px
		);
	}

	.neighbors {
		animation: nb-fade 500ms ease-out 220ms both;
	}

	@keyframes nb-fade {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	.nb-shape {
		fill: color-mix(in srgb, var(--color-ink) 13%, var(--color-surface));
	}

	.nb-label {
		font-size: 30px;
		font-weight: 800;
		fill: var(--color-ink);
		fill-opacity: 0.6;
		text-anchor: middle;
		dominant-baseline: middle;
		paint-order: stroke;
		stroke: color-mix(in srgb, var(--color-ink) 13%, var(--color-surface));
		stroke-width: 6px;
		stroke-linejoin: round;
	}

	.reveal-group.stamp {
		transform-box: view-box;
		transform-origin: center;
		animation: stamp 460ms ease-out both;
	}

	@keyframes stamp {
		0% {
			transform: scale(1.5) rotate(-5deg);
			opacity: 0;
		}
		50% {
			transform: scale(0.9) rotate(2deg);
			opacity: 1;
		}
		72% {
			transform: scale(1.05) rotate(-1deg);
		}
		100% {
			transform: scale(1) rotate(0deg);
		}
	}

	.capital {
		transform-box: fill-box;
		transform-origin: center;
		animation: capPop 340ms cubic-bezier(0.2, 0.8, 0.3, 1) 240ms both;
	}

	@keyframes capPop {
		0% {
			transform: scale(0);
			opacity: 0;
		}
		60% {
			transform: scale(1.25);
			opacity: 1;
		}
		100% {
			transform: scale(1);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.reveal-group.stamp,
		.capital,
		.neighbors {
			animation: none;
		}
	}
</style>
