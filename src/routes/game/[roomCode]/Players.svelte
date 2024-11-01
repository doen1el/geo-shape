<script lang="ts">
	import {
		endGame,
		startGame,
		updateRoomMaxRounds,
		updateRoomMaxTime,
		type User
	} from '$lib/utils';

	export let roomCode: string;
	export let currentPlayers: Array<User>;
	export let isAdmin: boolean;
	export let isPlaying: boolean;

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
		{#each currentPlayers as player (player.id)}
			<div style="display: flex; align-items: center;">
				<img
					class="avatar"
					src={`https://api.dicebear.com/9.x/identicon/svg?seed=${player.username}`}
					alt="avatar"
					width="20px"
				/>
				<p class="ml-2 mt-1">{player.username}: {player.points}</p>
			</div>
		{/each}
	</div>
	{#if isAdmin}
		<div class="w-full border-t-2 border-black my-4"></div>
		<div>Admin Panel</div>
		<div class="flex items-center mb-6">
			<button
				class="border-black border-2 p-2 focus:outline-none shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:bg-[#FFA6F6] active:shadow-[2px_2px_0px_rgba(0,0,0,1)] disabled:opacity-40 rounded-md"
				disabled={isPlaying}
				on:click={decrementRounds}
			>
				-
			</button>
			<div class="mx-4 text-xl">{maxRounds}</div>
			<button
				class="border-black border-2 p-2 focus:outline-none shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:bg-[#FFA6F6] active:shadow-[2px_2px_0px_rgba(0,0,0,1)] disabled:opacity-40 rounded-md"
				disabled={isPlaying}
				on:click={incrementRounds}
			>
				+
			</button>
		</div>

		<div class="flex items-center mb-6">
			<button
				class="border-black border-2 p-2 focus:outline-none shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:bg-[#FFA6F6] active:shadow-[2px_2px_0px_rgba(0,0,0,1)] disabled:opacity-40 rounded-md"
				disabled={isPlaying}
				on:click={decrementTime}
			>
				-
			</button>
			<div class="mx-4 text-xl">{maxTime}</div>
			<button
				class="border-black border-2 p-2 focus:outline-none shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:bg-[#FFA6F6] active:shadow-[2px_2px_0px_rgba(0,0,0,1)] disabled:opacity-40 rounded-md"
				disabled={isPlaying}
				on:click={incrementTime}
			>
				+
			</button>
		</div>

		<button
			on:click={async () => (isPlaying ? await endGame(roomCode) : await startGame(roomCode))}
			class="h-12 border-black border-2 p-2.5 bg-[#A6FAFF] hover:bg-[#79F7FF] shadow-[2px_2px_0px_rgba(0,0,0,1)] active:bg-[#00E1EF] disabled:opacity-40 rounded-md"
		>
			{isPlaying ? 'End Game' : 'Start Game'}
		</button>
	{/if}
</div>
