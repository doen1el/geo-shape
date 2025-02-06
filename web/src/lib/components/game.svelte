<script lang="ts">
	import { draw } from 'svelte/transition';
	import { linear } from 'svelte/easing';
	import type { Room } from '$lib/models/room';
	import { _ } from 'svelte-i18n';
	import { europeanCountriesSvgMap } from '$lib/util/svg_utils/european-countries';
	import { germanStatesSvgMap } from '$lib/util/svg_utils/german_states';
	import { worldCountriesSvgMap } from '$lib/util/svg_utils/world-countries';

	const {currentRoomInfo}: {currentRoomInfo: Room} = $props();

	let drawingPath = $state("");
	let previousIsDrawing = false;

	$effect(() => {
		if (currentRoomInfo.isDrawing && !previousIsDrawing) {
            previousIsDrawing = true;
            drawingPath = getSvgPath(currentRoomInfo);
			console.log(drawingPath);
        } else if (!currentRoomInfo.isDrawing && previousIsDrawing) {
            previousIsDrawing = false;
			drawingPath = "";
        } 
	});

	function getSvgPath(roomInfo: Room): string {
        if (roomInfo.category === 0) {
            return germanStatesSvgMap[roomInfo.currentSvgCode!];
        } else if (roomInfo.category === 1) {
            return europeanCountriesSvgMap[roomInfo.currentSvgCode!];
        } else {
            return worldCountriesSvgMap[roomInfo.currentSvgCode!];
        }
    }
</script>

<div class="flex-[3] p-4 block">
	<div class="flex justify-between items-center mb-2 mr-2 ml-2">
		<div>{currentRoomInfo.currentRound} / {currentRoomInfo.maxRounds}</div>
		<div>{$_("gamestatus")}: {(currentRoomInfo.isPlaying ? $_("playing") : $_("notPlaying"))}</div>
		<div>{currentRoomInfo.currentTime}s / {currentRoomInfo.maxTime}s</div>
	</div>
	{#if currentRoomInfo.isDrawing}
		<svg
			viewBox="-30 10 182 115"
			preserveAspectRatio="xMidYMid meet" 
			xmlns="http://www.w3.org/2000/svg"
			width="100%"
			height="100%"
		>
			{#if drawingPath != ""}
				<path
					transition:draw={{ duration: 20500, easing: linear }}
					stroke="black"
					fill="none"
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					version="1.2"
					d={drawingPath}
				/>
			{/if}
		</svg>
	{/if}
</div>