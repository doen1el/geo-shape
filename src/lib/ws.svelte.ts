import { browser } from '$app/environment';
import { ClientMsg, ServerMsg } from '../../server/protocol.js';
import type { Profile } from './stores/profile.svelte';

export { REACTION_EMOJIS, CONFETTI_EMOJI } from '../../server/protocol.js';

export type PublicPlayer = {
	id: string;
	name: string;
	avatar: string;
	score: number;
	roundPoints: number;
	wins: number;
	isHost: boolean;
	connected: boolean;
	solved: boolean;
};

export type Difficulty = 'easy' | 'hard';

export type PublicRoom = {
	code: string;
	status: 'lobby' | 'playing' | 'finished';
	difficulty: Difficulty;
	players: PublicPlayer[];
	round: number;
	maxRounds: number;
	allRounds: boolean;
	categoryId: number;
	categorySizes: Record<number, number>;
	roundDurationSec: number;
};

export type RoundInfo = {
	round: number;
	maxRounds: number;
	categoryId: number;
	difficulty: Difficulty;
	viewBox: string;
	path: string;
	capital: [number, number] | null;
	durationSec: number;
	endsAt: number;
};

export type StateInfo = {
	key?: string;
	capital?: string;
	population?: number;
	areaKm2: number;
	funFact?: { en: string; de: string };
};
export type RoundResult = {
	answer: string;
	info: StateInfo | null;
	players: PublicPlayer[];
	nextInMs: number;
	nextRoundAt: number;
	isLast: boolean;
};
export type GameOver = { winnerName: string | null; isTie: boolean; players: PublicPlayer[] };
export type Verdict = 'correct' | 'close' | 'wrong';
export type ChatEntry = {
	id: number;
	kind: 'guess' | 'solved' | 'msg' | 'divider';
	name?: string;
	text?: string;
	playerId?: string;
	points?: number;
	variant?: 'round' | 'lobby';
	round?: number;
};

export type LeaderboardEntry = {
	name: string;
	avatar: string;
	gamesWon: number;
	gamesPlayed: number;
	totalScore: number;
	bestScore: number;
};
export type PlayerStats = {
	gamesPlayed: number;
	gamesWon: number;
	totalScore: number;
	bestScore: number;
};

let chatSeq = 0;
let reactSeq = 0;

export type Reaction = { id: number; emoji: string; playerId: string; name: string };

const LAST_ROOM_KEY = 'geoshape:lastRoom';

export function rememberRoom(code: string): void {
	if (!browser) return;
	try {
		localStorage.setItem(LAST_ROOM_KEY, code);
	} catch {}
}

export function forgetRoom(): void {
	if (!browser) return;
	try {
		localStorage.removeItem(LAST_ROOM_KEY);
	} catch {}
}

export function getLastRoom(): string | null {
	if (!browser) return null;
	try {
		return localStorage.getItem(LAST_ROOM_KEY);
	} catch {
		return null;
	}
}

class GameSocket {
	room = $state<PublicRoom | null>(null);
	playerId = $state<string | null>(null);
	connected = $state(false);
	error = $state<string | null>(null);

	// --- game state ---
	round = $state<RoundInfo | null>(null);
	roundResult = $state<RoundResult | null>(null);
	gameOver = $state<GameOver | null>(null);
	verdict = $state<{ value: Verdict; at: number } | null>(null);
	chat = $state<ChatEntry[]>([]);
	reactions = $state<Reaction[]>([]);
	countdown = $state<{ until: number } | null>(null);
	paused = $state<{ remainingMs: number } | null>(null);

	// --- persistence-backed views ---
	leaderboard = $state<LeaderboardEntry[]>([]);
	stats = $state<PlayerStats | null>(null);

	roomCheck = $state<{ code: string; exists: boolean } | null>(null);

	#ws: WebSocket | null = null;
	#openPromise: Promise<void> | null = null;
	#pendingAck: { resolve: (code: string) => void; reject: (err: Error) => void } | null = null;

	connect(): Promise<void> {
		if (!browser) return Promise.resolve();
		if (this.#ws && this.#ws.readyState <= 1 && this.#openPromise) return this.#openPromise;

		const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
		const ws = new WebSocket(`${proto}//${location.host}/ws`);
		this.#ws = ws;

		this.#openPromise = new Promise((resolve, reject) => {
			ws.addEventListener('open', () => {
				this.connected = true;
				resolve();
			});
			ws.addEventListener('error', () => reject(new Error('WebSocket error')));
		});

		ws.addEventListener('close', () => {
			this.connected = false;
		});
		ws.addEventListener('message', (ev) => this.#onMessage(ev));
		return this.#openPromise;
	}

