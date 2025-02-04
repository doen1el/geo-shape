import { MessageCreateSchema } from "$lib/models/api/message_schema";
import type { Message } from "$lib/models/message";
import { pb } from "$lib/pocketbase";
import { handleError } from "$lib/util/api_util";
import { messages } from "$lib/util/constants";
import { json, type RequestEvent } from "@sveltejs/kit";

/**
 * Handles the POST request to create a new message.
 *
 * @param {RequestEvent} event - The request event containing the request data.
 * @returns {Promise<Response>} - The response containing the created message or an error.
 * @throws Will throw an error if the message creation fails.
 */
export async function POST(event: RequestEvent): Promise<Response> {
  const data = await event.request.json();
  try {
    const safeData = MessageCreateSchema.parse(data);

    const r = await pb.collection(messages).create<Message>(safeData);

    return json(r);
  } catch (e: unknown) {
    throw handleError(e);
  }
}
