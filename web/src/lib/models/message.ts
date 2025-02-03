/**
 * Represents a message in the application.
 *
 * @typedef {Object} Message
 * @property {string} id - The unique identifier for the message.
 * @property {string} text - The content of the message.
 * @property {User} user - The user who created the message.
 * @property {string} [created] - The optional timestamp when the message was created.
 */
export type Message = {
	id: string;
	text: string;
	user: string;
	created?: string;
};
