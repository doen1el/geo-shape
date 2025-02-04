import { pb } from "$lib/pocketbase";
import { handleError } from "$lib/util/api_util";
import { users } from "$lib/util/constants";
import { json, type RequestEvent } from "@sveltejs/kit";

export async function GET(event: RequestEvent): Promise<Response> {
  try {
    const r = await pb.collection(users).getFirstListItem(
      `username="${event.params.username}"`,
    );
    return json(r);
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("Not found")) {
      // Return an empty response if the room does not exist
      return new Response(null, { status: 200 });
    }
    throw handleError(e);
  }
}
