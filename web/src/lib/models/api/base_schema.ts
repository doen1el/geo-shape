import { z } from 'zod';

/**
 * Schema for validating a record ID.
 *
 * This schema ensures that the `id` field is a string with a length of exactly 15 characters.
 *
 * @example
 * const validId = { id: "123456789012345" };
 * const result = RecordIdSchema.safeParse(validId);
 * console.log(result.success); // true
 *
 * @example
 * const invalidId = { id: "12345" };
 * const result = RecordIdSchema.safeParse(invalidId);
 * console.log(result.success); // false
 */
const RecordIdSchema = z.object({
	id: z.string().length(15)
});

export { RecordIdSchema };
