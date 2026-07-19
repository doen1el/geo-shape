<script lang="ts">
	import { Medal } from '@lucide/svelte';

	let { rank }: { rank: number } = $props();

	const COLOR: Record<number, string> = {
		1: 'text-yellow-500',
		2: 'text-gray-400',
		3: 'text-amber-700'
	};
</script>

{#if rank <= 3}
	<Medal size={22} class={COLOR[rank]} aria-label={`#${rank}`} />
{:else}
	{rank}
{/if}
