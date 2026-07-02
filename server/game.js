import { ServerMsg, Verdict } from './protocol.js';
import { roomManager } from './rooms.js';
import { getCategory, pickShape, PLAYABLE_CATEGORY_IDS } from './data/shapes.js';
import { judgeGuess } from './match.js';
import { recordGameResult } from './db.js';
import { cleanText } from './moderation.js';
import {
	ROUND_END_PAUSE_MS,
	COUNTDOWN_MS,
	MAX_ROUND_POINTS,
	MIN_ROUND_POINTS,
	FIRST_SOLVE_BONUS,
	ORDER_BONUS_STEP,
	MIN_ROUNDS,
	MAX_ROUNDS,
	MIN_ROUND_DURATION_SEC,
	MAX_ROUND_DURATION_SEC
} from './config.js';

/** @typedef {import('./rooms.js').Room} Room */
/** @typedef {import('./rooms.js').Player} Player */

/** Room is still tracked and has players. @param {Room} room */
function isAlive(room) {
	return roomManager.getRoom(room.code) === room && room.players.size > 0;
}

/** @param {Room} room */
function clearTimers(room) {
	if (room.roundTimer) clearTimeout(room.roundTimer);
	if (room.pauseTimer) clearTimeout(room.pauseTimer);
	room.roundTimer = null;
	room.pauseTimer = null;
}

/** @param {Room} room */
function connectedPlayers(room) {
	return [...room.players.values()].filter((p) => p.connected);
}

/** @param {Room} room */
function allConnectedSolved(room) {
	const connected = connectedPlayers(room);
	return connected.length > 0 && connected.every((p) => room.solved.has(p.id));
}

/**
 * Host changes lobby settings (category / number of rounds).
 * @param {Room} room
 * @param {Player} player
 * @param {{ categoryId?: number, maxRounds?: number, roundDurationSec?: number, difficulty?: string }} settings
 */
export function updateSettings(room, player, settings) {
	if (room.hostId !== player.id || room.status !== 'lobby') return;
	if (typeof settings.categoryId === 'number' && PLAYABLE_CATEGORY_IDS.includes(settings.categoryId)) {
		room.categoryId = settings.categoryId;
	}
	if (typeof settings.maxRounds === 'number') {
		room.maxRounds = Math.max(MIN_ROUNDS, Math.min(MAX_ROUNDS, Math.round(settings.maxRounds)));
	}
	if (typeof settings.roundDurationSec === 'number') {
		room.roundDurationSec = Math.max(
			MIN_ROUND_DURATION_SEC,
			Math.min(MAX_ROUND_DURATION_SEC, Math.round(settings.roundDurationSec))
		);
	}
	if (settings.difficulty === 'easy' || settings.difficulty === 'hard') {
		room.difficulty = settings.difficulty;
	}
	roomManager.broadcastState(room);
}

/**
 * Host starts the game.
 * @param {Room} room
 * @param {Player} player
 */
export function startGame(room, player) {
	if (room.hostId !== player.id || room.status !== 'lobby') return;
	if (room.players.size < 1 || !PLAYABLE_CATEGORY_IDS.includes(room.categoryId)) return;

	clearTimers(room);
	for (const p of room.players.values()) p.score = 0;
	room.usedShapeIds.clear();
	room.round = 0;
	room.status = 'playing';
	room.roundActive = false;
	room.paused = false;
	room.pauseRemainingMs = 0;
	room.currentShape = null;
	room.countdownEndsAt = Date.now() + COUNTDOWN_MS;

	roomManager.broadcastState(room);
	roomManager.broadcast(room, {
		type: ServerMsg.COUNTDOWN,
		durationMs: COUNTDOWN_MS,
		startsAt: Date.now()
	});
	console.log(`[game] ${room.code} starting — category ${room.categoryId}, ${room.maxRounds} rounds`);
	room.pauseTimer = setTimeout(() => {
		if (!isAlive(room)) return cleanupRoom(room);
		startRound(room);
	}, COUNTDOWN_MS);
}

/**
 * Host pauses the active round — freezes the timer and blocks guessing.
 * @param {Room} room
 * @param {Player} player
 */
export function pauseGame(room, player) {
	if (room.hostId !== player.id) return;
	if (room.status !== 'playing' || !room.roundActive || room.paused) return;
	if (room.roundTimer) clearTimeout(room.roundTimer);
	room.roundTimer = null;
	room.paused = true;
	room.pauseRemainingMs = Math.max(0, room.roundEndsAt - Date.now());
	roomManager.broadcast(room, { type: ServerMsg.PAUSED, remainingMs: room.pauseRemainingMs });
	console.log(`[game] ${room.code} paused (${Math.round(room.pauseRemainingMs / 1000)}s left)`);
}

