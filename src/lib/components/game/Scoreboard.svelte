<script lang="ts">
	import { avatarUrl } from '$lib/stores/profile.svelte';
	import type { PublicPlayer } from '$lib/ws.svelte';
	import { t } from '$lib/i18n/index.svelte';

	let {
		players,
		playerId,
		showSolved = false
	}: { players: PublicPlayer[]; playerId: string | null; showSolved?: boolean } = $props();

	const sorted = $derived([...players].sort((a, b) => b.score - a.score));
</script>

<ul class="flex flex-col gap-2">
	{#each sorted as p (p.id)}
		<li
			class="flex items-center gap-2 rounded-base border-2 border-border px-2 py-1.5 {showSolved &&
			p.solved
				? 'bg-main'
				: 'bg-bg'} {p.connected ? '' : 'opacity-50'}"
		>
			<img
				src={avatarUrl(p.avatar, p.name)}
				alt={p.name}
				width="28"
				height="28"
				class="rounded-base border-2 border-border bg-surface"
			/>
			<span class="truncate font-bold">{p.name}</span>
			{#if p.isHost}
				<span class="rounded border border-border bg-secondary px-1 text-[10px] font-extrabold">
					{t('lobby.host')}
				</span>
			{/if}
			{#if p.id === playerId}
				<span class="text-[10px] font-bold text-ink/50">{t('lobby.you')}</span>
			{/if}
			{#if showSolved && p.solved}
				<span class="ml-auto font-extrabold text-main-accent">✓</span>
			{:else}
				<span class="ml-auto font-extrabold tabular-nums">{p.score}</span>
			{/if}
		</li>
	{/each}
</ul>
