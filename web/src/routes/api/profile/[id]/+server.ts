import { RecordIdSchema } from '$lib/models/api/base_schema';
import { ProfileUpdateSchema } from '$lib/models/api/profile_schema';
import type { Profile } from '$lib/models/profile';
import { pb } from '$lib/pocketbase';
import { handleError } from '$lib/util/api_util';
import { profiles } from '$lib/util/constants';
import { json, type RequestEvent } from '@sveltejs/kit';

export async function PUT(event: RequestEvent): Promise<Response> {
	const data = await event.request.json();
	try {
		const params = event.params;
		const safeParams = RecordIdSchema.parse(params);
		const safeData = ProfileUpdateSchema.parse(data);

		const r = await pb.collection(profiles).update<Profile>(safeParams.id, safeData);

		return json(r);
	} catch (e: unknown) {
		throw handleError(e);
	}
}

export async function GET(event: RequestEvent): Promise<Response> {
	try {
		const r = await pb.collection(profiles).getFirstListItem(`user="${event.params.id}"`, {
			expand: 'user'
		});
		return json(r);
	} catch (e: unknown) {
		throw handleError(e);
	}
}
