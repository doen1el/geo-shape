const users = [];
const rooms = [];

const addUser = ({ id, name, room, role, points }) => {
	const newUser = { id, name, room, role, points };
	users.push(newUser);

	if (!rooms.includes(newUser.room)) {
		rooms.push(newUser.room);
	}

	return { newUser };
};

const removeUser = (id) => {
	const removeIndex = users.findIndex((user) => user.id === id);

	if (removeIndex !== -1) return users.splice(removeIndex, 1)[0];
};

const removeRoom = (code) => {
	const removeIndex = rooms.findIndex((room) => room === code);

	if (removeIndex !== -1) return rooms.splice(removeIndex, 1)[0];
};

const getUser = (id) => {
	return users.find((user) => user.id === id);
};

const checkRoom = (code) => {
	return rooms.includes(code);
};

const getUsersInRoom = (room) => {
	return users.filter((user) => user.room === room);
};

module.exports = {
	addUser,
	removeUser,
	getUser,
	getUsersInRoom,
	checkRoom,
	removeRoom,
};
