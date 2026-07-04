<script lang="ts">
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import type { PublicPlayer } from '$lib/ws.svelte';

	let { players, playerId }: { players: PublicPlayer[]; playerId: string | null } = $props();

	const ranked = $derived([...players].sort((a, b) => b.score - a.score));

	type Slot = {
		place: number;
		player: PublicPlayer | undefined;
		block: string;
		avatar: number;
		bg: string;
	};
	const slots = $derived<Slot[]>([
		{ place: 2, player: ranked[1], block: 'h-16', avatar: 52, bg: 'bg-secondary' },
		{ place: 1, player: ranked[0], block: 'h-24', avatar: 72, bg: 'bg-main' },
		{ place: 3, player: ranked[2], block: 'h-12', avatar: 44, bg: 'bg-sand' }
	]);
</script>

<div class="flex w-full items-end justify-center gap-2 sm:gap-3">
	{#each slots as s (s.place)}
		{#if s.player}
			<div class="flex flex-1 flex-col items-center gap-1.5">
				{#if s.place === 1}
					<span class="text-2xl leading-none">👑</span>
				{/if}
				<Avatar
					style={s.player.avatar}
					seed={s.player.name}
					size={s.avatar}
					alt={s.player.name}
					class="rounded-base border-2 border-border bg-surface shadow-shadow"
				/>
				<span
					class="max-w-full truncate text-center font-bold {s.place === 1 ? 'text-base' : 'text-sm'}
						{s.player.id === playerId ? 'text-main-accent' : ''}"
				>
					{s.player.name}
				</span>
				<div
					class="flex w-full flex-col items-center justify-center rounded-base border-2 border-border shadow-shadow {s.block} {s.bg}"
				>
					<span class="text-lg font-extrabold">{s.place}</span>
					<span class="text-sm font-bold tabular-nums">{s.player.score}</span>
				</div>
			</div>
		{:else}
			<div class="flex-1"></div>
		{/if}
	{/each}
</div>
