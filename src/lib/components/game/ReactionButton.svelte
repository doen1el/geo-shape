<script lang="ts">
	import { ChevronDown } from '@lucide/svelte';
	import { buttonSound } from '$lib/audio/buttonSound';
	import { game, REACTION_EMOJIS } from '$lib/ws.svelte';
	import { t } from '$lib/i18n/index.svelte';

	const EMOJIS = REACTION_EMOJIS as readonly string[];
	const LONG_PRESS_MS = 300;

	let selected = $state(EMOJIS[0]);
	let open = $state(false);
	let pressTimer: ReturnType<typeof setTimeout> | null = null;
	let longFired = false;

	function clearTimer() {
		if (pressTimer) {
			clearTimeout(pressTimer);
			pressTimer = null;
		}
	}

	function onPointerDown() {
		longFired = false;
		clearTimer();
		pressTimer = setTimeout(() => {
			longFired = true;
			open = true;
		}, LONG_PRESS_MS);
	}

	function onPointerUp() {
		clearTimer();
		if (longFired) return;
		if (open) {
			open = false;
			return;
		}
		game.react(selected);
	}

	function pick(emoji: string) {
		selected = emoji;
		open = false;
		game.react(emoji);
	}
</script>

<div class="relative shrink-0">
	{#if open}
		<button
			type="button"
			use:buttonSound
			class="fixed inset-0 z-40 cursor-default"
			aria-label={t('common.cancel')}
			onclick={() => (open = false)}
		></button>
		<div
			class="absolute bottom-full left-1/2 z-50 mb-2 flex -translate-x-1/2 gap-1 rounded-base border-2 border-border bg-surface p-1.5 shadow-shadow"
		>
			{#each EMOJIS as emoji (emoji)}
				<button
					type="button"
					use:buttonSound
					class="flex h-9 w-9 items-center justify-center rounded-base border-2 text-xl transition-transform hover:-translate-y-0.5 {selected ===
					emoji
						? 'border-border bg-main'
						: 'border-transparent hover:border-border hover:bg-main'}"
					onclick={() => pick(emoji)}
				>
					{emoji}
				</button>
			{/each}
		</div>
	{/if}

	<button
		type="button"
		use:buttonSound
		aria-label={t('chat.react')}
		aria-haspopup="true"
		aria-expanded={open}
		class="relative flex h-11 w-11 touch-none items-center justify-center rounded-base border-2 border-border bg-surface text-xl shadow-shadow transition-all select-none hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
		onpointerdown={onPointerDown}
		onpointerup={onPointerUp}
		onpointerleave={clearTimer}
		onpointercancel={clearTimer}
		onclick={(e) => {
			if (e.detail === 0) game.react(selected);
		}}
		oncontextmenu={(e) => {
			e.preventDefault();
			open = true;
		}}
	>
		{selected}
		<ChevronDown
			class="pointer-events-none absolute right-0.5 bottom-0.5 text-ink"
			size={12}
			strokeWidth={3}
			aria-hidden="true"
		/>
	</button>
</div>
