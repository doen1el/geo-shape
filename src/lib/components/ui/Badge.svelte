<script lang="ts">
	import { cn } from '$lib/utils';
	import { t } from '$lib/i18n/index.svelte';
	import { badgeIcon } from '$lib/badgeIcons';
	import type { Tier } from '$lib/ws.svelte';

	type Props = {
		id: string;
		tier: Tier;
		locked?: boolean;
		progress?: { have: number; target: number } | null;
		rarity?: number | null;
		size?: 'sm' | 'default';
		class?: string;
	};

	let {
		id,
		tier,
		locked = false,
		progress = null,
		rarity = null,
		size = 'default',
		class: className
	}: Props = $props();

	const TIER_BG: Record<Tier, string> = {
		bronze: 'bg-sand',
		silver: 'bg-surface',
		gold: 'bg-main'
	};

	const Icon = $derived(badgeIcon(id).icon);
	const color = $derived(badgeIcon(id).color);
	const title = $derived(t(`achievement.${id}.title` as 'achievement.blitz.title'));
	const desc = $derived(t(`achievement.${id}.desc` as 'achievement.blitz.desc'));
	const pct = $derived(
		progress && progress.target > 0
			? Math.min(100, Math.round((progress.have / progress.target) * 100))
			: 0
	);
</script>

<div
	class={cn(
		'group relative flex flex-col items-center gap-1 rounded-base border-2 border-border p-2 text-center',
		locked ? 'bg-bg' : `${TIER_BG[tier]} shadow-shadow`,
		className
	)}
>
	<Icon size={size === 'sm' ? 22 : 30} class={locked ? 'text-ink/25' : color} aria-hidden="true" />
	<span class={cn('text-[11px] leading-tight font-extrabold', locked && 'text-ink/40')}>
		{title}
	</span>

	{#if progress && locked}
		<div class="mt-0.5 h-1.5 w-full rounded-full border border-border bg-surface">
			<div class="h-full rounded-full bg-main-accent" style="width: {pct}%"></div>
		</div>
		<span class="text-[10px] font-bold text-ink/50 tabular-nums">
			{progress.have}/{progress.target}
		</span>
	{/if}

	<div
		class="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max max-w-[min(16rem,80vw)] -translate-x-1/2 rounded-base border-2 border-border bg-secondary px-3 py-2 text-[11px] leading-relaxed font-bold text-ink opacity-0 shadow-shadow transition-opacity duration-150 group-hover:opacity-100"
	>
		{locked ? `${t('profile.locked')} — ${desc}` : desc}
		{#if !locked && rarity != null}
			<span class="mt-1 block text-ink/60">{t('badge.rarity', { pct: String(rarity) })}</span>
		{/if}
	</div>
</div>
