import type { User } from './user';

export type Profile = {
	id: string;
	user: string;
	isAdmin: boolean;
	points: number;
	gamesWon: number;
	created: string;
	updated: string;
	expand?: {
		user: User;
	};
};

export function createProfile(overrides: Partial<Profile> = {}): Profile {
	return {
		id: '',
		user: '',
		isAdmin: false,
		points: 0,
		gamesWon: 0,
		created: new Date().toISOString(),
		updated: new Date().toISOString(),
		...overrides
	};
}
