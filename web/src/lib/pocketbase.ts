import PocketBase from 'pocketbase';

export function createInstance() {
	console.log('PUBLIC_POCKETBASE_URL:', 'https://geoshape.danielmuenstermann.de/pb');
	return new PocketBase('https://geoshape.danielmuenstermann.de/pb');
}

export const pb = createInstance();
pb.autoCancellation(false);
