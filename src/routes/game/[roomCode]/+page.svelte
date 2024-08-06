<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { pb, currentUser } from '$lib/pocketbase.js';
	import { messages, rooms, users } from '$lib/constants.js';
	import { logOutPlayer, type Message, type User } from '$lib/utils';

	import JoinDialog from './JoinDialog.svelte';
	import Chat from './Chat.svelte';
	import Players from './Players.svelte';
	import Svg from './Svg.svelte';
	import RoomNotFound from './RoomNotFound.svelte';

	export let data;

	let userIsLoggedIn = false;

	function checkIfUserIsLoggedIn() {
		console.log($currentUser);
		if ($currentUser) {
			userIsLoggedIn = true;
		}
	}

	if (data.roomCode != '') {
		onMount(async () => {
			checkIfUserIsLoggedIn();

			await pb.collection(rooms).subscribe('*', async ({ action, record }) => {
				if (action === 'update') {
					// Check if a new player was added
					if (record.players && record.players.length > data.players.length) {
						const newUser = await pb
							.collection(users)
							.getOne(record.players[record.players.length - 1]);

						const user: User = {
							id: newUser.id,
							username: newUser.username,
							points: 0
						};

						data.players = [...data.players, user];
						console.log('New user joined: ' + JSON.stringify(user));
					}

					// Check if new message was added
					if (record.messages && record.messages.length > data.messages.length) {
						const newMessage = await pb
							.collection(messages)
							.getOne(record.messages[record.messages.length - 1], { expand: 'user' });

						const message: Message = {
							id: newMessage.id,
							user: newMessage.expand!.user.username,
							text: newMessage.text
						};

						data.messages = [...data.messages, message];
						console.log('New message added: ' + JSON.stringify(message));
					}
				}
			});
		});
	}

	// onDestroy(() => {
	// 	logOutPlayer($currentUser?.id);
	// });
</script>

<div class="flex justify-center items-center h-screen">
	{#if data.roomCode == ''}
		<RoomNotFound />
	{:else}
		<div
			class="flex flex-col items-center border-black border-2 rounded-md shadow-[8px_8px_0px_rgba(0,0,0,1)] bg-white w-4/5"
		>
			<div class="flex w-full p-5 text-left h-[600px]">
				<Players currentPlayers={data.players} roomCode={data.roomCode} />

				<Svg
					svgCode={data.currentSvgCode}
					currentRound={data.currentRound}
					maxRounds={data.maxRounds}
					time={120}
				/>
				<Chat currentMessages={data.messages} roomId={data.id} />
			</div>
		</div>
		{#if !userIsLoggedIn}
			<JoinDialog {checkIfUserIsLoggedIn} roomCode={data.roomCode} />
		{/if}
	{/if}
</div>
