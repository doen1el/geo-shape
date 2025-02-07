import type { User } from '$lib/models/user';
import { pb } from '$lib/pocketbase';
import { handleError } from '$lib/util/api_util';

export async function DELETE() {
	try {
		const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

		const usersToDelete = await pb.collection('users').getFullList<User>({
			filter: `updated < "${twoHoursAgo}"`
		});

		const deletePromises = usersToDelete.map((u) => {
			return pb.collection('users').delete(u.id);
		});

		await Promise.all(deletePromises);
	} catch (e) {
		throw handleError(e);
	}
}
