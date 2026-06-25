<script lang="ts">
	import Input from '$lib/components/ui/Input.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { game } from '$lib/ws.svelte';
	import { t } from '$lib/i18n/index.svelte';

	let text = $state('');
	let listEl = $state<HTMLDivElement | null>(null);
	let banner = $state<{ kind: 'correct' | 'close'; until: number } | null>(null);

	const mySolved = $derived(
		game.room?.players.find((p) => p.id === game.playerId)?.solved ?? false
	);
	const canGuess = $derived(game.round !== null && !game.roundResult && !mySolved);

	$effect(() => {
		const v = game.verdict;
		if (v && (v.value === 'correct' || v.value === 'close')) {
			banner = { kind: v.value, until: v.at + 1600 };
			const id = setTimeout(() => (banner = null), 1600);
			return () => clearTimeout(id);
		}
	});

	$effect(() => {
		game.chat.length;
		if (listEl) listEl.scrollTop = listEl.scrollHeight;
	});

	function submit() {
		const value = text.trim();
		if (!value || !canGuess) return;
		game.guess(value);
		text = '';
	}
</script>

<div class="flex h-full flex-col gap-3">
	<div
		bind:this={listEl}
		class="flex-1 space-y-1 overflow-y-auto rounded-base border-2 border-border bg-surface p-3 text-sm shadow-shadow"
	>
		{#each game.chat as entry (entry.id)}
			{#if entry.kind === 'solved'}
				<p class="font-bold text-main-accent">✓ {t('game.solvedBy', { name: entry.name })}</p>
			{:else}
				<p><span class="font-bold">{entry.name}:</span> {entry.text}</p>
			{/if}
		{:else}
			<p class="text-ink/40">…</p>
		{/each}
	</div>

	{#if banner}
		<p
			class="rounded-base border-2 border-border px-3 py-1 text-center font-extrabold {banner.kind ===
			'correct'
				? 'bg-main'
				: 'bg-[var(--color-main-accent)]/40'}"
		>
			{banner.kind === 'correct' ? t('game.correct') : t('game.close')}
		</p>
	{/if}

	<form class="flex gap-2" onsubmit={(e) => (e.preventDefault(), submit())}>
		<Input
			bind:value={text}
			placeholder={mySolved ? t('game.alreadySolved') : t('game.guessPlaceholder')}
			disabled={!canGuess}
			maxlength={40}
			aria-label={t('game.guessPlaceholder')}
		/>
		<Button type="submit" size="sm" disabled={!canGuess || text.trim().length === 0}>
			{t('game.send')}
		</Button>
	</form>
</div>
