import PocketBase from 'pocketbase';

export function createInstance() {
	console.log('PUBLIC_POCKETBASE_URL:', 'https://db:8090');
	return new PocketBase('https://db:8090');
}

export const pb = createInstance();
pb.autoCancellation(false);
