import { RecordIdSchema } from '$lib/models/api/base_schema';
import { RoomCreateSchema } from '$lib/models/api/room_schema';
import type { Room } from '$lib/models/room';
import { pb } from '$lib/pocketbase';
import { handleError } from '$lib/util/api_util';
import { rooms } from '$lib/util/constants';
import { json, type RequestEvent } from '@sveltejs/kit';

/**
 * Handles the GET request to retrieve a room by its room code.
 *
 * @param {RequestEvent} event - The request event containing the room code in the parameters.
 * @returns {Promise<Response>} - A promise that resolves to a Response object containing the room data.
 * @throws Will throw an error if the room cannot be retrieved.
 */
export async function GET(event: RequestEvent): Promise<Response> {
	try {
		const r = await pb.collection('rooms').getFirstListItem(`roomCode="${event.params.id}"`, {
			expand: 'players,messages,messages.user,players.user'
		});
		return json(r);
	} catch (e: unknown) {
		if (e instanceof Error && e.message.includes('Not found')) {
			// Return an empty response if the room does not exist
			return new Response(null, { status: 200 });
		}
		throw handleError(e);
	}
}

/**
 * Handles the POST request to update a room in the PocketBase collection.
 *
 * @param {RequestEvent} event - The request event containing the request and parameters.
 * @returns {Promise<Response>} - A promise that resolves to a JSON response containing the updated room data.
 * @throws {Error} - Throws an error if the request fails validation or if there is an issue with the PocketBase update.
 */
export async function POST(event: RequestEvent): Promise<Response> {
	const data = await event.request.json();
	try {
		const safeData = RoomCreateSchema.parse(data);

		const r = await pb.collection(rooms).create<Room>(safeData);

		return json(r);
	} catch (e: unknown) {
		throw handleError(e);
	}
}

/**
 * Handles the PUT request to update a room.
 *
 * @param event - The request event containing the request and parameters.
 * @returns A promise that resolves to a Response object.
 * @throws Will throw an error if the update operation fails.
 */
export async function PUT(event: RequestEvent): Promise<Response> {
	const data = await event.request.json();
	try {
		const params = event.params;
		const safeParams = RecordIdSchema.parse(params);
		// const safeData = RoomUpdatechema.parse(data);

		const r = await pb.collection(rooms).update<Room>(safeParams.id, data);

		return json(r);
	} catch (e: unknown) {
		throw handleError(e);
	}
}
