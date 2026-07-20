<script lang="ts">
	import { cn } from '$lib/utils';
	import { t } from '$lib/i18n/index.svelte';
	import type { MessageKey } from '$lib/i18n/en';
	import Card from './Card.svelte';

	type Props = {
		label?: MessageKey;
		size?: 'sm' | 'default';
		card?: boolean;
		class?: string;
	};

	let {
		label = 'common.connecting',
		size = 'default',
		card = false,
		class: className
	}: Props = $props();
</script>

{#snippet indicator()}
	<span class="flex gap-1.5" aria-hidden="true">
		{#each [0, 1, 2] as i (i)}
			<span
				class={cn(
					'gs-load-dot rounded-[3px] border-2 border-border bg-main',
					size === 'sm' ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'
				)}
				style="animation-delay: {i * 150}ms"
			></span>
		{/each}
	</span>
	<span class={cn('font-bold text-ink/60', size === 'sm' ? 'text-xs' : 'text-sm')}>
		{t(label)}
	</span>
{/snippet}

{#if card}
	<div role="status" aria-live="polite" class={cn('flex items-center justify-center', className)}>
		<Card class="flex flex-col items-center gap-3 px-10 py-7">
			{@render indicator()}
		</Card>
	</div>
{:else}
	<div
		role="status"
		aria-live="polite"
		class={cn('flex flex-col items-center justify-center gap-3', className)}
	>
		{@render indicator()}
	</div>
{/if}
