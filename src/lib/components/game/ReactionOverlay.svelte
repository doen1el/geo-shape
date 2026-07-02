<script lang="ts">
	import { game, CONFETTI_EMOJI } from '$lib/ws.svelte';

	const CONFETTI_PIECES = Array.from({ length: 14 }, (_, i) => i);
	const COLORS = [
		'var(--color-main)',
		'var(--color-secondary)',
		'var(--color-danger)',
		'#ff90e8',
		'#a388ee',
		'var(--color-main)'
	];

	function rand(seed: number): number {
		const x = Math.sin(seed * 12.9898) * 43758.5453;
		return x - Math.floor(x);
	}
</script>

<div class="pointer-events-none absolute inset-0 z-30 overflow-hidden">
	{#each game.reactions as r (r.id)}
		{@const drift = (rand(r.id * 3) - 0.5) * 32}
		<div class="floater" style="--drift: {drift}px;">
			<span class="text-3xl drop-shadow-sm">{r.emoji}</span>
			<span
				class="mt-0.5 max-w-20 truncate rounded border border-border bg-surface/90 px-1 text-[9px] font-bold text-ink/70"
			>
				{r.name}
			</span>
		</div>

		{#if r.emoji === CONFETTI_EMOJI}
			<div class="burst">
				{#each CONFETTI_PIECES as i (i)}
					{@const a = rand(r.id * 100 + i)}
					{@const b = rand(r.id * 100 + i + 7)}
					{@const c = rand(r.id * 100 + i + 13)}
					{@const size = 14 + Math.round(b * 12)}
					{@const bar = c > 0.6}
					{@const w = bar ? Math.round(size * 1.4) : size}
					{@const h = bar ? Math.round(size * 0.55) : size}
					<span
						class="confetti"
						style="--dx: {(a - 0.75) * 200}px; --dy: {-(90 + b * 150)}px; --rot: {(a - 0.5) *
							720}deg; width: {w}px; height: {h}px; background: {COLORS[i % COLORS.length]};"
					></span>
				{/each}
			</div>
		{/if}
	{/each}
</div>

<style>
	.floater {
		position: absolute;
		right: 74px;
		bottom: 22px;
		width: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		will-change: transform, opacity;
		animation: floatUp 2.2s ease-out forwards;
	}

	@keyframes floatUp {
		0% {
			transform: translate(0, 0) scale(0.7);
			opacity: 0;
		}
		15% {
			transform: translate(calc(var(--drift) * 0.2), -14px) scale(1);
			opacity: 1;
		}
		100% {
			transform: translate(var(--drift), -150px) scale(0.45);
			opacity: 0;
		}
	}

	.burst {
		position: absolute;
		right: 74px;
		bottom: 22px;
		width: 0;
		height: 0;
	}

	.confetti {
		position: absolute;
		bottom: 0;
		left: 0;
		border: 2px solid var(--color-border);
		box-shadow: 2px 2px 0 0 var(--color-border);
		will-change: transform, opacity;
		animation: confettiPop 1.4s cubic-bezier(0.2, 0.65, 0.3, 1) forwards;
	}

	@keyframes confettiPop {
		0% {
			transform: translate(0, 0) rotate(0);
			opacity: 1;
		}
		100% {
			transform: translate(var(--dx), var(--dy)) rotate(var(--rot));
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.floater {
			animation-duration: 1.2s;
		}
		.confetti {
			display: none;
		}
	}
</style>
