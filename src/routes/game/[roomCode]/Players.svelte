<script lang="ts">
	import type { User } from '$lib/utils';

	export let roomCode: string;
	export let currentPlayers: Array<User>;
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
	<div class="w-full border-t-2 border-black my-4"></div>
	<div>Admin Panel</div>
</div>
