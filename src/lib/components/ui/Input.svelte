<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import { cn } from '$lib/utils';

	type Props = {
		value?: string;
		class?: string;
	} & HTMLInputAttributes;

	let { value = $bindable(''), class: className, ...rest }: Props = $props();
</script>

<input
	bind:value
	class={cn(
		'h-11 w-full rounded-base border-2 border-border bg-surface px-4 font-medium text-ink shadow-shadow ring-offset-bg transition-all placeholder:text-ink/40 focus-visible:translate-x-[2px] focus-visible:translate-y-[2px] focus-visible:shadow-none focus-visible:outline-none disabled:opacity-50',
		className
	)}
	{...rest}
/>
