<script lang="ts">
	import { onMount } from 'svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { game } from '$lib/ws.svelte';
	import { avatarUrl } from '$lib/stores/profile.svelte';
	import { i18n, t } from '$lib/i18n/index.svelte';

	const nf = $derived(new Intl.NumberFormat(i18n.locale === 'de' ? 'de-DE' : 'en-US'));
	const medals = ['🥇', '🥈', '🥉'];

	onMount(() => {
		game.requestLeaderboard();
	});
</script>

<Card class="p-6">
	<h1 class="mb-4 text-2xl font-extrabold">{t('leaderboard.title')}</h1>

	{#if game.leaderboard.length === 0}
		<p class="py-8 text-center font-bold text-ink/50">{t('leaderboard.empty')}</p>
	{:else}
		<ol class="flex flex-col gap-2">
			{#each game.leaderboard as p, i (p.name + i)}
				<li class="flex items-center gap-3 rounded-base border-2 border-border bg-bg px-3 py-2">
					<span class="w-7 text-center text-lg font-extrabold">{medals[i] ?? i + 1}</span>
					<img
						src={avatarUrl(p.avatar)}
						alt={p.name}
						width="36"
						height="36"
						class="rounded-base border-2 border-border bg-surface"
					/>
					<span class="flex-1 truncate font-bold">{p.name}</span>
					<div class="flex gap-4 text-right text-sm font-bold tabular-nums">
						<div>
							<div class="text-base">{p.gamesWon}</div>
							<div class="text-[10px] text-ink/50 uppercase">{t('leaderboard.wins')}</div>
						</div>
						<div>
							<div class="text-base">{nf.format(p.totalScore)}</div>
							<div class="text-[10px] text-ink/50 uppercase">{t('leaderboard.score')}</div>
						</div>
						<div class="hidden sm:block">
							<div class="text-base">{p.gamesPlayed}</div>
							<div class="text-[10px] text-ink/50 uppercase">{t('leaderboard.games')}</div>
						</div>
					</div>
				</li>
			{/each}
		</ol>
	{/if}

	<div class="mt-6">
		<Button href="/" variant="neutral">{t('common.back')}</Button>
	</div>
</Card>