	#onMessage(ev: MessageEvent): void {
		let msg: any;
		try {
			msg = JSON.parse(ev.data);
		} catch {
			return;
		}
		switch (msg.type) {
			case ServerMsg.CREATED:
				this.playerId = msg.playerId;
				this.error = null;
				this.#resetGame();
				this.#pendingAck?.resolve(msg.code);
				this.#pendingAck = null;
				break;
			case ServerMsg.ROOM_STATE:
				this.room = msg.room;

				if (msg.room?.status === 'lobby') {
					this.round = null;
					this.roundResult = null;
					this.countdown = null;
					this.paused = null;
				}
				break;
			case ServerMsg.COUNTDOWN:
				this.gameOver = null;
				this.roundResult = null;
				this.paused = null;
				this.countdown = { until: msg.startsAt + msg.durationMs };
				break;
			case ServerMsg.ROUND_START:
				this.roundResult = null;
				this.gameOver = null;
				this.verdict = null;
				this.countdown = null;
				this.paused = null;
				this.round = {
					round: msg.round,
					maxRounds: msg.maxRounds,
					categoryId: msg.categoryId,
					difficulty: msg.difficulty === 'hard' ? 'hard' : 'easy',
					viewBox: msg.viewBox,
					path: msg.path,
					capital: msg.capital ?? null,
					durationSec: msg.durationSec,
					endsAt: msg.endsAt
				};
				break;
			case ServerMsg.ROUND_END:
				this.roundResult = {
					answer: msg.answer,
					info: msg.info ?? null,
					players: msg.players,
					nextInMs: msg.nextInMs,
					nextRoundAt: Date.now() + (msg.nextInMs ?? 0),
					isLast: !!msg.isLast
				};
				break;
			case ServerMsg.PAUSED:
				this.paused = { remainingMs: msg.remainingMs };
				break;
			case ServerMsg.RESUMED:
				this.paused = null;
				if (this.round) this.round = { ...this.round, endsAt: msg.endsAt };
				break;
			case ServerMsg.GAME_OVER:
				this.gameOver = { winnerName: msg.winnerName, isTie: msg.isTie, players: msg.players };
				this.round = null;
				this.roundResult = null;
				this.paused = null;
				break;
			case ServerMsg.GUESS_RESULT:
				this.verdict = { value: msg.verdict, at: Date.now() };
				break;
			case ServerMsg.CHAT:
				this.chat = [
					...this.chat.slice(-49),
					{
						id: ++chatSeq,
						kind: msg.kind,
						name: msg.name,
						text: msg.text,
						playerId: msg.playerId,
						points: msg.points,
						variant: msg.variant,
						round: msg.round
					}
				];
				break;
			case ServerMsg.CHAT_HISTORY:
				this.chat = (msg.entries ?? []).map((e: any) => ({
					id: ++chatSeq,
					kind: e.kind,
					name: e.name,
					text: e.text,
					playerId: e.playerId,
					points: e.points,
					variant: e.variant,
					round: e.round
				}));
				break;
			case ServerMsg.REACTION: {
				const id = ++reactSeq;
				this.reactions = [
					...this.reactions.slice(-29),
					{ id, emoji: msg.emoji, playerId: msg.playerId, name: msg.name }
				];
				setTimeout(() => {
					this.reactions = this.reactions.filter((r) => r.id !== id);
				}, 3000);
				break;
			}
			case ServerMsg.ROOM_EXISTS:
				this.roomCheck = { code: msg.code, exists: !!msg.exists };
				break;
			case ServerMsg.LEADERBOARD:
				this.leaderboard = msg.players ?? [];
				break;
			case ServerMsg.STATS:
				this.stats = msg.stats ?? null;
				break;
			case ServerMsg.ERROR: {
				const message = typeof msg.message === 'string' ? msg.message : 'Unknown error';
				this.error = message;
				this.#pendingAck?.reject(new Error(message));
				this.#pendingAck = null;
				break;
			}
		}
	}

	#resetGame(): void {
		this.round = null;
		this.roundResult = null;
		this.gameOver = null;
		this.verdict = null;
		this.chat = [];
		this.reactions = [];
		this.countdown = null;
		this.paused = null;
	}

	#send(data: object): void {
		this.#ws?.send(JSON.stringify(data));
	}

	async create(profile: Profile, solo = false, difficulty?: Difficulty): Promise<string> {
		await this.connect();
		return new Promise((resolve, reject) => {
			this.#pendingAck = {
				resolve: (code) => {
					if (!solo) rememberRoom(code);
					resolve(code);
				},
				reject
			};
			this.#send({ type: ClientMsg.CREATE, profile, solo, difficulty });
		});
	}

	async join(code: string, profile: Profile): Promise<string> {
		await this.connect();
		return new Promise((resolve, reject) => {
			this.#pendingAck = {
				resolve: (c) => {
					rememberRoom(c);
					resolve(c);
				},
				reject
			};
			this.#send({ type: ClientMsg.JOIN, code, profile });
		});
	}

	setSettings(settings: {
		categoryId?: number;
		maxRounds?: number;
		allRounds?: boolean;
		roundDurationSec?: number;
		difficulty?: Difficulty;
	}): void {
		this.#send({ type: ClientMsg.SETTINGS, ...settings });
	}

	start(): void {
		this.#send({ type: ClientMsg.START });
	}

	pause(): void {
		this.#send({ type: ClientMsg.PAUSE });
	}

	resume(): void {
		this.#send({ type: ClientMsg.RESUME });
	}

	abort(): void {
		this.#send({ type: ClientMsg.ABORT });
	}

	guess(text: string): void {
		this.#send({ type: ClientMsg.GUESS, text });
	}

	say(text: string): void {
		this.#send({ type: ClientMsg.SAY, text });
	}

	react(emoji: string): void {
		this.#send({ type: ClientMsg.REACT, emoji });
	}

	async checkRoom(code: string): Promise<void> {
		await this.connect();
		this.#send({ type: ClientMsg.CHECK_ROOM, code });
	}

	async requestLeaderboard(): Promise<void> {
		await this.connect();
		this.#send({ type: ClientMsg.GET_LEADERBOARD });
	}

	async requestStats(clientId: string): Promise<void> {
		await this.connect();
		this.#send({ type: ClientMsg.GET_STATS, clientId });
	}

	dismissGameOver(): void {
		this.gameOver = null;
	}

	leave(): void {
		forgetRoom();
		this.#send({ type: ClientMsg.LEAVE });
		this.room = null;
		this.playerId = null;
		this.#resetGame();
	}
}

export const game = new GameSocket();
