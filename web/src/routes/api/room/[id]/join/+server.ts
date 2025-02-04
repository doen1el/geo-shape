import { RecordIdSchema } from "$lib/models/api/base_schema";
import type { Room } from "$lib/models/room";
import { pb } from "$lib/pocketbase";
import { handleError } from "$lib/util/api_util";
import { rooms } from "$lib/util/constants";
import { json, type RequestEvent } from "@sveltejs/kit";

/**
 * Handles the PUT request to join a room.
 *
 * @param event - The request event containing the request and parameters.
 * @returns A promise that resolves to a Response object.
 * @throws Will throw an error if the request fails or the parameters/data are invalid.
 */
export async function PUT(event: RequestEvent): Promise<Response> {
  const data = await event.request.json();
  try {
    const params = event.params;
    const safeParams = RecordIdSchema.parse(params);
    const safeData = RecordIdSchema.parse(data);

    const current_room = await pb.collection(rooms).getOne(safeParams.id);

    const r = await pb.collection(rooms).update<Room>(safeParams.id, {
      players: [...current_room.players, safeData.id],
    });

    return json(r);
  } catch (e: unknown) {
    throw handleError(e);
  }
}
