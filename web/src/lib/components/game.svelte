<script lang="ts">
	import { draw } from 'svelte/transition';
	import { linear } from 'svelte/easing';
	import { createRoom, type Room } from '$lib/models/room';
	import { _ } from 'svelte-i18n';
	import { europeanCountriesSvgMap } from '$lib/util/svg_utils/european-countries';
	import { germanStatesSvgMap } from '$lib/util/svg_utils/german_states';
	import { worldCountriesSvgMap } from '$lib/util/svg_utils/world-countries';
	import { update_room } from '$lib/stores/room_store';

	const {currentRoomInfo}: {currentRoomInfo: Room} = $props();

	let drawingPath = $state("");
	let previousIsDrawing = false;
	let gameOver = $state(false);
    let winner = $state("");

	$effect(() => {
		if (currentRoomInfo.isDrawing && !previousIsDrawing) {
            previousIsDrawing = true;
            drawingPath = getSvgPath(currentRoomInfo);
        } else if (!currentRoomInfo.isDrawing && previousIsDrawing) {
            previousIsDrawing = false;
			drawingPath = "";
        } 

		if (!currentRoomInfo.isPlaying && currentRoomInfo.winnerName !== "") {
            gameOver = true;
            winner = currentRoomInfo.winnerName!;
            setTimeout(() => {
                gameOver = false;
                winner = "";
            }, 3000);

			const updatedRoom = createRoom({
				...currentRoomInfo,
				winnerName: "",
			})

			update_room(updatedRoom);
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
	{#if gameOver && winner !== ""}
		<div class="mr-40 ml-40 mt-40 text-center font-bold mb-5 border-black border-2 flex-1 overflow-y-auto rounded-md shadow-[2px_2px_0px_rgba(0,0,0,1)] flex flex-col items-center justify-center">
			<img
				class="avatar mt-4 mb-4"
				src={`https://api.dicebear.com/9.x/croodles/svg?seed=${winner}&backgroundColor=ffdfbf,ffd5dc,d1d4f9,c0aede,b6e3f4&scale=110&radius=10`}
				alt="avatar"
				width="100px"
			/>
			<p>{winner.toUpperCase()} {$_("won-the-game")}</p>
		</div>
    {:else if currentRoomInfo.isDrawing}
        <svg
            preserveAspectRatio="xMidYMid meet" 
            viewBox="0 0 400 400"
            xmlns="http://www.w3.org/2000/svg"
            width="100%"
            height="100%"
        >
            {#if drawingPath != ""}
                <path
                    transition:draw={{ duration: currentRoomInfo.maxTime! * 1000, easing: linear }}
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