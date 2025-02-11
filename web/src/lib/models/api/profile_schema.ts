import { z, ZodType } from 'zod';
import type { Profile } from '../profile';

const ProfileCreateSchema: ZodType<Partial<Profile>> = z.object({
	isAdmin: z.boolean().optional().default(false),
	points: z.number().int().optional(),
	gamesWon: z.number().int().optional(),
	user: z.string({ message: 'required' })
}) satisfies ZodType<Partial<Profile>>;

const ProfileUpdateSchema: ZodType<Partial<Profile>> = z.object({
	isAdmin: z.boolean().optional().default(false),
	points: z.number().int().optional(),
	gamesWon: z.number().int().optional(),
	user: z.string({ message: 'required' })
}) satisfies ZodType<Partial<Profile>>;

export { ProfileCreateSchema, ProfileUpdateSchema };
