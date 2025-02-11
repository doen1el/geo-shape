import { ProfileCreateSchema } from '$lib/models/api/profile_schema';
import type { Profile } from '$lib/models/profile';
import { pb } from '$lib/pocketbase';
import { handleError } from '$lib/util/api_util';
import { profiles } from '$lib/util/constants';
import { json, type RequestEvent } from '@sveltejs/kit';

export async function POST(event: RequestEvent): Promise<Response> {
	const data = await event.request.json();
	try {
		const safeData = ProfileCreateSchema.parse(data);

		const r = await pb.collection(profiles).create<Profile>(safeData);

		return json(r);
	} catch (e: unknown) {
		throw handleError(e);
	}
}
