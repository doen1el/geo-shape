// import { rooms } from '$lib/constants.js';
// import { pb } from '$lib/pocketbase.js';

// interface Player {
// 	id: string;
// 	username: string;
// 	points: number;
// 	isAdmin: boolean;
// }

// interface Message {
// 	id: string;
// 	user: string;
// 	text: string;
// }

// interface RoomInfo {
// 	id: string;
// 	roomCode: string;
// 	players: Array<Player>;
// 	messages: Array<Message>;
// 	currentRound: number;
// 	maxRounds: number;
// 	currentSvgCode: string;
// 	currentTime: number;
// 	maxTime: number;
// 	isPlaying: boolean;
// 	isDrawing: boolean;
// }

// /**
//  * Loads the data for a specific game room.
//  * @param {Object} params - The parameters for the request.
//  * @param {string} params.roomCode - The code of the game room.
//  * @returns {Promise<Object>} - A promise that resolves to an object containing the room code and the current players in the room.
//  */
// export async function load({ params }: { params: { roomCode: string } }): Promise<RoomInfo> {
// 	const roomInfo = await getRoomInfo(params.roomCode);

// 	if (roomInfo.id !== '') {
// 		return roomInfo;
// 	} else {
// 		return {
// 			id: '',
// 			roomCode: params.roomCode,
// 			players: [],
// 			messages: [],
// 			currentRound: 0,
// 			maxRounds: 0,
// 			currentSvgCode: '',
// 			currentTime: 0,
// 			maxTime: 0,
// 			isPlaying: false,
// 			isDrawing: false
// 		};
// 	}
// }

// /**
//  * Retrieves information about a room based on the provided room code.
//  * @param roomCode - The code of the room to retrieve information for.
//  * @returns A promise that resolves to a RoomInfo object containing the room information.
//  */
// async function getRoomInfo(roomCode: string): Promise<RoomInfo> {
// 	const room = await pb.collection(rooms).getList(1, 1, {
// 		expand: 'players, messages',
// 		filter: `roomCode = "${roomCode}"`
// 	});

// 	const currentPlayers: Array<Player> = room.items[0].expand?.players.map((player: Player) => ({
// 		id: player.id,
// 		username: player.username,
// 		points: player.points
// 	}));

// 	let currentMessages: Array<Message> = [];
// 	if (room.items[0].expand?.messages0) {
// 		currentMessages = room.items[0].expand?.messages.map((message: Message) => ({
// 			id: message.id,
// 			user: message.user,
// 			text: message.text
// 		}));
// 	}

// 	const roomObj: RoomInfo = {
// 		id: room.items[0].id,
// 		roomCode,
// 		players: currentPlayers,
// 		messages: currentMessages || [],
// 		currentRound: room.items[0].currentRound,
// 		maxRounds: room.items[0].maxRounds,
// 		currentSvgCode: room.items[0].currentSvgCode,
// 		currentTime: room.items[0].currentTime,
// 		maxTime: room.items[0].maxTime,
// 		isPlaying: room.items[0].isPlaying,
// 		isDrawing: room.items[0].isDrawing
// 	};

// 	return roomObj;
// }
