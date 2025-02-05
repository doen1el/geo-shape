import { APIError } from '$lib/util/api_util';
import { type Writable, writable } from 'svelte/store';
import { createRoom, type Room } from '$lib/models/room';
import type { User } from '$lib/models/user';

/**
 * A writable store that holds the current room information.
 *
 * This store can either contain a `Room` object or `null` if no room is selected.
 *
 * @type {Writable<Room | null>}
 */
export const currentRoom: Writable<Room | null> = writable<Room | null>();

let roundTimer: NodeJS.Timeout | null = null;

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

	console.log('Starting game in room', room);

	const updatedRoom = createRoom({
		...room,
		currentRound: 1,
		currentSvgCode: 0,
		currentTime: room.maxTime,
		isPlaying: true
	});

	await update_room(updatedRoom);

	roundTimer = await start_round_timer(roomCode, updatedRoom.maxTime!);
}

export async function end_game(roomCode: string): Promise<void> {
	const room = await get_room(roomCode);
	if (!room) {
		throw new APIError(404, 'Room not found');
	}

	const updatedRoom = createRoom({
		...room,
		isPlaying: false,
		currentRound: 0,
		currentTime: 0
	});

	await update_room(updatedRoom);

	if (roundTimer) {
		stop_round_timer(roundTimer);
		roundTimer = null;
	}
}

async function end_round(roomCode: string) {
	const room = await get_room(roomCode);
	if (!room) {
		return;
	}

	if (room.currentRound! >= room.maxRounds!) {
		const updatedRoom = createRoom({
			...room,
			isPlaying: false
		});
		await update_room(updatedRoom);
		return;
	}

	const updatedRoom = createRoom({
		...room,
		currentRound: room.currentRound! + 1,
		currentTime: room.maxTime
	});
	await update_room(updatedRoom);

	roundTimer = await start_round_timer(roomCode, updatedRoom.maxTime!);
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
