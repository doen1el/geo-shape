import { goto } from "$app/navigation";
import { messages, rooms, users } from "./util/constants";
import { pb } from "./pocketbase";

/**
 * Represents a message in the chat.
 */
export interface Message {
  id: string;
  user: string;
  text: string;
}

/**
 * Represents a user in the game.
 */
export interface User {
  id: string;
  username: string;
  points: number;
  isAdmin: boolean;
}

/**
 * Map of umlaut characters to their corresponding replacements.
 */
const umlautMap: { [key: string]: string } = {
  "\u00dc": "UE",
  "\u00c4": "AE",
  "\u00d6": "OE",
  "\u00fc": "ue",
  "\u00e4": "ae",
  "\u00f6": "oe",
  "\u00df": "ss",
};

/**
 * Map of umlaut characters to their corresponding replacements.
 */
export const convertAnswertToCountryCode: { [key: string]: string } = {
  "nordrhein-westfalen": "nw",
  niedersachsen: "ni",
  bremen: "hb",
  hamburg: "hh",
  "schleswig-holstein": "sh",
  "mecklenburg-vorpommern ": "mv",
  brandenburg: "bb",
};

/**
 * Replaces umlaut characters in a string with their corresponding non-umlaut characters.
 * @param str - The input string.
 * @returns The string with umlaut characters replaced.
 */
export function replaceUmlaute(str: string): string {
  return str
    .replace(/[\u00dc|\u00c4|\u00d6][a-z]/g, (a) => {
      const big = umlautMap[a.slice(0, 1)];
      return big.charAt(0) + big.charAt(1).toLowerCase() + a.slice(1);
    })
    .replace(
      new RegExp("[" + Object.keys(umlautMap).join("|") + "]", "g"),
      (a) => umlautMap[a],
    );
}

/**
 * Creates a user with the given username and room code.
 * @param isCreatingRoom - Indicates whether the user is creating a room.
 * @param username - The username of the user.
 * @param roomCode - The room code associated with the user.
 * @returns {Promise<void>} A Promise that resolves to void.
 */
export async function createUser(
  isCreatingRoom: boolean,
  username: string,
  roomCode: string,
): Promise<void> {
  try {
    // Replace umlaute in username
    const sanitizedUsername = replaceUmlaute(username);

    // Generate a random password
    const password = Math.random().toString(36).substring(2, 30);

    const userData = {
      username: sanitizedUsername,
      password,
      passwordConfirm: password,
      isAdmin: isCreatingRoom ? true : false,
    };

    // Create user in poketbase collection
    const user = await pb.collection(users).create(userData);

    // Login in the newly created user
    await loginUser(
      sanitizedUsername,
      password,
      isCreatingRoom,
      roomCode,
      user.id,
    );
  } catch (err) {
    console.error(`CreateUser: ${err}`);
  }
}

/**
 * Logs in a user and performs additional actions based on the provided parameters.
 * If `isCreatingRoom` is true, it creates a room and joins it. Otherwise, it joins an existing room.
 *
 * @param username - The username of the user.
 * @param password - The password of the user.
 * @param isCreatingRoom - A boolean indicating whether the user is creating a room.
 * @param roomCode - The code of the room to create or join.
 * @param userId - The ID of the user.
 * @returns {Promise<void>} A Promise that resolves when the login and additional actions are completed.
 */
async function loginUser(
  username: string,
  password: string,
  isCreatingRoom: boolean,
  roomCode: string,
  userId: string,
): Promise<void> {
  try {
    // Login user in pocketbase
    await pb.collection(users).authWithPassword(username, password);

    // If the user is creating a room, create a room and join else join the room
    if (isCreatingRoom) {
      await createRoom(roomCode, userId);
    } else {
      await joinRoom(roomCode, userId);
    }
  } catch (err) {
    console.error(`LoginUser: ${err}`);
  }
}

/**
 * Joins a room with the provided room code and adds the current user to the room.
 * @param roomCode - The code of the room to join.
 * @param userId - The ID of the current user.
 * @returns {Promise<void>} A Promise that resolves to void.
 */
async function joinRoom(roomCode: string, userId: string): Promise<void> {
  try {
    let currentPlayers: Array<string> = [];

    //Get the room with the provided room code
    const room = await pb.collection(rooms).getList(1, 1, {
      filter: `roomCode = "${roomCode}"`,
    });

    // If the room exists, add the current user to the room
    if (room.items.length > 0) {
      currentPlayers = room.items[0].players;
      // prevent null user

      currentPlayers.push(userId);
    } else {
      console.error(`No room found with ${roomCode}!`);
    }

    const playerData = {
      players: currentPlayers,
    };

    // Update the room with the new player
    await pb.collection(rooms).update(room.items[0].id, playerData);

    // Redirect to the game page
    goto(`/game/${roomCode}`);
  } catch (err) {
    console.error(`JoinRoom: ${err}`);
  }
}

