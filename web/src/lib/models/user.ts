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
  password: string;
  passwordConfirm: string;
  username: string;
  points: number;
  isAdmin: boolean;
  created?: string;
};

/**
 * Creates a new User with default values.
 *
 * @param {Partial<User>} [overrides] - Optional overrides for the default values.
 * @returns {User} - The new User object with default values.
 */
export function createUser(overrides: Partial<User> = {}): User {
  return {
    id: "",
    collectionId: "",
    collectionName: "",
    username: "",
    points: 0,
    password: "",
    passwordConfirm: "",
    isAdmin: false,
    created: new Date().toISOString(),
    ...overrides,
  };
}
