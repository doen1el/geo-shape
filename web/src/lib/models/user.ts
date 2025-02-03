/**
 * Represents a user in the system.
 *
 * @property {string} id - The unique identifier for the user.
 * @property {string} username - The username of the user.
 * @property {number} points - The points accumulated by the user.
 * @property {boolean} isAdmin - Indicates whether the user has administrative privileges.
 * @property {string} [created] - The optional date when the user was created.
 */
export type User = {
	collectionId: string;
	collectionName: string;
	id: string;
	username: string;
	points: number;
	isAdmin: boolean;
	created?: string;
};
