import { io } from "socket.io-client";

const connectionOptions = {
	forceNew: true,
	reconnectionAttempts: "Infinity",
	timeout: 10000,
	transports: ["websocket"],
};

export const socket = io("http://localhost:5000", connectionOptions);
export let socketID = "";
socket.on("connect", () => {
	socketID = socket.id;
});