/**
 * Creates a new room with the given room code and adds the specified user as a player.
 * @param roomCode - The code for the new room.
 * @param userId - The ID of the user to add as a player.
 * @returns {Promise<void>} A Promise that resolves when the room is successfully created.
 */
async function createRoom(roomCode: string, userId: string): Promise<void> {
  try {
    await pb.collection(rooms).create({
      roomCode,
      players: [userId],
      maxRounds: 5,
      maxTime: 120,
    });

    goto(`/game/${roomCode}`);
  } catch (err) {
    console.error(`CreateRoom: ${err}`);
  }
}

/**
 * Checks if a room exists with the given room code.
 * @param roomCode - The room code to check.
 * @returns {Promise<boolean>} A promise that resolves when the room existence is checked.
 */
export async function checkIfRoomExists(roomCode: string): Promise<boolean> {
  try {
    // Get the room with the provided room code
    const currentRoom = await pb.collection(rooms).getList(1, 1, {
      filter: `roomCode = "${roomCode}"`,
    });

    // Set roomExists to true if the room exists
    return currentRoom.items.length > 0;
  } catch {
    return false;
  }
}

/**
 * Sends a new message to a room.
 *
 * @param newMessage - The new message to send.
 * @param userId - The ID of the user sending the message.
 * @param currentMessagesIds - The array of current message IDs in the room.
 * @param roomId - The ID of the room where the message is being sent.
 * @returns A Promise that resolves when the message is sent.
 */
export async function sendMessage(
  newMessage: string,
  userId: string,
  currentMessagesIds: Array<string>,
  roomId: string,
) {
  if (newMessage.trim() === "") return;

  const message = await pb.collection(messages).create({
    text: newMessage,
    user: userId,
  });

  pb.collection(rooms).update(roomId, {
    messages: [...currentMessagesIds, message.id],
  });
}

/**
 * Logs out a player by deleting their user data and clearing the authentication store.
 * @param userId - The ID of the user to log out.
 * @returns A promise that resolves once the player is logged out.
 */
export async function logOutPlayer(userId: string) {
  pb.collection(users).delete(userId);

  pb.authStore.clear();
}

/**
 * Checks if a user is an admin.
 *
 * @param userId - The ID of the user to check.
 * @returns A promise that resolves to a boolean indicating whether the user is an admin.
 */
export async function checkIfUserIsAdmin(userId: string): Promise<boolean> {
  const user = await pb.collection(users).getOne(userId);
  return user.isAdmin;
}

/**
 * Updates the maximum number of rounds for a room.
 *
 * @param roomCode - The code of the room.
 * @param maxRounds - The new maximum number of rounds.
 * @returns {Promise<void>} - A promise that resolves when the update is complete.
 */
export async function updateRoomMaxRounds(
  roomCode: string,
  maxRounds: number,
): Promise<void> {
  const room = await pb.collection(rooms).getList(1, 1, {
    filter: `roomCode = "${roomCode}"`,
  });

  if (room.items.length > 0) {
    room.items[0].maxRounds = maxRounds;
    await pb.collection(rooms).update(room.items[0].id, room.items[0]);
  } else {
    console.error(`No room found with ${roomCode}!`);
  }
}

/**
 * Updates the maximum time for a room.
 *
 * @param roomCode - The code of the room.
 * @param maxTime - The new maximum time for the room.
 * @returns A promise that resolves with void.
 */
export async function updateRoomMaxTime(
  roomCode: string,
  maxTime: number,
): Promise<void> {
  const room = await pb.collection(rooms).getList(1, 1, {
    filter: `roomCode = "${roomCode}"`,
  });

  if (room.items.length > 0) {
    room.items[0].maxTime = maxTime;
    await pb.collection(rooms).update(room.items[0].id, room.items[0]);
  } else {
    console.error(`No room found with ${roomCode}!`);
  }
}

/**
 * Starts the game for a specific room.
 *
 * @param roomCode - The code of the room to start the game for.
 * @returns A promise that resolves when the game has started.
 */
export async function startGame(roomCode: string) {
  const room = await pb.collection(rooms).getList(1, 1, {
    filter: `roomCode = "${roomCode}"`,
  });

  if (room.items.length > 0) {
    room.items[0].isPlaying = true;
    await pb.collection(rooms).update(room.items[0].id, room.items[0]);
  } else {
    console.error(`No room found with ${roomCode}!`);
  }
}

/**
 * Ends the game for a specific room.
 *
 * @param roomCode - The code of the room.
 * @returns Promise<void>
 */
export async function endGame(roomCode: string) {
  const room = await pb.collection(rooms).getList(1, 1, {
    filter: `roomCode = "${roomCode}"`,
  });

  if (room.items.length > 0) {
    room.items[0].isPlaying = false;
    await pb.collection(rooms).update(room.items[0].id, room.items[0]);
  } else {
    console.error(`No room found with ${roomCode}!`);
  }
}
