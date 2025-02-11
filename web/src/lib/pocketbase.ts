import { PUBLIC_POCKETBASE_URL } from '$env/static/public';
import PocketBase from 'pocketbase';

export function createInstance() {
	console.log('PUBLIC_POCKETBASE_URL:', PUBLIC_POCKETBASE_URL);
	return new PocketBase(PUBLIC_POCKETBASE_URL);
}

export const pb = createInstance();
pb.autoCancellation(false);
