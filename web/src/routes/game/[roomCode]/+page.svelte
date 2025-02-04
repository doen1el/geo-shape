<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { pb } from '$lib/pocketbase.js';
	import { rooms } from '$lib/util/constants.js';
	import { page } from "$app/state";

	import Chat from '$lib/components/chat.svelte';
	import { currentUser } from '$lib/stores/user_store';
	import { get_room, join_room  } from '$lib/stores/room_store';
	import { show_toast } from '$lib/stores/toast_store';
	import { _ } from 'svelte-i18n';
	import type { Room } from '$lib/models/room';
	import RoomNotFound from '$lib/components/room_not_found.svelte';
	import PlayersAdmin from '$lib/components/players_admin.svelte';
	import JoinDialog from '$lib/components/join_dialog.svelte';
	import Game from '$lib/components/game.svelte';

	let doesRoomExist = $state(false);
	let userIsLoggedIn = $state(false);
	let currentRoomId = $state('');
	let currentRoomCode = $state('');
	let currentRoomInfo: Room = $state({} as Room);

	onMount(async () => {
        const param = page.url.pathname.split('/').pop() || '';

		currentRoomCode = param.replace(/[^a-zA-Z0-9]/g, '');

        if (currentRoomCode === '' || currentRoomCode.length !== 5) {
            show_toast({
                icon: "close",
                type: "error",
                text: $_("room-code-missing-or-wrong"),
            });
            return;
        }

        const room = await get_room(currentRoomCode);
        if (Object.keys(room).length === 0) {
            show_toast({
                icon: "close",
                type: "error",
                text: $_("room-not-found", {
				values: { roomCode: currentRoomCode },
			}),
            });
            return;
        }

		doesRoomExist = true;

		currentRoomId = room.id;

		await getInitialRoomInfo();

		pb.collection(rooms).subscribe(currentRoomId, async ({ action, record }) => { 
			const expandedRecord = await pb.collection(rooms).getOne(record.id, { expand: 'players,messages,messages.user' });
			currentRoomInfo = expandedRecord;
			console.log('Room updated: ', currentRoomInfo);
		});

        if (!$currentUser?.id) {
            show_toast({
                icon: "close",
                type: "error",
                text: $_("user-not-logged-in"),
            });
            return;
        }

        userIsLoggedIn = true;

        await join_room($currentUser, currentRoomId);

		// TODO: figure out why i have to query agian instead of using the subscription
		getInitialRoomInfo();
    });

	async function joinNewUser()  {
		if ($currentUser) {
			const r = await join_room($currentUser, currentRoomId);
			userIsLoggedIn = true;
		}
	}

	async function getInitialRoomInfo() {
		const res = await get_room(currentRoomCode);
		if (res) {
			currentRoomInfo = res;
		}
	}

	async function logOutCurrentPlayer() {

		// unsubscribe from room
		pb.collection(rooms).unsubscribe(currentRoomId);

		// const updatedRoomInfo = {
		// 	...currentRoomInfo,
		// 	players: currentRoomInfo.players?.filter((p) => p.id !== $currentUser?.id)
		// };

		// // remove from room
		// await update_room(updatedRoomInfo);

		// log out
		// await logOutPlayer();
	}

	onDestroy(() => {
		logOutCurrentPlayer()
	});
</script>

<div class="flex justify-center items-center h-screen">
	{#if !doesRoomExist}
		<RoomNotFound roomCode={currentRoomCode}/>
	{:else}
		<div
			class="flex flex-col items-center border-black border-2 rounded-md shadow-[8px_8px_0px_rgba(0,0,0,1)] bg-white w-4/5"
		>
			<div class="flex w-full p-5 text-left h-[600px]">
				<PlayersAdmin
					currentRoomInfo={currentRoomInfo}
					isAdmin={!!$currentUser?.isAdmin}
				/>

				<Game
					currentRoomInfo={currentRoomInfo}
				/>
				<Chat currentRoomInfo={currentRoomInfo} />
			</div>
		</div>
		{#if !userIsLoggedIn}
			<JoinDialog joinNewUser={joinNewUser} />
		{/if}
	{/if}
</div>
