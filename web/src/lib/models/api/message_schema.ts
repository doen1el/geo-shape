/* eslint-disable no-useless-escape */
import { z, ZodType } from 'zod';
import type { Message } from '../message';

/**
 * Schema for creating a message.
 *
 * This schema validates the following properties:
 * - `text`: A string that is required, must be at least 5 characters long,
 *   and must match the regex pattern `/^[\w][\w\.]*$/` which allows alphanumeric
 *   characters and dots, but must start with an alphanumeric character.
 *
 * Error messages:
 * - If `text` is not provided, the error message will be 'required'.
 * - If `text` is less than 1 characters long, the error message will be 'must-be-1-characters-long'.
 * - If `text` does not match the regex pattern, the error message will be 'invalid-message'.
 */
const MessageCreateSchema = z.object({
	text: z
		.string({ message: 'required' })
		.min(1, 'must-be-1-characters-long')
		.regex(/^[\w][\w\.]*$/, 'invalid-message'),
	user: z.string().length(15)
}) satisfies ZodType<Partial<Message>>;

export { MessageCreateSchema };
