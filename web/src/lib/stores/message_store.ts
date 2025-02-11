import { type Writable, writable } from 'svelte/store';
import { createMessage, type Message } from '$lib/models/message';
import { APIError } from '$lib/util/api_util';
import { type User } from '$lib/models/user';
import { correctAnswers } from '$lib/util/svg_utils/correctAnswers';
import { currentProfile, update_profile } from './profile_store';
import type { Room } from '$lib/models/room';
import { createProfile, type Profile } from '$lib/models/profile';

/**
 * A writable store that holds the current message.
 *
 * This store can contain a `Message` object or `null` if there is no current message.
 *
 * @type {Writable<Message | null>}
 */
export const currentMessage: Writable<Message | null> = writable<Message | null>();

export async function create_message(user: User, text: string): Promise<Message> {
	const message = createMessage({ text: text, user: user.id });

	const r = await fetch(`/api/message`, {
		method: 'POST',
		body: JSON.stringify(message)
	});

	if (!r.ok) {
		const response = await r.json();
		throw new APIError(r.status, response.message, response.detail);
	}

	const createdMessage: Message = await r.json();

	return createdMessage;
}

export async function checkIfMessageIsRightAnswer(
	room: Room,
	message: string,
	profile: Profile
): Promise<boolean> {
	if (room.isPlaying) {
		const anwers = correctAnswers[room.category!][room.currentSvgCode!];
		if (anwers.includes(message.toLowerCase())) {
			const updateProfile = createProfile({
				...profile,
				points: profile.points + 1
			});

			update_profile(updateProfile);

			currentProfile.set(updateProfile);

			return true;
		}
	}
	return false;
}
