<script lang="ts">
	import { createUser, checkIfRoomExists } from '$lib/utils';

	let username: string;
	let roomCode: string;
	let roomExists = false;
</script>

<div class="flex justify-center items-center h-screen">
	<div
		class="flex-container w-80 border-black border-2 rounded-md shadow-[8px_8px_0px_rgba(0,0,0,1)] bg-white"
	>
		<div class="px-6 py-5 text-left h-full">
			<h1 class="text-[32px] mb-4 text-center">JOIN</h1>
			<h2 class="mb-2">USERNAME</h2>
			<form on:submit|preventDefault>
				<input
					class="border-black border-2 p-2.5 focus:outline-none shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:bg-[#FFA6F6] active:shadow-[2px_2px_0px_rgba(0,0,0,1)] mb-4 rounded-md"
					placeholder="FOO BAR"
					type="text"
					bind:value={username}
				/>
				<h2 class="mb-2">ROOM-CODE</h2>
				<input
					class="border-black border-2 p-2.5 focus:outline-none shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:bg-[#FFA6F6] active:shadow-[2px_2px_0px_rgba(0,0,0,1)] mb-6 rounded-md"
					placeholder="ABCDE"
					type="text"
					bind:value={roomCode}
					on:input={() => (roomCode = roomCode.toUpperCase())}
					on:input={async () => (roomExists = await checkIfRoomExists(roomCode))}
				/>
				<button
					on:click={async () => await createUser(false, username, roomCode)}
					class="h-12 border-black border-2 p-2.5 bg-[#A6FAFF] hover:bg-[#79F7FF] shadow-[2px_2px_0px_rgba(0,0,0,1)] active:bg-[#00E1EF] disabled:opacity-40 rounded-md"
					disabled={!username || !roomCode || !roomExists}
				>
					LOGIN
				</button>
			</form>
		</div>
	</div>
</div>
