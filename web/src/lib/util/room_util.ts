import { get_room } from "$lib/stores/room_store";

/**
 * Generates a unique room code.
 * @returns {Promise<string>} A promise that resolves to a unique room code.
 */
export async function generateUniqueRoomCode(): Promise<string> {
  let room_code: string;
  let exists: boolean = false;

  do {
    room_code = Math.random().toString(36).substring(2, 7).toUpperCase();

    const room = await get_room(room_code);
    if (Object.keys(room).length != 0) {
      exists = true;
    }
  } while (exists);

  return room_code;
}
