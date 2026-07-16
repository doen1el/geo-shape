<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { i18n, t } from '$lib/i18n/index.svelte';
	import { Flame } from '@lucide/svelte';
	import type { PlayerProfile } from '$lib/ws.svelte';

	type Props = {
		profile: PlayerProfile;
		own?: boolean;
	};

	let { profile, own = false }: Props = $props();

	const nf = $derived(new Intl.NumberFormat(i18n.locale === 'de' ? 'de-DE' : 'en-US'));

	const unlockedIds = $derived(new Set((profile.achievements ?? []).map((a) => a.id)));
	const catalogue = $derived(profile.catalogue ?? []);

	const GROUPS = ['basics', 'speed', 'streak', 'competition', 'collection', 'daily', 'hidden'];
	const grouped = $derived(
		GROUPS.map((group) => ({
			group,
			items: catalogue.filter((a) => a.group === group)
		})).filter((g) => g.items.length > 0)
	);

	const stats = $derived([
		{ label: t('stats.games'), value: nf.format(profile.gamesPlayed ?? 0), flame: false },
		{ label: t('stats.wins'), value: nf.format(profile.gamesWon ?? 0), flame: false },
		{ label: t('stats.best'), value: nf.format(profile.bestScore ?? 0), flame: false },
		{ label: t('daily.streak'), value: String(profile.dailyStreak ?? 0), flame: true }
	]);
</script>

<div class="flex flex-col gap-4">
	<Card class="flex items-center gap-4 p-4">
		<Avatar
			style={profile.avatar}
			seed={profile.name}
			size={64}
			alt={profile.name}
			class="shrink-0 rounded-base border-2 border-border bg-surface shadow-shadow"
		/>
		<div class="min-w-0 flex-1">
			<h1 class="truncate text-2xl font-extrabold">{profile.name}</h1>
			<p class="text-sm font-bold text-ink/50">
				{t('profile.badgeCount', {
					n: String(unlockedIds.size),
					total: String(catalogue.length)
				})}
			</p>
		</div>
	</Card>

	<dl class="grid grid-cols-4 gap-2 text-center">
		{#each stats as cell (cell.label)}
			<div class="rounded-base border-2 border-border bg-surface px-1.5 py-2 shadow-shadow">
				<dt class="truncate text-[11px] font-bold tracking-wide text-ink/50 uppercase">
					{cell.label}
				</dt>
				<dd class="flex items-center justify-center gap-1 text-lg font-extrabold tabular-nums">
					{#if cell.flame}
						<Flame size={16} class="text-orange-600" fill="currentColor" aria-hidden="true" />
					{/if}
					{cell.value}
				</dd>
			</div>
		{/each}
	</dl>

	{#if unlockedIds.size === 0}
		<Card class="p-4 text-center font-bold text-ink/50">
			{own ? t('profile.noBadges') : t('profile.noBadgesOther')}
		</Card>
	{/if}

	{#each grouped as { group, items } (group)}
		<Card class="p-4">
			<h2 class="mb-3 text-sm font-extrabold tracking-wide uppercase">
				{t(`badge.group.${group}` as 'badge.group.speed')}
			</h2>
			<div class="grid grid-cols-3 gap-2 sm:grid-cols-4">
				{#each items as a (a.id)}
					{@const have =
						a.categoryId != null
							? (profile.progress?.[a.categoryId] ?? 0)
							: a.counter
								? (profile.counters?.[a.counter] ?? 0)
								: 0}
					<Badge
						id={a.id}
						tier={a.tier}
						locked={!unlockedIds.has(a.id)}
						rarity={unlockedIds.has(a.id) ? (profile.rarity?.[a.id] ?? null) : null}
						progress={a.target ? { have, target: a.target } : null}
					/>
				{/each}
			</div>
		</Card>
	{/each}
</div>
