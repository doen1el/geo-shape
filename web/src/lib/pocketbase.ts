import PocketBase from 'pocketbase';

export function createInstance() {
	console.log('PUBLIC_POCKETBASE_URL:', 'https://geoshape.danielmuenstermann.de/api');
	return new PocketBase('https://geoshape.danielmuenstermann.de/api');
}

export const pb = createInstance();
pb.autoCancellation(false);
