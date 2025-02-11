// +layout.ts
import type { ServerLoad } from '@sveltejs/kit';

export const load: ServerLoad = async () => {
	return { origin: 'https://geoshape.danielmuenstermann.de' };
};
