import { RecordIdSchema } from '$lib/models/api/base_schema';
import type { User } from '$lib/models/user';
import { pb } from '$lib/pocketbase';
import { handleError } from '$lib/util/api_util';
import { users } from '$lib/util/constants';
import { json, type RequestEvent } from '@sveltejs/kit';

export async function PUT(event: RequestEvent): Promise<Response> {
	const data = await event.request.json();
	try {
		const params = event.params;
		const safeParams = RecordIdSchema.parse(params);
		//const safeData = UserUpdateSchema.parse(data);

		const r = await pb.collection(users).update<User>(safeParams.id, data);

		return json(r);
	} catch (e: unknown) {
		throw handleError(e);
	}
}
