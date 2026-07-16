<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fade, scale } from 'svelte/transition';
	import { backOut } from 'svelte/easing';
	import { cn } from '$lib/utils';
	import { t } from '$lib/i18n/index.svelte';

	type Props = {
		open: boolean;
		dismissable?: boolean;
		onclose?: () => void;
		class?: string;
		children: Snippet;
	};

	let { open, dismissable = true, onclose, class: className = '', children }: Props = $props();

	function dismiss() {
		if (dismissable) onclose?.();
	}
	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') dismiss();
	}
</script>

<svelte:window {onkeydown} />

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<button
			class="absolute inset-0 bg-black/30 backdrop-blur-sm"
			transition:fade={{ duration: 150 }}
			onclick={dismiss}
			aria-label={t('common.close')}
			tabindex="-1"
		></button>
		<div
			class={cn(
				'relative w-full max-w-sm rounded-base border-2 border-border bg-surface p-6 shadow-shadow-lg',
				className
			)}
			transition:scale={{ duration: 180, start: 0.92, easing: backOut }}
			role="dialog"
			aria-modal="true"
		>
			{@render children()}
		</div>
	</div>
{/if}
