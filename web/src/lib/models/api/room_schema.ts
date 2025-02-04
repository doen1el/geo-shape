/* eslint-disable no-useless-escape */
import { z, ZodType } from "zod";
import type { Room } from "../room";

/**
 * Schema for creating a room.
 *
 * This schema validates the following properties:
 * - `roomCode`: A string that is required, must be at least 5 characters long,
 *   and must match the regex pattern `/^[\w][\w\.]*$/` which allows alphanumeric
 *   characters and periods, but must start with an alphanumeric character.
 *
 * Validation messages:
 * - If `roomCode` is missing, the message 'required' will be shown.
 * - If `roomCode` is less than 5 characters, the message 'must-be-5-characters-long' will be shown.
 * - If `roomCode` does not match the regex pattern, the message 'invalid-room-code' will be shown.
 *
 * This schema satisfies the `ZodType<Partial<Room>>` type.
 */
const RoomCreateSchema = z.object({
  roomCode: z
    .string({ message: "required" })
    .min(5, "must-be-5-characters-long")
    .regex(/^[\w][\w\.]*$/, "invalid-room-code"),
  maxRounds: z.number(),
  maxTime: z.number(),
}) satisfies ZodType<Partial<Room>>;

// const RoomUpdatechema = z.object({
// 	roomCode: z
// 		.string({ message: 'required' })
// 		.min(5, 'must-be-5-characters-long')
// 		.regex(/^[\w][\w\.]*$/, 'invalid-room-code'),
// 	players: z.array(z.object({
// 		id: z.string(),
// 		name: z.string()
// 	})),
// 	messages: z.array(z.string()),
// 	currentRound: z.number(),
// 	maxRounds: z.number(),
// 	currentSvgCode: z.string(),
// 	currentTime: z.number(),
// 	maxTime: z.number(),
// 	isPlaying: z.boolean()
// }) satisfies ZodType<Partial<Room>>;

export { RoomCreateSchema };
