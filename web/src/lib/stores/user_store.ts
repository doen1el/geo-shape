import { pb } from '$lib/pocketbase';
import type { User } from '$lib/models/user';
import { APIError } from '$lib/util/api_util';
import { writable, type Writable } from 'svelte/store';

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
export async function user_create(username: string, is_admin: boolean = false): Promise<User> {
	if (pb.authStore.record && pb.authStore.record?.username == username) {
		return pb.authStore.record as User;
	}

	pb.authStore.clear();

	// since we only use throwaway user, we can just generate a random password
	const password = Math.random().toString(36).substring(2, 30);

	const user = {
		username: username,
		password: password,
		passwordConfirm: password,
		isAdmin: is_admin
	};

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

/**
 * Logs out the current user by clearing the authentication store.
 *
 * @returns {Promise<void>} A promise that resolves when the logout process is complete.
 */
export async function logOutPlayer(): Promise<void> {
	pb.authStore.clear();
}
