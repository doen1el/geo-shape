const express = require("express");
const socketio = require("socket.io");
const http = require("http");
const cors = require("cors");
const {
	addUser,
	removeUser,
	getUser,
	getUsersInRoom,
	checkRoom,
	removeRoom,
} = require("./users");

const PORT = process.env.PORT || 5000;

const europe = [
	"Andorra",
	"Albanien",
	"Österreich",
	"Bosnien und Herzegowina",
	"Belarus",
	"Zypern",
];

const app = express();
const server = http.createServer(app);

const io = require("socket.io")(server, {
	cors: {
		origin: "http://localhost:3000",
		methods: ["GET", "POST"],
	},
});

app.use(cors());
app.use(express.json());

io.on("connection", (socket) => {
	socket.on("room_exists", (payload, callback) => {
		let roomExists = checkRoom(payload.roomCode);

		return callback(roomExists);
	});

	socket.on("join", (payload, callback) => {
		let numberOfUsersInRoom = getUsersInRoom(payload.room).length;

		const { error, newUser } = addUser({
			id: socket.id,
			name: payload.userName,
			room: payload.room,
			role: numberOfUsersInRoom === 0 ? "host" : "player",
			points: 0,
		});

		if (error) return callback(error);

		socket.join(newUser.room);

		io.to(newUser.room).emit("roomData", {
			room: newUser.room,
			users: getUsersInRoom(newUser.room),
		});
		socket.emit("currentUserData", { name: newUser.name, role: newUser.role });
		callback();
	});

	socket.on("sendMessage", (payload, callback) => {
		const user = getUser(socket.id);
		io.to(user.room).emit("message", {
			user: user.name,
			text: payload.message,
		});
		callback();
	});

	socket.on("initGameState", (payload) => {
		const user = getUser(socket.id);
		const svgNumber =
			payload.categorie === "europe"
				? Math.floor(Math.random() * europe.length)
				: 0;
		if (user) {
			io.to(user.room).emit("initGameState", {
				gameOver: payload.gameOver,
				maxRounds: payload.maxRounds,
				maxTime: payload.maxTime,
				categorie: payload.categorie,
				svgNumber: svgNumber,
				solution: payload.categorie === "europe" ? europe[svgNumber] : 0,
			});
			var users = getUsersInRoom(user.room);

			users.forEach((user) => {
				const player = getUser(user.id);
				player.points = 0;
			});

			io.to(user.room).emit("roomData", {
				users: getUsersInRoom(user.room),
			});
		}
	});

	socket.on("updateGameState", (payload) => {
		console.log(payload);
		const user = getUser(socket.id);
		if (user) {
			const svgNumber =
				payload.categorie === "europe"
					? Math.floor(Math.random() * europe.length)
					: 0;

			io.to(user.room).emit("updateGameState", {
				currentRound: payload.currentRound,
				categorie: payload.categorie,
				roundWon: payload.roundWon,
				winner: payload.winner,
				gameOver: payload.gameOver,
				svgNumber: svgNumber,
				solution: payload.categorie === "europe" ? europe[svgNumber] : 0,
				maxTime: payload.maxTime,
			});
			if (payload.roundWon) {
				user.points = user.points + 1;
			}
			io.to(user.room).emit("roomData", {
				users: getUsersInRoom(user.room),
			});
		}
	});

	socket.on("disconnect", () => {
		const user = removeUser(socket.id);
		if (user) {
			io.to(user.room).emit("roomData", {
				room: user.room,
				users: getUsersInRoom(user.room),
			});
			if (getUsersInRoom(user.room).length === 0) {
				removeRoom(user.room);
			}
		}
	});
});

server.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
