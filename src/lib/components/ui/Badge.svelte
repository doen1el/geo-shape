<script lang="ts">
	import { cn } from '$lib/utils';
	import { t } from '$lib/i18n/index.svelte';
	import { badgeIcon } from '$lib/badgeIcons';

	type Props = {
		id: string;
		locked?: boolean;
		progress?: { have: number; target: number } | null;
		rarity?: number | null;
		size?: 'sm' | 'default';
		onActivate?: (() => void) | null;
		pressed?: boolean;
		class?: string;
	};

	let {
		id,
		locked = false,
		progress = null,
		rarity = null,
		size = 'default',
		onActivate = null,
		pressed = false,
		class: className
	}: Props = $props();

	// Touch devices have no hover, so the description has to be reachable by tapping.
	let open = $state(false);
	let root = $state<HTMLElement | null>(null);

	function closeIfOutside(e: Event) {
		if (open && root && !root.contains(e.target as Node)) open = false;
	}

	const Icon = $derived(badgeIcon(id).icon);
	const title = $derived(t(`achievement.${id}.title` as 'achievement.blitz.title'));
	const desc = $derived(t(`achievement.${id}.desc` as 'achievement.blitz.desc'));
	const pct = $derived(
		progress && progress.target > 0
			? Math.min(100, Math.round((progress.have / progress.target) * 100))
			: 0
	);
</script>

<svelte:window onpointerdown={closeIfOutside} />

<button
	bind:this={root}
	type="button"
	onclick={() => (onActivate ? onActivate() : (open = !open))}
	aria-expanded={onActivate ? undefined : open}
	aria-pressed={onActivate ? pressed : undefined}
	aria-describedby="badge-tip-{id}"
	class={cn(
		'group relative flex flex-col items-center justify-center gap-1 rounded-base border-2 border-border p-2 text-center',
		locked ? 'bg-bg' : 'bg-main shadow-shadow',
		className
	)}
>
	<Icon
		size={size === 'sm' ? 22 : 30}
		class={locked ? 'text-ink opacity-30' : 'text-ink'}
		aria-hidden="true"
	/>
	<span class={cn('text-[11px] leading-tight font-extrabold', locked && 'text-ink/40')}>
		{title}
	</span>

	{#if progress && locked}
		<span class="mt-0.5 block h-1.5 w-full rounded-full border border-border bg-surface">
			<span class="block h-full rounded-full bg-main-accent" style="width: {pct}%"></span>
		</span>
		<span class="text-[10px] font-bold text-ink/50 tabular-nums">
			{progress.have}/{progress.target}
		</span>
	{/if}

	<span
		id="badge-tip-{id}"
		role="tooltip"
		class={cn(
			'badge-tip pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 block w-max max-w-[min(16rem,80vw)] -translate-x-1/2 rounded-base border-2 border-border bg-secondary px-3 py-2 text-[11px] leading-relaxed font-bold text-ink shadow-shadow transition-opacity duration-150 group-hover:opacity-100',
			open ? 'opacity-100' : 'opacity-0'
		)}
	>
		{desc}
		{#if !locked && rarity != null}
			<span class="mt-1 block text-ink/60">{t('badge.rarity', { pct: String(rarity) })}</span>
		{/if}
	</span>
</button>
