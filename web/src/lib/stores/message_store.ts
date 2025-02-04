import { type Writable, writable } from "svelte/store";
import { createMessage, type Message } from "$lib/models/message";
import { APIError } from "$lib/util/api_util";
import type { User } from "$lib/models/user";

/**
 * A writable store that holds the current message.
 *
 * This store can contain a `Message` object or `null` if there is no current message.
 *
 * @type {Writable<Message | null>}
 */
export const currentMessage: Writable<Message | null> = writable<
  Message | null
>();

export async function message_create(
  user: User,
  text: string,
): Promise<Message> {
  const message = createMessage({ text: text, user: user.id });

  const r = await fetch(`/api/message`, {
    method: "POST",
    body: JSON.stringify(message),
  });

  if (!r.ok) {
    const response = await r.json();
    throw new APIError(r.status, response.message, response.detail);
  }

  const createdMessage: Message = await r.json();

  return createdMessage;
}
