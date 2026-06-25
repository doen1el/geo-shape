import { browser } from '$app/environment';
import { ClientMsg, ServerMsg } from '../../server/protocol.js';
import type { Profile } from './stores/profile.svelte';

export type PublicPlayer = {
	id: string;
	name: string;
	avatar: string;
	score: number;
	isHost: boolean;
	connected: boolean;
	solved: boolean;
};

export type PublicRoom = {
	code: string;
	status: 'lobby' | 'playing' | 'finished';
	players: PublicPlayer[];
	round: number;
	maxRounds: number;
	categoryId: number;
	roundDurationSec: number;
};

export type RoundInfo = {
	round: number;
	maxRounds: number;
	categoryId: number;
	viewBox: string;
	path: string;
	durationSec: number;
	endsAt: number;
};

export type StateInfo = {
	key: string;
	capital: string;
	population: number;
	areaKm2: number;
	funFact: { en: string; de: string };
};
export type RoundResult = {
	answer: string;
	info: StateInfo | null;
	players: PublicPlayer[];
	nextInMs: number;
};
export type GameOver = { winnerName: string | null; isTie: boolean; players: PublicPlayer[] };
export type Verdict = 'correct' | 'close' | 'wrong';
export type ChatEntry = { id: number; kind: 'guess' | 'solved'; name: string; text?: string };

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

	// --- persistence-backed views ---
	leaderboard = $state<LeaderboardEntry[]>([]);
	stats = $state<PlayerStats | null>(null);

	roomCheck = $state<{ code: string; exists: boolean } | null>(null);

	#ws: WebSocket | null = null;
	#openPromise: Promise<void> | null = null;
	#pendingAck: ((code: string) => void) | null = null;

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
				this.#pendingAck?.(msg.code);
				this.#pendingAck = null;
				break;
			case ServerMsg.ROOM_STATE:
				this.room = msg.room;
				break;
			case ServerMsg.ROUND_START:
				if (msg.round === 1) this.chat = [];
				this.roundResult = null;
				this.gameOver = null;
				this.verdict = null;
				this.round = {
					round: msg.round,
					maxRounds: msg.maxRounds,
					categoryId: msg.categoryId,
					viewBox: msg.viewBox,
					path: msg.path,
					durationSec: msg.durationSec,
					endsAt: msg.endsAt
				};
				break;
			case ServerMsg.ROUND_END:
				this.roundResult = {
					answer: msg.answer,
					info: msg.info ?? null,
					players: msg.players,
					nextInMs: msg.nextInMs
				};
				break;
			case ServerMsg.GAME_OVER:
				this.gameOver = { winnerName: msg.winnerName, isTie: msg.isTie, players: msg.players };
				this.round = null;
				this.roundResult = null;
				break;
			case ServerMsg.GUESS_RESULT:
				this.verdict = { value: msg.verdict, at: Date.now() };
				break;
			case ServerMsg.CHAT:
				this.chat = [
					...this.chat.slice(-49),
					{ id: ++chatSeq, kind: msg.kind, name: msg.name, text: msg.text }
				];
				break;
			case ServerMsg.ROOM_EXISTS:
				this.roomCheck = { code: msg.code, exists: !!msg.exists };
				break;
			case ServerMsg.LEADERBOARD:
				this.leaderboard = msg.players ?? [];
				break;
			case ServerMsg.STATS:
				this.stats = msg.stats ?? null;
				break;
			case ServerMsg.ERROR:
				this.error = msg.message ?? 'Unknown error';
				break;
		}
	}

	#resetGame(): void {
		this.round = null;
		this.roundResult = null;
		this.gameOver = null;
		this.verdict = null;
		this.chat = [];
	}

	#send(data: object): void {
		this.#ws?.send(JSON.stringify(data));
	}

	async create(profile: Profile): Promise<string> {
		await this.connect();
		return new Promise((resolve) => {
			this.#pendingAck = resolve;
			this.#send({ type: ClientMsg.CREATE, profile });
		});
	}

	async join(code: string, profile: Profile): Promise<string> {
		await this.connect();
		return new Promise((resolve) => {
			this.#pendingAck = resolve;
			this.#send({ type: ClientMsg.JOIN, code, profile });
		});
	}

	setSettings(settings: { categoryId?: number; maxRounds?: number }): void {
		this.#send({ type: ClientMsg.SETTINGS, ...settings });
	}

	start(): void {
		this.#send({ type: ClientMsg.START });
	}

	guess(text: string): void {
		this.#send({ type: ClientMsg.GUESS, text });
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
		this.#send({ type: ClientMsg.LEAVE });
		this.room = null;
		this.playerId = null;
		this.#resetGame();
	}
}

export const game = new GameSocket();
