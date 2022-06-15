import React from "react";
import { Box, Button, Center, Input, Space, Stack, Group } from "@mantine/core";
import { LetterCaseToggle, FaceId } from "tabler-icons-react";
import { useState, useEffect } from "react";
import randomCodeGenerator from "../utils/randomCodeGenerator";
import { socketID, socket } from "../utils/socket.js";
import Game from "./Game.js";

function Start() {
	const [roomCode, setRoomCode] = useState("");
	const [userName, setUserName] = useState("");
	const [submit, setSubmit] = useState(false);
	const [roomCodeExists, setRoomCodeExists] = useState(false);

	useEffect(() => {
		if (roomCode.length > 0)
			socket.emit("room_exists", { roomCode: roomCode }, (roomExists) => {
				if (roomExists) {
					setRoomCodeExists(true);
				} else {
					setRoomCodeExists(false);
				}
			});
	}, [roomCode]);

	return (
		<Box sx={{ maxWidth: 800 }} mx="auto">
			{submit ? (
				<Game roomCode={roomCode} userName={userName} />
			) : (
				<Center mt="xl">
					<Stack>
						<Input
							icon={<FaceId />}
							placeholder="your name"
							radius="xl"
							size="lg"
							onChange={(e) => setUserName(e.target.value)}
						/>
						<Space h="xl" />
						<Input
							icon={<LetterCaseToggle />}
							placeholder="room code"
							radius="xl"
							size="lg"
							onChange={(e) => setRoomCode(e.target.value)}
						/>
						{roomCodeExists && userName.length > 0 ? (
							<Button
								onClick={() => setSubmit(true)}
								mt="md"
								color="green"
								radius="xl"
								size="lg"
								uppercase
							>
								Join Room
							</Button>
						) : (
							<Button
								onClick={() => setSubmit(true)}
								mt="md"
								color="green"
								radius="xl"
								size="lg"
								uppercase
								disabled
							>
								Join Room
							</Button>
						)}
						{userName.length > 0 ? (
							<Button
								onClick={() => {
									setSubmit(true);
									setRoomCode(randomCodeGenerator(5));
								}}
								radius="xl"
								size="lg"
								uppercase
							>
								Create Game
							</Button>
						) : (
							<Button
								onClick={() => {
									setSubmit(true);
									setRoomCode(randomCodeGenerator(5));
								}}
								radius="xl"
								size="lg"
								uppercase
								disabled
							>
								Create Game
							</Button>
						)}
					</Stack>
				</Center>
			)}
		</Box>
	);
}

export default Start;
