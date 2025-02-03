import { pb } from '$lib/pocketbase';
import { json, text, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

function csrf(allowedPaths: string[]): Handle {
	return async ({ event, resolve }) => {
		const { request, url } = event;
		const forbidden =
			isFormContentType(request) &&
			(request.method === 'POST' ||
				request.method === 'PUT' ||
				request.method === 'PATCH' ||
				request.method === 'DELETE') &&
			request.headers.get('origin') !== url.origin &&
			!allowedPaths.some((p) => url.pathname.startsWith(p));

		if (forbidden) {
			const message = `Cross-site ${request.method} form submissions are forbidden`;
			if (request.headers.get('accept') === 'application/json') {
				return json({ message }, { status: 403 });
			}
			return text(message, { status: 403 });
		}

		return resolve(event);
	};
}

function isContentType(request: Request, ...types: string[]) {
	const type = request.headers.get('content-type')?.split(';', 1)[0].trim() ?? '';
	return types.includes(type.toLowerCase());
}
function isFormContentType(request: Request) {
	return isContentType(
		request,
		'application/x-www-form-urlencoded',
		'multipart/form-data',
		'text/plain'
	);
}

const auth: Handle = async ({ event, resolve }) => {
	// load the store data from the request cookie string
	pb.authStore.loadFromCookie(event.request.headers.get('cookie') || '');

	try {
		// get an up-to-date auth store state by verifying and refreshing the loaded auth model (if any)
		if (pb.authStore.isValid) {
			await pb.collection('users').authRefresh();
		}
	} catch {
		// clear the auth store on failed refresh
		pb.authStore.clear();
	}

	const response = await resolve(event);

	// send back the default 'pb_auth' cookie to the client with the latest store state
	response.headers.set(
		'set-cookie',
		pb.authStore.exportToCookie({ httpOnly: false, secure: event.url.protocol === 'https:' })
	);

	return response;
};

export const handle = sequence(csrf(['/api']), auth);