/**
 * Host resumes a paused round.
 * @param {Room} room
 * @param {Player} player
 */
export function resumeGame(room, player) {
	if (room.hostId !== player.id || !room.paused) return;
	room.paused = false;
	room.roundEndsAt = Date.now() + room.pauseRemainingMs;
	room.roundTimer = setTimeout(() => endRound(room), room.pauseRemainingMs);
	roomManager.broadcast(room, { type: ServerMsg.RESUMED, endsAt: room.roundEndsAt });
	console.log(`[game] ${room.code} resumed`);
}

/**
 * Host aborts the running game and returns the room to its lobby.
 * @param {Room} room
 * @param {Player} player
 */
export function abortGame(room, player) {
	if (room.hostId !== player.id || room.status !== 'playing') return;
	clearTimers(room);
	room.status = 'lobby';
	room.round = 0;
	room.roundActive = false;
	room.paused = false;
	room.pauseRemainingMs = 0;
	room.countdownEndsAt = 0;
	room.currentShape = null;
	room.solved = new Set();
	room.usedShapeIds.clear();
	for (const p of room.players.values()) p.score = 0;
	markLobbyReturn(room);
	roomManager.broadcastState(room);
	console.log(`[game] ${room.code} aborted by host — back to lobby`);
}

/**
 * Brings a freshly (re)joined player up to speed with the room's current phase,
 * so reloading mid-game doesn't strand them on a "waiting" screen.
 * @param {Room} room
 * @param {Player} player
 */
export function syncJoiner(room, player) {
	if (room.status !== 'playing') return;
	const now = Date.now();

	if (room.countdownEndsAt > now && !room.roundActive) {
		send(player, {
			type: ServerMsg.COUNTDOWN,
			durationMs: room.countdownEndsAt - now,
			startsAt: now
		});
		return;
	}

	if (room.roundActive && room.currentShape) {
		const category = getCategory(room.categoryId);
		send(player, {
			type: ServerMsg.ROUND_START,
			round: room.round,
			maxRounds: room.maxRounds,
			categoryId: room.categoryId,
			difficulty: room.difficulty,
			viewBox: category?.viewBox ?? '0 0 400 400',
			path: room.currentShape.path,
			durationSec: room.roundDurationSec,
			endsAt: room.roundEndsAt
		});
		if (room.paused) {
			send(player, { type: ServerMsg.PAUSED, remainingMs: room.pauseRemainingMs });
		}
	}
}

/**
 * Begins the next round.
 * @param {Room} room
 */
function startRound(room) {
	clearTimers(room);
	if (!isAlive(room)) return cleanupRoom(room);

	const shape = pickShape(room.categoryId, room.usedShapeIds);
	if (!shape) return endGame(room);

	room.round += 1;
	room.currentShape = shape;
	room.solved = new Set();
	room.roundActive = true;
	room.paused = false;
	room.pauseRemainingMs = 0;
	room.countdownEndsAt = 0;

	roomManager.chat(room, { kind: 'divider', variant: 'round', round: room.round });
	for (const p of room.players.values()) p.roundPoints = 0;
	room.roundEndsAt = Date.now() + room.roundDurationSec * 1000;

	const category = getCategory(room.categoryId);
	roomManager.broadcast(room, {
		type: ServerMsg.ROUND_START,
		round: room.round,
		maxRounds: room.maxRounds,
		categoryId: room.categoryId,
		difficulty: room.difficulty,
		viewBox: category?.viewBox ?? '0 0 400 400',
		path: shape.path,
		durationSec: room.roundDurationSec,
		endsAt: room.roundEndsAt
	});
	roomManager.broadcastState(room);
	console.log(`[game] ${room.code} round ${room.round}/${room.maxRounds}: answer = ${shape.name}`);

	room.roundTimer = setTimeout(() => endRound(room), room.roundDurationSec * 1000);
}

/**
 * Handles a chat guess.
 * @param {Room} room
 * @param {Player} player
 * @param {string} text
 */
