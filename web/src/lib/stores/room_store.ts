import { APIError } from '$lib/util/api_util';
import { type Writable, writable } from 'svelte/store';
import { createRoom, type Room } from '$lib/models/room';
import { createUser, type User } from '$lib/models/user';
import { europeanCountriesSvgMap } from '$lib/util/svg_utils/european-countries';
import { germanStatesSvgMap } from '$lib/util/svg_utils/german_states';
import { worldCountriesSvgMap } from '$lib/util/svg_utils/world-countries';
import { update_user } from './user_store';

/**
 * A writable store that holds the current room information.
 *
 * This store can either contain a `Room` object or `null` if no room is selected.
 *
 * @type {Writable<Room | null>}
 */
export const currentRoom: Writable<Room | null> = writable<Room | null>();

let roundTimer: NodeJS.Timeout | null = null;

const svgCodesByCategory: { [key: number]: { [key: number]: string } } = {
	0: germanStatesSvgMap,
	1: europeanCountriesSvgMap,
	2: worldCountriesSvgMap
};

/**
 * Creates a new room by sending a POST request to the server.
 *
 * @param room_code - The code that the room should have.
 * @returns A promise that resolves to the created room object.
 * @throws {APIError} If the server responds with an error.
 */
export async function room_create(room_code: string): Promise<Room> {
	const newRoom = createRoom({ roomCode: room_code });

	const r = await fetch(`/api/room/${room_code}`, {
		method: 'POST',
		body: JSON.stringify(newRoom)
	});

	if (!r.ok) {
		const response = await r.json();
		throw new APIError(r.status, response.message, response.detail);
	}

	const createdRoom: Room = await r.json();

	return createdRoom;
}

/**
 * Joins a user to a room using the provided room code.
 *
 * @param user - The user object containing user details.
 * @param room_code - The code of the room to join.
 * @returns A promise that resolves when the user has successfully joined the room.
 * @throws {APIError} If the request to join the room fails.
 */
export async function join_room(user: User, room_code: string): Promise<void> {
	const r = await fetch(`/api/room/${room_code}/join`, {
		method: 'PUT',
		body: JSON.stringify({ ...user })
	});

	if (!r.ok) {
		const response = await r.json();
		throw new APIError(r.status, response.message, response.detail);
	}
}

/**
 * Checks if a room with the given room code exists by making an API request.
 *
 * @param room_code - The code of the room to check.
 * @returns A promise that resolves to the room data if the room exists.
 * @throws {APIError} If the API request fails or the room does not exist.
 */

export async function get_room(room_code: string): Promise<Room> {
	const r = await fetch(`/api/room/${room_code}`, {
		method: 'GET'
	});

	if (r.status === 404) {
		return {} as Room;
	}

	const room: Room = await r.json();

	return room;
}

// TODO: die join Funktion kann man auch hier implementieren, da man den Room ja schon hat
export async function update_room(updatedRoom: Room): Promise<void> {
	const r = await fetch(`/api/room/${updatedRoom.id}`, {
		method: 'PUT',
		body: JSON.stringify(updatedRoom)
	});

	if (!r.ok) {
		const response = await r.json();
		throw new APIError(r.status, response.message, response.detail);
	}
}

export async function start_game(roomCode: string): Promise<void> {
	const room = await get_room(roomCode);
	if (!room) {
		throw new APIError(404, 'Room not found');
	}

	const usedSvgCodes = new Set<number>(JSON.parse(room.usedSvgCodes || '[]'));
	const currentSvgCode = getRandomSvgCode(room.category!, usedSvgCodes);

	const updatedRoom = createRoom({
		...room,
		currentRound: 1,
		currentSvgCode: currentSvgCode,
		currentTime: room.maxTime,
		isPlaying: true,
		isDrawing: true,
		usedSvgCodes: JSON.stringify(Array.from(usedSvgCodes))
	});

	await update_room(updatedRoom);

	roundTimer = await start_round_timer(roomCode, updatedRoom.maxTime!);
}

