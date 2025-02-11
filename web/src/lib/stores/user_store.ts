import { pb } from '$lib/pocketbase';
import { createUser, type User } from '$lib/models/user';
import { APIError } from '$lib/util/api_util';
import { type Writable, writable } from 'svelte/store';
import { create_profile } from './profile_store';

/**
 * A writable store that holds the current user information.
 *
 * This store can either contain a `User` object or `null` if no user is logged in.
 *
 * @type {Writable<User | null>}
 */
export const currentUser: Writable<User | null> = writable<User | null>();

/**
 * Creates a new user with a randomly generated password.
 *
 * @param username - The username for the new user.
 * @returns A promise that resolves to the created user object.
 * @throws {APIError} If the API request fails.
 */
export async function create_user(username: string, isAdmin: boolean = false): Promise<User> {
	if (pb.authStore.record && pb.authStore.record?.username == username) {
		return pb.authStore.record as User;
	}

	pb.authStore.clear();

	// since we only use throwaway user, we can just generate a random password
	const password = Math.random().toString(36).substring(2, 30);

	const email = `${Math.random().toString(36).substring(2, 20)}@geoshape.com`;

	const user = createUser({
		username: username,
		password: password,
		passwordConfirm: password,
		email: email
	});

	const r = await fetch('/api/user/create', {
		method: 'POST',
		body: JSON.stringify(user)
	});

	if (!r.ok) {
		const response = await r.json();
		throw new APIError(r.status, response.message, response.detail);
	}

	const createdUser: User = await r.json();

	pb.authStore.loadFromCookie(document.cookie);

	await create_profile(createdUser, isAdmin);

	return createdUser;
}

export async function get_user(username: string): Promise<User> {
	const r = await fetch(`/api/user/username/${username}`, {
		method: 'GET'
	});

	if (r.status === 404) {
		return {} as User;
	}

	const room: User = await r.json();

	return room;
}

export async function update_user(updatedUser: User): Promise<void> {
	const r = await fetch(`/api/user/${updatedUser.id}`, {
		method: 'PUT',
		body: JSON.stringify(updatedUser)
	});

	if (!r.ok) {
		const response = await r.json();
		throw new APIError(r.status, response.message, response.detail);
	}
}

/**
 * Logs out the current user by clearing the authentication store.
 *
 * @returns {Promise<void>} A promise that resolves when the logout process is complete.
 */
export async function logOutPlayer(): Promise<void> {
	pb.authStore.clear();
}
