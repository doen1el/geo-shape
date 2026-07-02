<script lang="ts">
	import Input from '$lib/components/ui/Input.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { game } from '$lib/ws.svelte';
	import { t } from '$lib/i18n/index.svelte';

	let text = $state('');
	let listEl = $state<HTMLDivElement | null>(null);

	$effect(() => {
		game.chat.length;
		if (listEl) listEl.scrollTop = listEl.scrollHeight;
	});

	function submit() {
		const value = text.trim();
		if (!value) return;
		game.say(value);
		text = '';
	}
</script>

<div class="flex h-full min-h-0 flex-col gap-2">
	<div bind:this={listEl} class="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1 text-sm">
		{#each game.chat as entry (entry.id)}
			{#if entry.kind === 'divider'}
				<div class="flex items-center gap-2 py-0.5">
					<span class="h-0.5 flex-1 rounded bg-border/50"></span>
					<span class="text-[10px] font-extrabold tracking-wide text-ink/50 uppercase">
						{entry.variant === 'lobby'
							? t('chat.lobbyDivider')
							: t('chat.roundDivider', { round: entry.round ?? 0 })}
					</span>
					<span class="h-0.5 flex-1 rounded bg-border/50"></span>
				</div>
			{:else if entry.kind === 'solved'}
				<p class="text-center font-bold text-main-accent">
					✓ {t('game.solvedBy', { name: entry.name ?? '' })}
				</p>
			{:else}
				{@const mine = entry.playerId != null && entry.playerId === game.playerId}
				<div class="flex {mine ? 'justify-end' : 'justify-start'}">
					<div
						class="max-w-[85%] rounded-base border-2 border-border px-2.5 py-1 {mine
							? 'bg-main'
							: 'bg-bg'}"
					>
						{#if !mine}
							<span class="text-[10px] font-bold text-ink/50">{entry.name}</span>
						{/if}
						<p class="leading-snug break-words">{entry.text}</p>
					</div>
				</div>
			{/if}
		{/each}
	</div>

	<form class="flex items-stretch gap-2" onsubmit={(e) => (e.preventDefault(), submit())}>
		<div class="min-w-0 flex-1">
			<Input bind:value={text} placeholder={t('chat.placeholder')} maxlength={120} />
		</div>
		<Button type="submit" disabled={text.trim().length === 0}>{t('game.send')}</Button>
	</form>
</div>
