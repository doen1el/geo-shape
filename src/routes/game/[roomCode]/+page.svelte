<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { pb, currentUser } from '$lib/pocketbase.js';
	import { messages, rooms, users } from '$lib/constants.js';
	import { convertAnswertToCountryCode, logOutPlayer, type Message, type User } from '$lib/utils';

	import JoinDialog from './JoinDialog.svelte';
	import Chat from './Chat.svelte';
	import Players from './Players.svelte';
	import Svg from './Svg.svelte';
	import RoomNotFound from './RoomNotFound.svelte';

	export let data;

	let userIsLoggedIn = false;
	let isAdmin = false;
	let timer: any;

	function checkIfUserIsLoggedIn() {
		console.log($currentUser);
		if ($currentUser) {
			userIsLoggedIn = true;
		}
	}

	async function checkIfUserIsAdmin() {
		if ($currentUser) {
			const user = await pb.collection(users).getOne($currentUser.id);
			isAdmin = user.isAdmin;
		}
	}

	if (data.roomCode != '') {
		onMount(async () => {
			checkIfUserIsLoggedIn();
			checkIfUserIsAdmin();

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
							points: 0,
							isAdmin: newUser.isAdmin
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

						if (record.isPlaying && record.isDrawing) {
							if (
								convertAnswertToCountryCode[message.text.toLowerCase()] === record.currentSvgCode
							) {
								console.log('Correct answer!');

								const user = await pb.collection(users).getOne(newMessage.user);
								const player = data.players.find((p) => p.id === user.id);
								if (player) {
									player.points += 1;
									await pb.collection(users).update(user.id, { points: player.points });
								}
							}
						}

						data.messages = [...data.messages, message];
						console.log('New message added: ' + JSON.stringify(message));
					}

					console.log(record);

					if (record.maxRounds != data.maxRounds) {
						data.maxRounds = record.maxRounds;
					}

					if (record.currentRound != data.currentRound) {
						data.currentRound = record.currentRound;
					}

					if (record.maxTime != data.maxTime) {
						data.maxTime = record.maxTime;
					}

					if (record.isPlaying != data.isPlaying) {
						data.isPlaying = record.isPlaying;

						if (record.isPlaying) {
							if (isAdmin) {
								startGame();
							}
						} else {
							if (isAdmin) {
								clearInterval(timer);
							}
						}
					}

					if (record.isDrawing != data.isDrawing) {
						data.isDrawing = record.isDrawing;
					}

					if (record.currentSvgCode != data.currentSvgCode) {
						data.currentSvgCode = record.currentSvgCode;
					}

					if (record.currentTime != data.currentTime) {
						data.currentTime = record.currentTime;
						// Display Call Time is Up
						// when time is below 5 turn the color to red
					}
				}
			});
		});

		function startGame() {
			data.currentRound += 1;
			data.currentTime = data.maxTime;

			const possibleStrings = ['nw', 'ni', 'hb', 'hh', 'sh', 'mv', 'bb'];
			const randomString = possibleStrings[Math.floor(Math.random() * possibleStrings.length)];

			// Sende den zufälligen String an alle Spieler
			pb.collection(rooms).update(data.id, {
				currentSvgCode: randomString,
				currentRound: data.currentRound,
				currentTime: data.currentTime,
				isDrawing: true,
				isPlaying: true
			});

			timer = setInterval(async () => {
				if (data.currentTime > 0) {
					data.currentTime -= 1;
					await pb.collection('rooms').update(data.id, { currentTime: data.currentTime });
				} else {
					pb.collection(rooms).update(data.id, { isDrawing: false });

					roundEnd();

					clearInterval(timer);
				}
			}, 1000);
		}
	}

	function roundEnd() {
		console.log('Round ended');
		if (data.currentRound < data.maxRounds) {
			console.log('New round starting');
			data.currentRound += 1;
			data.currentTime = data.maxTime;

			const possibleStrings = ['nw', 'ni', 'hb', 'hh', 'sh', 'mv', 'bb'];
			const randomString = possibleStrings[Math.floor(Math.random() * possibleStrings.length)];

			// Sende den zufälligen String an alle Spieler
			pb.collection(rooms).update(data.id, {
				currentSvgCode: randomString,
				currentRound: data.currentRound,
				currentTime: data.currentTime,
				isDrawing: true
			});

			timer = setInterval(async () => {
				if (data.currentTime > 0) {
					data.currentTime -= 1;
					await pb.collection('rooms').update(data.id, { currentTime: data.currentTime });
				} else {
					clearInterval(timer);
				}
			}, 1000);
		} else {
			// calculate winner
			// show Winner Screen
			pb.collection(rooms).update(data.id, { isPlaying: false });
		}
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
				<Players
					currentPlayers={data.players}
					roomCode={data.roomCode}
					{isAdmin}
					isPlaying={data.isPlaying}
				/>

				<Svg
					svgCode={data.currentSvgCode}
					currentRound={data.currentRound}
					maxRounds={data.maxRounds}
					currentTime={data.currentTime}
					maxTime={data.maxTime}
					isPlaying={data.isPlaying}
					isDrawing={data.isDrawing}
				/>
				<Chat currentMessages={data.messages} roomId={data.id} />
			</div>
		</div>
		{#if !userIsLoggedIn}
			<JoinDialog {checkIfUserIsLoggedIn} roomCode={data.roomCode} />
		{/if}
	{/if}
</div>
