<script lang="ts">
	import { onMount } from 'svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { game } from '$lib/ws.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import RankMedal from '$lib/components/ui/RankMedal.svelte';
	import { i18n, t } from '$lib/i18n/index.svelte';
	import { ArrowLeft } from '@lucide/svelte';

	const nf = $derived(new Intl.NumberFormat(i18n.locale === 'de' ? 'de-DE' : 'en-US'));

	let tab = $state<'all' | 'daily'>('all');

	onMount(() => {
		game.requestLeaderboard();
		game.requestDaily();
	});

	const daily = $derived(game.daily?.board ?? []);
</script>

<div class="flex h-full flex-col gap-4 overflow-y-auto">
	<Button href="/" variant="neutral" class="h-10 self-start gap-2 px-4">
		<ArrowLeft size={18} aria-hidden="true" />
		{t('common.back')}
	</Button>

	<Card class="p-6">
		<h1 class="text-2xl font-extrabold">{t('leaderboard.title')}</h1>

		<div class="my-4 flex gap-2">
			{#each [{ id: 'all', label: t('daily.allTime') }, { id: 'daily', label: t('daily.tab') }] as opt (opt.id)}
				<button
					type="button"
					onclick={() => (tab = opt.id as 'all' | 'daily')}
					class="flex h-9 items-center rounded-base border-2 border-border px-3 text-sm font-extrabold shadow-shadow transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none {tab ===
					opt.id
						? 'bg-main'
						: 'bg-surface'}"
				>
					{opt.label}
				</button>
			{/each}
		</div>

		{#if tab === 'all'}
			{#if game.leaderboard.length === 0}
				<p class="py-8 text-center font-bold text-ink/50">{t('leaderboard.empty')}</p>
			{:else}
				<ol class="flex flex-col gap-2">
					{#each game.leaderboard as p, i (p.publicId || p.name + i)}
						<li>
							<a
								href={p.publicId ? `/p/${p.publicId}` : '#'}
								class="flex items-center gap-3 rounded-base border-2 border-border bg-bg px-3 py-2 transition-all hover:translate-x-[2px] hover:translate-y-[2px]"
							>
								<span class="flex w-7 justify-center text-lg font-extrabold"><RankMedal rank={i + 1} /></span>
								<Avatar
									style={p.avatar}
									seed={p.name}
									size={36}
									alt={p.name}
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
							</a>
						</li>
					{/each}
				</ol>
			{/if}
		{:else if daily.length === 0}
			<p class="py-8 text-center font-bold text-ink/50">{t('daily.empty')}</p>
		{:else}
			<ol class="flex flex-col gap-2">
				{#each daily as p, i (p.publicId || p.name + i)}
					<li>
						<a
							href={p.publicId ? `/p/${p.publicId}` : '#'}
							class="flex items-center gap-3 rounded-base border-2 border-border bg-bg px-3 py-2 transition-all hover:translate-x-[2px] hover:translate-y-[2px]"
						>
							<span class="flex w-7 justify-center text-lg font-extrabold"><RankMedal rank={i + 1} /></span>
							<Avatar
								style={p.avatar}
								seed={p.name}
								size={36}
								alt={p.name}
								class="rounded-base border-2 border-border bg-surface"
							/>
							<span class="flex-1 truncate font-bold">{p.name}</span>
							<div class="text-right text-sm font-bold tabular-nums">
								<div class="text-base">{nf.format(p.score)}</div>
								<div class="text-[10px] text-ink/50 uppercase">{t('leaderboard.score')}</div>
							</div>
						</a>
					</li>
				{/each}
			</ol>
		{/if}
	</Card>
</div>