export function handleGuess(room, player, text) {
	const guess = String(text ?? '').trim();
	if (!guess) return;
	if (room.status !== 'playing' || !room.roundActive || !room.currentShape) return;
	if (room.solved.has(player.id)) return;

	const verdict = judgeGuess(guess, room.currentShape.answers);

	if (verdict === Verdict.CORRECT) {
		if (room.paused) return;

		const order = room.solved.size;
		room.solved.add(player.id);
		const timeLeftMs = Math.max(0, room.roundEndsAt - Date.now());
		const fraction = timeLeftMs / (room.roundDurationSec * 1000);
		const timePoints = Math.max(MIN_ROUND_POINTS, Math.round(fraction * MAX_ROUND_POINTS));
		const orderBonus = Math.max(0, FIRST_SOLVE_BONUS - order * ORDER_BONUS_STEP);
		const points = timePoints + orderBonus;
		player.score += points;
		player.roundPoints = points;

		send(player, { type: ServerMsg.GUESS_RESULT, verdict });
		roomManager.chat(room, {
			kind: 'solved',
			name: player.profile.name,
			playerId: player.id,
			points
		});
		roomManager.broadcastState(room);
		console.log(`[game] ${room.code} ${player.profile.name} solved (+${points})`);

		if (allConnectedSolved(room)) endRound(room);
		return;
	}

	send(player, { type: ServerMsg.GUESS_RESULT, verdict });
	roomManager.chat(room, {
		kind: 'guess',
		name: player.profile.name,
		text: cleanText(guess.slice(0, 60)),
		playerId: player.id
	});
}

/**
 * Ends the current round, reveals the answer, then schedules what's next.
 * @param {Room} room
 */
function endRound(room) {
	clearTimers(room);
	room.roundActive = false;
	const answer = room.currentShape?.name ?? '';
	const info = room.currentShape?.info ?? null;
	const isLast = room.round >= room.maxRounds;

	roomManager.broadcast(room, {
		type: ServerMsg.ROUND_END,
		answer,
		info,
		players: roomManager.toPublic(room).players,
		nextInMs: ROUND_END_PAUSE_MS,
		isLast
	});
	console.log(`[game] ${room.code} round ${room.round} ended — answer was ${answer}`);

	if (!isAlive(room)) return cleanupRoom(room);

	room.pauseTimer = setTimeout(() => {
		if (!isAlive(room)) return cleanupRoom(room);
		if (isLast) endGame(room);
		else startRound(room);
	}, ROUND_END_PAUSE_MS);
}

/**
 * Ends the game, announces the winner, then resets the room to its lobby.
 * @param {Room} room
 */
export function endGame(room) {
	clearTimers(room);
	room.roundActive = false;
	room.status = 'finished';

	const finalPlayers = roomManager.toPublic(room).players;
	const maxScore = finalPlayers.reduce((m, p) => Math.max(m, p.score), 0);
	const winners = finalPlayers.filter((p) => p.score === maxScore && maxScore > 0);
	const isTie = winners.length > 1;

	roomManager.broadcast(room, {
		type: ServerMsg.GAME_OVER,
		winnerName: !isTie && winners.length === 1 ? winners[0].name : null,
		isTie,
		players: finalPlayers
	});
	console.log(`[game] ${room.code} game over — winner: ${winners.map((w) => w.name).join(', ') || 'none'}`);

	if (!room.solo) {
		const winnerIds = new Set(winners.map((w) => w.id));
		const isContest = room.players.size > 1;
		for (const p of room.players.values()) {
			recordGameResult(
				{ clientId: p.profile.clientId, name: p.profile.name, avatar: p.profile.avatar },
				{ won: isContest && winnerIds.has(p.id), score: p.score }
			);
		}
	}

	room.status = 'lobby';
	room.round = 0;
	room.currentShape = null;
	room.solved = new Set();
	room.usedShapeIds.clear();
	for (const p of room.players.values()) p.score = 0;
	markLobbyReturn(room);
	roomManager.broadcastState(room);
}

/**
 * Marks the return to the lobby with a divider, keeping the chat backlog intact
 * for the room's lifetime.
 * @param {Room} room
 */
function markLobbyReturn(room) {
	roomManager.chat(room, { kind: 'divider', variant: 'lobby' });
}

/**
 * Called when a player leaves mid-game: may finish the round early.
 * @param {Room} room
 */
export function notifyPlayerLeft(room) {
	if (room.status === 'playing' && room.roundActive && allConnectedSolved(room)) {
		endRound(room);
	}
}

/**
 * Clears any pending timers for a room (e.g. once it has emptied out).
 * @param {Room} room
 */
export function cleanupRoom(room) {
	clearTimers(room);
}

/** @param {Player} player @param {object} msg */
function send(player, msg) {
	if (player.socket.readyState === 1) player.socket.send(JSON.stringify(msg));
}
