<script lang="ts">
	import { onMount } from 'svelte';
	import { generateUniqueRoomCode, createUser } from '$lib/utils';

	let username: string;
	let roomCode: string;

	onMount(async () => {
		roomCode = await generateUniqueRoomCode();
	});
</script>

<div class="flex justify-center items-center h-screen">
	<div
		class="flex-container w-80 border-black border-2 rounded-md shadow-[8px_8px_0px_rgba(0,0,0,1)] bg-white"
	>
		<div class="px-6 py-5 text-left h-full">
			<h1 class="text-[32px] mb-4 text-center">CREATE</h1>
			<h2 class="mb-2">USERNAME</h2>
			<form on:submit|preventDefault>
				<input
					class="border-black border-2 p-2.5 focus:outline-none shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:bg-[#FFA6F6] active:shadow-[2px_2px_0px_rgba(0,0,0,1)] mb-4 rounded-md"
					placeholder="FOO BAR"
					type="text"
					bind:value={username}
				/>

				<h3 class="mb-2">ROOM-CODE: {roomCode}</h3>

				<button
					on:click={async () => await createUser(true, username, roomCode)}
					class="h-12 border-black border-2 p-2.5 bg-[#A6FAFF] hover:bg-[#79F7FF] shadow-[2px_2px_0px_rgba(0,0,0,1)] active:bg-[#00E1EF] disabled:opacity-40 rounded-md"
					disabled={!username}
				>
					CREATE
				</button>
			</form>
		</div>
	</div>
</div>
