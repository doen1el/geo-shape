import { APIError } from "$lib/util/api_util";
import { type Writable, writable } from "svelte/store";
import { createRoom, type Room } from "$lib/models/room";
import type { User } from "$lib/models/user";

/**
 * A writable store that holds the current room information.
 *
 * This store can either contain a `Room` object or `null` if no room is selected.
 *
 * @type {Writable<Room | null>}
 */
export const currentRoom: Writable<Room | null> = writable<Room | null>();

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
    method: "POST",
    body: JSON.stringify(newRoom),
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
    method: "PUT",
    body: JSON.stringify({ ...user }),
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
    method: "GET",
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
    method: "PUT",
    body: JSON.stringify(updatedRoom),
  });

  if (!r.ok) {
    const response = await r.json();
    throw new APIError(r.status, response.message, response.detail);
  }
}
