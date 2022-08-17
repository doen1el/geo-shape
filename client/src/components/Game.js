import React from "react";
import vivus from "vivus";
import {
  Box,
  Button,
  Center,
  Input,
  Space,
  Stack,
  Group,
  Grid,
  Loader,
  Paper,
  Text,
  Title,
  ScrollArea,
  NumberInput,
  Select,
  getInputMode,
} from "@mantine/core";
import { Writing } from "tabler-icons-react";
import { useState, useEffect, useRef } from "react";
import { socketID, socket } from "../utils/socket.js";

const Game = (props) => {
  const [started, setStarted] = useState(false);

  function importAll(r) {
    return r.keys().map(r);
  }

  const europe = importAll(
    require.context("../svg/europe", false, /\.(png|jpe?g|svg)$/)
  );

  const usa = "";

  //initial socket states
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [users, setUsers] = useState([]);
  const [room, setRoom] = useState(props.roomCode);
  const [currentUser, setCurrentUser] = useState("");
  const [host, setHost] = useState(false);
  const [guess, setGuess] = useState("");
  const [settingsCorrect, setSettingCorrect] = useState(false);

  //initial game states
  const [gameOver, setGameOver] = useState(true);
  const [roundStarted, setRoundStarted] = useState(false);
  const [maxRounds, setMaxRounds] = useState(5);
  const [maxTime, setMaxTime] = useState(60);
  const [roundTime, setRoundTime] = useState(0);
  const [categorie, setCategorie] = useState("europe");
  const [solution, setSolution] = useState("");
  const [svgNumber, setSvgNumber] = useState(0);
  const [winner, setWinner] = useState("");
  const [currentRound, setCurrentRound] = useState(1);

  useEffect(() => {
    if (maxRounds !== 0 && maxTime !== 0 && categorie !== undefined) {
      setSettingCorrect(true);
    } else {
      setSettingCorrect(false);
    }
  }, [maxRounds, maxTime, categorie]);

  const viewport = useRef();

  const scrollToBottom = () =>
    viewport.current.scrollTo({
      top: viewport.current.scrollHeight,
      behavior: "smooth",
    });

  useEffect(() => {
    socket.emit(
      "join",
      { room: props.roomCode, userName: props.userName },
      (error) => {
        if (error) console.log(error);
      }
    );

    return function cleanup() {
      socket.emit("disconnect");
      socket.off();
    };
  }, []);

  const startGame = () => {
    socket.emit("initGameState", {
      gameOver: false,
      maxRounds: maxRounds,
      maxTime: maxTime,
      categorie: categorie,
    });
  };

  useEffect(() => {
    socket.on(
      "initGameState",
      ({ gameOver, maxRounds, maxTime, categorie, svgNumber, solution }) => {
        console.log(solution);
        setGuess("");
        setCurrentRound(1);
        setMaxRounds(maxRounds);
        setGameOver(gameOver);
        setMaxTime(maxTime);
        setRoundTime(maxTime);
        setSvgNumber(svgNumber);
        setCategorie(categorie);
        setSolution(solution);
        sleep(3000);
        setRoundStarted(true);
        drawSvg(svgNumber, categorie);
        setMaxTime(maxTime - 1);
      }
    );

    socket.on(
      "updateGameState",
      ({
        currentRound,
        categorie,
        winner,
        gameOver,
        svgNumber,
        solution,
        maxTime,
      }) => {
        console.log(solution);
        if (!gameOver) {
          setRoundStarted(false);
          setMaxTime(maxTime);
          setRoundTime(maxTime);
          removeAllSvg();
          setSolution(solution);
          setGuess("");
          setGameOver(gameOver);
          setSvgNumber(svgNumber);
          setCategorie(categorie);
          setWinner(winner);
          setCurrentRound(currentRound);
          sleep(3000);
          setRoundStarted(true);
          drawSvg(svgNumber, categorie);
          setMaxTime(maxTime - 1);
        } else {
          setRoundStarted(false);
          setGameOver(gameOver);
          removeAllSvg();
          console.log(maxTime);
          setMaxTime(maxTime);
        }
      }
    );

    console.log(maxTime);

    socket.on("roomData", ({ users }) => {
      setUsers(users);
    });

    socket.on("currentUserData", ({ name, role }) => {
      setCurrentUser(name);
      {
        role === "host" ? setHost(true) : setHost(false);
      }
    });

    socket.on("message", (message) => {
      setMessages((messages) => [...messages, message]);
      scrollToBottom();
    });
  }, []);

  const removeAllSvg = () => {
    document.getElementById("svg_map").remove();
  };

  function sleep(milliseconds) {
    var start = new Date().getTime();
    for (var i = 0; i < 1e7; i++) {
      if (new Date().getTime() - start > milliseconds) {
        break;
      }
    }
  }

  useEffect(() => {
    if (roundStarted) {
      maxTime > 0 && setTimeout(() => setMaxTime(maxTime - 1), 1000);
    }
  }, [maxTime]);

  useEffect(() => {
    if (roundStarted) {
      if (guess === solution) {
        if (currentRound !== maxRounds) {
          socket.emit("updateGameState", {
            currentRound: currentRound + 1,
            categorie: categorie,
            roundWon: true,
            winner: currentUser,
            gameOver: false,
            maxTime: roundTime,
          });
        } else {
          socket.emit("updateGameState", {
            roundWon: true,
            winner: currentUser,
            gameOver: true,
            maxTime: roundTime,
          });
        }
      } else if (maxTime === 0) {
        if (currentRound !== maxRounds) {
          socket.emit("updateGameState", {
            currentRound: currentRound + 1,
            categorie: categorie,
            roundWon: false,
            gameOver: false,
            maxTime: roundTime,
          });
        } else {
          socket.emit("updateGameState", {
            roundWon: false,
            gameOver: true,
            maxTime: roundTime,
          });
        }
      }
    }
  }, [roundStarted, guess, maxTime, gameOver]);

  const sendMessage = (event) => {
    event.preventDefault();
    if (message) {
      socket.emit("sendMessage", { message: message }, () => {
        setMessage("");
        scrollToBottom();
      });
      if (!gameOver) {
        setGuess(message);
      }
    }
  };

  const drawSvg = (number, categorie) => {
    new vivus("graph", {
      duration: 2000,
      file:
        categorie === "europe"
          ? europe[number]
          : categorie === "usa"
          ? usa[number]
          : null,
    });
  };

  return (
    <Box sx={{ maxWidth: 1000 }} mx="auto">
      <Grid justify="space-between">
        <Grid.Col span={4}>
          <Title order={3}>Players:</Title>
          <Space h="sm" />
          <Stack spacing="sm	">
            {users.length > 0 ? (
              <div>
                {users.map((user) => {
                  return (
                    <p>
                      {user.name} ({user.points})
                    </p>
                  );
                })}
              </div>
            ) : (
              <Loader />
            )}
            {host ? (
              <Group>
                {!gameOver ? (
                  <div></div>
                ) : (
                  <div>
                    <Title order={4}>Settings</Title>
                    <Select
                      mt="sm"
                      label="categorie"
                      placeholder="choose categorie"
                      data={[{ value: "europe", label: "Europa" }]}
                      value={categorie}
                      onChange={setCategorie}
                    />
                    <NumberInput
                      mt="sm"
                      placeholder="rounds"
                      label="Rounds:"
                      value={maxRounds}
                      onChange={(val) => setMaxRounds(val)}
                    ></NumberInput>
                    <NumberInput
                      mt="sm"
                      placeholder="seconds"
                      label="Seconds:"
                      value={maxTime}
                      onChange={(val) => setMaxTime(val)}
                    ></NumberInput>
                    {settingsCorrect ? (
                      <Button
                        onClick={() => startGame()}
                        color="green"
                        radius="xl"
                        mt="sm"
                        size="sm"
                        uppercase
                      >
                        Start game
                      </Button>
                    ) : (
                      <Button
                        onClick={() => startGame()}
                        color="green"
                        radius="xl"
                        mt="sm"
                        size="sm"
                        uppercase
                        disabled
                      >
                        Start game
                      </Button>
                    )}
                  </div>
                )}
              </Group>
            ) : (
              <Input
                placeholder="wait until game starts"
                radius="xl"
                size="md"
                disabled
              />
            )}
          </Stack>
        </Grid.Col>
        <Grid.Col span={4}>
          <Title order={3}>Room: {room}</Title>
          <Space />
          {!gameOver ? (
            <div>
              <Title order={2}>
                {currentRound} / {maxRounds}
              </Title>
              {roundStarted ? (
                <Title order={2}>Time left: {maxTime}</Title>
              ) : (
                <Title order={2}>Time left: </Title>
              )}
            </div>
          ) : (
            <div></div>
          )}

          <Box
            id="svg-canvas"
            sx={(theme) => ({
              backgroundColor:
                theme.colorScheme === "dark"
                  ? theme.colors.dark[6]
                  : theme.colors.gray[0],
              padding: theme.spacing.xl,
              borderRadius: theme.radius.md,
              width: 300,
              height: 300,
              marginTop: 20,
            })}
          >
            <div id="graph"></div>
          </Box>
        </Grid.Col>
        <Grid.Col span={4}>
          <Box sx={{ maxWidth: 200 }} mx="auto">
            <ScrollArea
              style={{ height: 400 }}
              type="always"
              offsetScrollbars
              scrollbarSize={8}
              viewportRef={viewport}
            >
              <Stack>
                {messages.map((msg) => {
                  return (
                    <div>
                      {msg.user === currentUser ? (
                        <Text color="blue" size="sm">
                          {msg.user}: {msg.text}
                        </Text>
                      ) : (
                        <Text align="right" size="sm">
                          {msg.user}: {msg.text}
                        </Text>
                      )}
                    </div>
                  );
                })}
              </Stack>
            </ScrollArea>
            <Input
              icon={<Writing />}
              placeholder="your guess"
              radius="xl"
              compact
              mt="md"
              size="sm"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(event) =>
                event.key === "Enter" && sendMessage(event)
              }
            />
          </Box>
        </Grid.Col>
      </Grid>
    </Box>
  );
};

export default Game;
