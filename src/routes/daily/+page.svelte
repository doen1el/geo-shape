<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import RankMedal from '$lib/components/ui/RankMedal.svelte';
	import { game } from '$lib/ws.svelte';
	import { profile } from '$lib/stores/profile.svelte';
	import { i18n, t } from '$lib/i18n/index.svelte';
	import { ArrowLeft, Flame } from '@lucide/svelte';

	let starting = $state(false);

	const nf = $derived(new Intl.NumberFormat(i18n.locale === 'de' ? 'de-DE' : 'en-US'));
	const daily = $derived(game.daily);

	onMount(() => {
		game.requestDaily();
	});

	async function start() {
		if (!daily || starting) return;
		starting = true;
		try {
			const code = await game.startDaily(profile.toJSON());
			await goto(`/room/${code}?daily=1`);
		} catch {
			game.requestDaily();
		} finally {
			starting = false;
		}
	}

	const played = $derived(!!daily?.attempted);
</script>

<div class="flex h-full flex-col gap-4 overflow-y-auto pb-4">
	<Button href="/" variant="neutral" class="h-10 self-start gap-2 px-4">
		<ArrowLeft size={18} aria-hidden="true" />
		{t('common.back')}
	</Button>

	<Card class="p-6">
		<h1 class="text-2xl font-extrabold">{t('daily.title')}</h1>
		<p class="mt-1 text-sm font-bold text-ink/50">
			{t('daily.subtitle', { rounds: String(daily?.rounds ?? 5) })}
		</p>

		{#if daily?.streak}
			<div class="mt-4 flex gap-2">
				<div class="flex-1 rounded-base border-2 border-border bg-bg px-3 py-2 text-center">
					<p class="text-[11px] font-bold tracking-wide text-ink/50 uppercase">
						{t('daily.streak')}
					</p>
					<p class="flex items-center justify-center gap-1 text-lg font-extrabold tabular-nums">
						<Flame size={18} class="text-orange-600" fill="currentColor" aria-hidden="true" />
						{daily.streak}
					</p>
				</div>
				<div class="flex-1 rounded-base border-2 border-border bg-bg px-3 py-2 text-center">
					<p class="text-[11px] font-bold tracking-wide text-ink/50 uppercase">
						{t('daily.bestStreak')}
					</p>
					<p class="text-lg font-extrabold tabular-nums">{daily.bestStreak}</p>
				</div>
			</div>
		{/if}

		{#if played}
			{#if daily?.result}
				<div class="mt-4 flex gap-2">
					<div class="flex-1 rounded-base border-2 border-border bg-main px-3 py-2 text-center">
						<p class="text-[11px] font-bold tracking-wide uppercase">{t('daily.yourScore')}</p>
						<p class="text-lg font-extrabold tabular-nums">{nf.format(daily.result.score)}</p>
					</div>
					{#if daily.rank}
						<div class="flex-1 rounded-base border-2 border-border bg-bg px-3 py-2 text-center">
							<p class="text-[11px] font-bold tracking-wide text-ink/50 uppercase">
								{t('daily.rank')}
							</p>
							<p class="text-lg font-extrabold tabular-nums">#{daily.rank}</p>
						</div>
					{/if}
				</div>
			{/if}
			<p class="mt-3 text-center text-sm font-bold text-ink/50">{t('daily.comeBack')}</p>
		{:else}
			<Button
				class="mt-3 w-full"
				disabled={!profile.isComplete || starting}
				onclick={start}
			>
				{t('daily.start')}
			</Button>
		{/if}
	</Card>

	<Card class="p-4">
		<h2 class="mb-3 text-sm font-extrabold tracking-wide uppercase">{t('daily.board')}</h2>
		{#if !daily?.board.length}
			<p class="py-6 text-center font-bold text-ink/50">{t('daily.empty')}</p>
		{:else}
			<ol class="flex flex-col gap-2">
				{#each daily.board as p, i (p.publicId + i)}
					<li>
						<a
							href={p.publicId ? `/p/${p.publicId}` : '#'}
							class="flex items-center gap-3 rounded-base border-2 border-border bg-bg px-3 py-2 transition-all hover:translate-x-[2px] hover:translate-y-[2px]"
						>
							<span class="flex w-7 justify-center text-lg font-extrabold">
								<RankMedal rank={i + 1} />
							</span>
							<Avatar
							style={p.avatar}
							seed={p.name}
							size={32}
							alt={p.name}
							class="shrink-0 rounded-base border-2 border-border bg-surface"
						/>
							<span class="min-w-0 flex-1 truncate font-extrabold">{p.name}</span>
							<span class="font-extrabold tabular-nums">{nf.format(p.score)}</span>
						</a>
					</li>
				{/each}
			</ol>
		{/if}
	</Card>
</div>