export async function end_game(roomCode: string): Promise<void> {
	const room = await get_room(roomCode);
	if (!room) {
		throw new APIError(404, 'Room not found');
	}

	// Find the player(s) with the most points
	let maxPoints = -1;
	let winnerIds: string[] = [];
	let winnerNames: string[] = [];
	for (const player of room.expand!.players!) {
		if (player.points > maxPoints) {
			maxPoints = player.points;
			winnerIds = [player.id];
			winnerNames = [player.username];
		} else if (player.points === maxPoints) {
			winnerIds.push(player.id);
		}
	}

	// Check if all players have 0 points
	if (maxPoints === 0) {
		winnerIds = [];
		winnerNames = [];
	}

	// Choose the first player with the highest points as the winner
	const winnerId = winnerIds.length > 0 ? winnerIds[0] : null;

	const updateUserPromises = room.expand!.players!.map(async (player) => {
		const updatedUser = createUser({
			...player,
			points: 0,
			gamesWon: player.id === winnerId ? player.gamesWon + 1 : player.gamesWon
		});
		return update_user(updatedUser);
	});

	await Promise.all(updateUserPromises);

	const updatedRoom = createRoom({
		...room,
		isPlaying: false,
		currentRound: 0,
		currentTime: 0,
		isDrawing: false,
		winnerName: winnerNames[0]
	});

	await update_room(updatedRoom);

	if (roundTimer) {
		stop_round_timer(roundTimer);
		roundTimer = null;
	}
}

async function end_round(roomCode: string) {
	if (roundTimer) {
		stop_round_timer(roundTimer);
		roundTimer = null;
	}

	const room = await get_room(roomCode);
	if (!room) {
		return;
	}

	const updatedRoom1 = createRoom({
		...room,
		isDrawing: false
	});

	await update_room(updatedRoom1);

	if (room.currentRound! >= room.maxRounds!) {
		await end_game(roomCode); // End game if the last round is over
		return;
	}

	if (room.currentRound! >= room.maxRounds!) {
		const updatedRoom2 = createRoom({
			...room,
			isPlaying: true,
			isDrawing: false
		});
		await update_room(updatedRoom2);
		return;
	}

	const usedSvgCodes = new Set<number>();
	const currentSvgCode = getRandomSvgCode(room.category!, usedSvgCodes);

	const updatedRoom3 = createRoom({
		...room,
		currentRound: room.currentRound! + 1,
		currentTime: room.maxTime,
		currentSvgCode: currentSvgCode,
		isDrawing: true,
		usedSvgCodes: JSON.stringify(Array.from(usedSvgCodes))
	});
	await update_room(updatedRoom3);

	roundTimer = await start_round_timer(roomCode, updatedRoom3.maxTime!);
}

async function start_round_timer(roomCode: string, duration: number): Promise<NodeJS.Timeout> {
	let timeLeft = duration;

	const timer = setInterval(async () => {
		timeLeft -= 1;

		const room = await get_room(roomCode);
		if (!room) {
			clearInterval(timer);
			return;
		}

		room.currentTime = timeLeft;
		await update_room(room);

		if (timeLeft <= 0) {
			clearInterval(timer);
			await end_round(roomCode);
		}
	}, 1000);

	return timer;
}

function stop_round_timer(timer: NodeJS.Timeout) {
	clearInterval(timer);
}

function getRandomSvgCode(category: number, usedSvgCodes: Set<number>): number {
	if (!svgCodesByCategory[category]) {
		throw new Error(`Category ${category} not found in svgCodesByCategory`);
	}

	let availableSvgCodes = Object.keys(svgCodesByCategory[category])
		.map(Number)
		.filter((code) => !usedSvgCodes.has(code));

	if (availableSvgCodes.length === 0) {
		usedSvgCodes.clear();
		availableSvgCodes = Object.keys(svgCodesByCategory[category]).map(Number);
	}

	const randomIndex = Math.floor(Math.random() * availableSvgCodes.length);
	const selectedCode = availableSvgCodes[randomIndex];
	usedSvgCodes.add(selectedCode);
	return selectedCode;
}
