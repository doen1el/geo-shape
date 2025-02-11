import PocketBase from 'pocketbase';

export function createInstance() {
	console.log('PUBLIC_POCKETBASE_URL:', 'http://db:8090');
	return new PocketBase('http://db:8090');
}

export const pb = createInstance();
pb.autoCancellation(false);
