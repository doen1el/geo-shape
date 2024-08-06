<script lang="ts">
	import { goto } from '$app/navigation';
	import { createUser } from '$lib/utils.js';

	export let checkIfUserIsLoggedIn: () => void;
	export let roomCode: string;

	let username: string;
</script>

<div class="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
	<div
		class="w-80 px-8 py-4 bg-white border-2 p-2.5 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] grid place-content-center rounded-md"
	>
		<div>
			<h1 class="text-2xl mb-4 ml-2">ENTER YOUR NAME TO JOIN THE ROOM</h1>
			<div class="flex space-x-2 mx-auto">
				<form on:submit|preventDefault class="ml-4">
					<input
						class="border-black border-2 p-2.5 focus:outline-none shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:bg-[#FFA6F6] active:shadow-[2px_2px_0px_rgba(0,0,0,1)] mb-4 rounded-md"
						placeholder="FOO BAR"
						type="text"
						bind:value={username}
					/>
					<div>
						<button
							on:click={() => goto('/')}
							class="ml-2 mr-12 h-12 border-black border-2 p-2.5 bg-[#A6FAFF] hover:bg-[#79F7FF] shadow-[2px_2px_0px_rgba(0,0,0,1)] active:bg-[#00E1EF] rounded-md"
						>
							HOME
						</button>

						<button
							on:click={async () => {
								await createUser(false, username, roomCode);

								checkIfUserIsLoggedIn();
							}}
							class="h-12 border-black border-2 p-2.5 bg-[#A6FAFF] hover:bg-[#79F7FF] shadow-[2px_2px_0px_rgba(0,0,0,1)] active:bg-[#00E1EF] disabled:opacity-40 rounded-md"
							disabled={!username}
						>
							LOGIN
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
</div>
