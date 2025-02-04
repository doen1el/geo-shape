/* eslint-disable @typescript-eslint/no-explicit-any */
import { error, type NumericRange, type RequestEvent } from "@sveltejs/kit";
import { ClientResponseError } from "pocketbase";
import { pb } from "$lib/pocketbase";
import { ZodError } from "zod";
import { RecordIdSchema } from "$lib/models/api/base_schema";

export class APIError extends Error {
  status: number;
  message: string;
  detail: unknown;

  constructor(status: number, message: string, detail?: unknown) {
    super();
    this.status = status;
    this.message = message;
    this.detail = detail;
  }
}

export enum Collection {
  users = "users",
  messages = "messages",
  rooms = "rooms",
}

export async function remove(event: RequestEvent, collection: Collection) {
  const params = event.params;
  const safeParams = RecordIdSchema.parse(params);

  const r = await pb.collection(Collection[collection]).delete(safeParams.id);

  return { acknowledged: r };
}

/**
 * Handles different types of errors and returns appropriate HTTP error responses.
 *
 * @param e - The error object to handle. It can be of various types such as ZodError, ClientResponseError, SyntaxError, or any other error.
 * @returns An HTTP error response with the appropriate status code and error message.
 *
 * - If the error is an instance of ZodError, it returns a 400 status with 'invalid_params' message and the error details.
 * - If the error is an instance of ClientResponseError with a status greater than 0, it returns the status code and the error message with original error data.
 * - If the error is an instance of SyntaxError, it returns a 400 status with 'invalid_json' message.
 * - For any other type of error, it returns a 500 status with the error's string representation.
 */
export function handleError(e: any) {
  if (e instanceof ZodError) {
    return error(400, { message: "invalid_params", detail: e.issues } as any);
  } else if (e instanceof ClientResponseError && e.status > 0) {
    return error(
      e.status as NumericRange<400, 599>,
      { message: e.message, detail: e.originalError.data } as any,
    );
  } else if (e instanceof SyntaxError) {
    return error(400, "invalid_json");
  } else {
    return error(500, e.toString());
  }
}
