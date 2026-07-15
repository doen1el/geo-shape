<script lang="ts">
	import { ChevronDown } from '@lucide/svelte';
	import { game, REACTION_KEYS } from '$lib/ws.svelte';
	import { REACTION_ICON } from '$lib/reactions';
	import { t } from '$lib/i18n/index.svelte';

	const KEYS = REACTION_KEYS as readonly string[];
	const LONG_PRESS_MS = 300;

	let selected = $state(KEYS[0]);
	let open = $state(false);
	let pressTimer: ReturnType<typeof setTimeout> | null = null;
	let longFired = false;

	const SelectedIcon = $derived(REACTION_ICON[selected].icon);

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

	function pick(key: string) {
		selected = key;
		open = false;
		game.react(key);
	}
</script>

<div class="relative shrink-0">
	{#if open}
		<button
			type="button"
			class="fixed inset-0 z-40 cursor-default"
			aria-label={t('common.cancel')}
			onclick={() => (open = false)}
		></button>
		<div
			class="absolute bottom-full left-1/2 z-50 mb-2 flex -translate-x-1/2 gap-1 rounded-base border-2 border-border bg-surface p-1.5 shadow-shadow"
		>
			{#each KEYS as key (key)}
				{@const Icon = REACTION_ICON[key].icon}
				<button
					type="button"
					class="flex h-9 w-9 items-center justify-center rounded-base border-2 transition-transform hover:-translate-y-0.5 {selected ===
					key
						? 'border-border bg-main'
						: 'border-transparent hover:border-border hover:bg-main'}"
					onclick={() => pick(key)}
				>
					<Icon size={20} class={REACTION_ICON[key].color} aria-hidden="true" />
				</button>
			{/each}
		</div>
	{/if}

	<button
		type="button"
		aria-label={t('chat.react')}
		aria-haspopup="true"
		aria-expanded={open}
		class="relative flex h-11 w-11 touch-none items-center justify-center rounded-base border-2 border-border bg-surface shadow-shadow transition-all select-none hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
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
		<SelectedIcon size={22} class={REACTION_ICON[selected].color} aria-hidden="true" />
		<ChevronDown
			class="pointer-events-none absolute right-0.5 bottom-0.5 text-ink"
			size={12}
			strokeWidth={3}
			aria-hidden="true"
		/>
	</button>
</div>
