<script lang="ts">
	import type { Component, Snippet } from 'svelte';
	import { cn } from '$lib/utils';
	import Card from './Card.svelte';

	type Props = {
		icon: Component;
		status?: number | string;
		title: string;
		desc?: string;
		detail?: string;
		actions?: Snippet;
		class?: string;
	};

	let { icon: Icon, status, title, desc, detail, actions, class: className }: Props = $props();
</script>

<div class={cn('flex items-center justify-center', className)}>
	<Card class="flex w-full max-w-md flex-col items-center gap-4 p-6 text-center sm:p-8">
		<span
			class="flex h-20 w-20 shrink-0 items-center justify-center rounded-base border-2 border-border bg-main shadow-shadow"
		>
			<Icon size={40} class="text-ink" aria-hidden="true" />
		</span>

		{#if status != null}
			<span class="text-5xl font-extrabold tabular-nums">{status}</span>
		{/if}

		<div class="flex flex-col gap-1.5">
			<h1 class="text-xl font-extrabold text-balance">{title}</h1>
			{#if desc}
				<p class="text-sm font-bold text-balance text-ink/60">{desc}</p>
			{/if}
		</div>

		{#if detail}
			<p
				class="w-full rounded-base border-2 border-border/15 bg-bg px-3 py-2 text-xs font-bold break-words text-ink/50"
			>
				{detail}
			</p>
		{/if}

		{#if actions}
			<div class="mt-1 flex flex-wrap items-center justify-center gap-2">
				{@render actions()}
			</div>
		{/if}
	</Card>
</div>
