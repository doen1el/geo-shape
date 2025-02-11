import { APIError } from '$lib/util/api_util';
import { type Writable, writable } from 'svelte/store';
import { createProfile, type Profile } from '$lib/models/profile';
import type { User } from '$lib/models/user';

export const currentProfile: Writable<Profile | null> = writable<Profile | null>();

export async function create_profile(user: User, isAdmin: boolean = false): Promise<Profile> {
	const newProfile = createProfile({ user: user.id, isAdmin: isAdmin });

	const r = await fetch(`/api/profile`, {
		method: 'POST',
		body: JSON.stringify(newProfile)
	});

	if (!r.ok) {
		const response = await r.json();
		throw new APIError(r.status, response.message, response.detail);
	}

	const createdProfile: Profile = await r.json();

	currentProfile.set(createdProfile);

	return createdProfile;
}

export async function get_profile(user: User): Promise<Profile> {
	const r = await fetch(`/api/profile/${user.id}`, {
		method: 'GET'
	});

	const profile: Profile = await r.json();

	currentProfile.set(profile);

	return profile;
}

export async function update_profile(updatedProfile: Profile): Promise<void> {
	const r = await fetch(`/api/profile/${updatedProfile.id}`, {
		method: 'PUT',
		body: JSON.stringify(updatedProfile)
	});

	if (!r.ok) {
		const response = await r.json();
		throw new APIError(r.status, response.message, response.detail);
	}
}
