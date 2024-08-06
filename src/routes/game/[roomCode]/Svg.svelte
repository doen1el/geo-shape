<script lang="ts">
	import { svgsMap } from '$lib/svgs.js';
	import { draw } from 'svelte/transition';
	import { linear } from 'svelte/easing';

	export let svgCode: string;
	export let currentRound: number;
	export let maxRounds: number;
	export let time: number;

	let condition = false;
</script>

<div class="flex-[3] p-4 block">
	<div class="flex justify-between items-center mb-2 mr-2 ml-2">
		<div>{currentRound} / {maxRounds}</div>
		<div>{time}s</div>
	</div>
	<button on:click={() => (condition = !condition)}> show svg </button>
	<svg
		viewBox="-30 10 182 115"
		preserveAspectRatio="xMidYMid meet"
		xmlns="http://www.w3.org/2000/svg"
		width="100%"
		height="100%"
	>
		{#if condition}
			<path
				transition:draw={{ duration: 20500, easing: linear }}
				stroke="black"
				fill="none"
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				version="1.2"
				d={svgsMap[svgCode]}
			/>
		{/if}
	</svg>
</div>
