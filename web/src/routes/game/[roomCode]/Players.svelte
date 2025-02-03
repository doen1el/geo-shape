<script lang="ts">
	import type { Room } from '$lib/models/room';
	import type { User } from '$lib/models/user';
	import {
		endGame,
		startGame,
		updateRoomMaxRounds,
		updateRoomMaxTime,
	} from '$lib/utils';

	export let roomCode: string;
	export let currentRoomInfo: Room;
	export let isAdmin: boolean;

	let maxRounds = 5;
	let maxTime = 120;

	function incrementRounds() {
		maxRounds += 1;
		updateRoomMaxRounds(roomCode, maxRounds);
	}

	function decrementRounds() {
		if (maxRounds > 1) {
			maxRounds -= 1;
			updateRoomMaxRounds(roomCode, maxRounds);
		}
	}

	function incrementTime() {
		maxTime += 30;
		updateRoomMaxTime(roomCode, maxTime);
	}

	function decrementTime() {
		if (maxTime > 30) {
			maxTime -= 30;
			updateRoomMaxTime(roomCode, maxTime);
		}
	}
</script>

<div class="flex-1 p-4 border-r border-black flex flex-col h-full">
	<div class="overflow-y-auto flex-1">
		<h2>Players in {roomCode}:</h2>
		{#each currentRoomInfo.expand?.players ?? [] as player (player.id)}
			<div style="display: flex; align-items: center;">
				<img
					class="avatar"
					src={`https://api.dicebear.com/9.x/identicon/svg?seed=${player.username}`}
					alt="avatar"
					width="20px"
				/>
				<p class="ml-2 mt-1 {player.isAdmin ? 'font-bold' : ''}">
                    {player.username.toUpperCase()}: {player.points}
                </p>
			</div>
		{/each}
	</div>
	{#if isAdmin}
		<div class="w-full border-t-2 border-black my-4"></div>
		<div>Admin Panel</div>
		<div class="flex items-center mb-6">
			<button
				class="btn-admin-primary"
				disabled={currentRoomInfo.isPlaying}
				on:click={decrementRounds}
			>
				-
			</button>
			<div class="mx-4 text-xl">{maxRounds}</div>
			<button
				class="btn-admin-primary"
				disabled={currentRoomInfo.isPlaying}
				on:click={incrementRounds}
			>
				+
			</button>
		</div>

		<div class="flex items-center mb-6">
			<button
				class="btn-admin-primary"
				disabled={currentRoomInfo.isPlaying}
				on:click={decrementTime}
			>
				-
			</button>
			<div class="mx-4 text-xl">{maxTime}</div>
			<button
				class="btn-admin-primary"
				disabled={currentRoomInfo.isPlaying}
				on:click={incrementTime}
			>
				+
			</button>
		</div>

		<button
			on:click={async () => (currentRoomInfo.isPlaying ? await endGame(roomCode) : await startGame(roomCode))}
			class="btn-primary"
		>
			{currentRoomInfo.isPlaying ? 'End Game' : 'Start Game'}
		</button>
	{/if}
</div>
