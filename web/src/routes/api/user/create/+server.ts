import { UserCreateSchema } from '$lib/models/api/user_schema';
import type { User } from '$lib/models/user';
import { pb } from '$lib/pocketbase';
import { handleError } from '$lib/util/api_util';
import { users } from '$lib/util/constants';
import { json, type RequestEvent } from '@sveltejs/kit';

/**
 * Handles the POST request to create a new user.
 *
 * @param event - The request event containing the user data.
 * @returns A promise that resolves to a Response object.
 * @throws Will throw an error if the user creation or authentication fails.
 */
export async function POST(event: RequestEvent): Promise<Response> {
	const data = await event.request.json();
	try {
		const safeData = UserCreateSchema.parse(data);

		const r = await pb.collection(users).create<User>(safeData);

		await authWithPassword(safeData.email!, data.password);

		return json(r);
	} catch (e: unknown) {
		throw handleError(e);
	}
}

/**
 * Authenticates a user with a email and password.
 *
 * @param email - The email of the user.
 * @param password - The password of the user.
 * @returns A promise that resolves when the authentication is complete.
 */
async function authWithPassword(email: string, password: string): Promise<void> {
	await pb.collection('users').authWithPassword(email, password);
}
