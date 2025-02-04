<script lang="ts">
	import { svgsMap } from '$lib/svgs.js';
	import { draw } from 'svelte/transition';
	import { linear } from 'svelte/easing';
	import type { Room } from '$lib/models/room';

	const {currentRoomInfo}: {currentRoomInfo: Room} = $props();

	// peserveAspectRatio
</script>

<div class="flex-[3] p-4 block">
	<div class="flex justify-between items-center mb-2 mr-2 ml-2">
		<div>{currentRoomInfo.currentRound} / {currentRoomInfo.maxRounds}</div>
		<div>{'GameStatus: ' + (currentRoomInfo.isPlaying ? 'Playing' : 'Not Playing')}</div>
		<div>{currentRoomInfo.currentTime}s / {currentRoomInfo.maxTime}s</div>
	</div>
	<svg
		viewBox="-30 10 182 115"
		preserveAspectRatio="xMidYMid meet" 
		xmlns="http://www.w3.org/2000/svg"
		width="100%"
		height="100%"
	>
		{#if currentRoomInfo.isDrawing}
			<path
				transition:draw={{ duration: 20500, easing: linear }}
				stroke="black"
				fill="none"
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				version="1.2"
				d={svgsMap[currentRoomInfo.svgCode!]}
			/>
		{/if}
	</svg>
</div>