/* eslint-disable no-useless-escape */
import { z, ZodType } from 'zod';
import type { User } from '../user';

/**
 * Schema for creating a user.
 *
 * This schema validates the following fields:
 * - `username`: Optional string, must be at least 3 characters long, and can contain alphanumeric characters and dots.
 * - `password`: Optional string, must be at least 8 characters long.
 * - `passwordConfirm`: Optional string, must be at least 8 characters long and must match the `password` field.
 *
 * The schema ensures that if `password` and `passwordConfirm` are provided, they must match.
 *
 * @type {ZodType<Partial<User>>}
 */
const UserCreateSchema: ZodType<Partial<User>> = (
	z.object({
		username: z
			.string({ message: 'required' })
			.min(1, 'must-be-at-least-n-characters-long')
			.regex(/^[\w][\w\.]*$/, 'invalid-username'),
		password: z.string().min(8, 'must-be-at-least-n-characters-long'),
		passwordConfirm: z.string().min(8, 'must-be-at-least-n-characters-long'),
		isAdmin: z.boolean().optional()
	}) satisfies ZodType<Partial<User>>
).refine((data) => data.password === data.passwordConfirm, {
	message: 'passwords-must-match',
	path: ['passwordConfirm']
});

/**
 * Schema for updating user information.
 *
 * This schema validates the following fields:
 * - `username`: Optional string, must be at least 3 characters long, and can contain alphanumeric characters and dots.
 * - `email`: Optional string, must be a valid email address.
 * - `password`: Optional string, must be at least 8 characters long.
 * - `oldPassword`: Optional string, must be at least 8 characters long.
 * - `passwordConfirm`: Optional string, must be at least 8 characters long and must match the `password` field.
 *
 * The schema ensures that if `password` and `passwordConfirm` are provided, they must match.
 *
 * @type {ZodType<Partial<User>>}
 */
const UserUpdateSchema: ZodType<Partial<User>> = (
	z.object({
		username: z
			.string({ message: 'required' })
			.min(3, 'must-be-at-least-n-characters-long')
			.regex(/^[\w][\w\.]*$/, 'invalid-username')
			.optional(),
		email: z.string({ message: 'required' }).email('not-a-valid-email-address').optional(),
		password: z.string().min(8, 'must-be-at-least-n-characters-long').optional(),
		oldPassword: z.string().min(8, 'must-be-at-least-n-characters-long').optional(),
		passwordConfirm: z.string().min(8, 'must-be-at-least-n-characters-long').optional()
	}) satisfies ZodType<Partial<User>>
).refine((data) => data.password === data.passwordConfirm, {
	message: 'passwords-must-match',
	path: ['passwordConfirm']
});

export { UserCreateSchema, UserUpdateSchema };
