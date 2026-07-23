import { browser } from '$app/environment';
import { ClientMsg, ServerMsg } from '../../server/protocol.js';
import { profile as profileStore, type Profile } from './stores/profile.svelte';

export { REACTION_KEYS, CONFETTI_KEY } from '../../server/protocol.js';

export type PublicPlayer = {
	id: string;
	name: string;
	avatar: string;
	score: number;
	roundPoints: number;
	wins: number;
	publicId: string;
	pinnedBadge: string;
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
	endless: boolean;
	categoryId: number;
	categorySizes: Record<number, number>;
	roundDurationSec: number;
	isPublic: boolean;
	maxPlayers: number;
};

export type PublicRoomSummary = {
	code: string;
	status: 'lobby' | 'playing' | 'finished';
	difficulty: Difficulty;
	categoryId: number;
	players: number;
	maxPlayers: number;
	round: number;
	maxRounds: number;
	hostName: string;
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
	capitalDe?: string;
	countries?: number;
	population?: number;
	areaKm2: number;
	funFact?: { en: string; de: string };
};
export type NeighborShape = {
	name: string;
	nameDe: string;
	path: string;
	border: string;
	cx?: number;
	cy?: number;
};
export type RoundResult = {
	answer: string;
	answerDe: string;
	info: StateInfo | null;
	context: NeighborShape[] | null;
	revealPath: string | null;
	players: PublicPlayer[];
	nextInMs: number;
	nextRoundAt: number;
	isLast: boolean;
	endless: boolean;
};
export type GameOver = { winnerName: string | null; isTie: boolean; players: PublicPlayer[] };
export type Verdict = 'correct' | 'similar' | 'close' | 'wrong';
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
	publicId: string;
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

export type Tier = 'bronze' | 'silver' | 'gold';

export type AchievementDef = {
	id: string;
	tier: Tier;
	group: string;
	categoryId: number | null;
	target: number | null;
	counter?: string | null;
};

export type Unlocked = { id: string; unlockedAt: number };

export type PlayerProfile = {
	publicId: string;
	name: string;
	avatar: string;
	isPrivate: boolean;
	gamesPlayed?: number;
	gamesWon?: number;
	totalScore?: number;
	bestScore?: number;
	dailyStreak?: number;
	dailyBestStreak?: number;
	lastSeen?: number;
	pinnedBadge?: string;
	achievements?: Unlocked[];
	progress?: Record<number, number>;
	counters?: Record<string, number>;
	catalogue?: AchievementDef[];
	rarity?: Record<string, number>;
};

export type DailyEntry = {
	publicId: string;
	name: string;
	avatar: string;
	score: number;
	solved: number;
	totalMs: number;
};

export type Daily = {
	day: string;
	categoryId: number;
	rounds: number;
	board: DailyEntry[];
	attempted?: boolean;
	result?: { score: number; solved: number; totalMs: number; finishedAt: number } | null;
	rank?: number;
	streak?: number;
	bestStreak?: number;
};

let chatSeq = 0;
let reactSeq = 0;
let badgeSeq = 0;

export type Reaction = { id: number; reaction: string; playerId: string; name: string };

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

const MAX_RECONNECT_DELAY_MS = 15_000;

class GameSocket {
	room = $state<PublicRoom | null>(null);
	playerId = $state<string | null>(null);
	connected = $state(false);

	reconnecting = $state(false);

	/** Transient message shown as a toast: an admin announcement, or a refusal from the server. */
	toast = $state<{ text: string; kind: 'info' | 'error' } | null>(null);
	error = $state<string | null>(null);
	errorCode = $state<string | null>(null);

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
	myProfile = $state<PlayerProfile | null>(null);
	viewedProfile = $state<PlayerProfile | null | undefined>(undefined);
	daily = $state<Daily | null>(null);

	/** The one-time code this browser is handing to another one. */
	transferCode = $state<{ code: string; expiresAt: number } | null>(null);

	badgeToasts = $state<{ id: number; achievement: string }[]>([]);

	gameBadges = $state<string[]>([]);

	roomCheck = $state<{
		code: string;
		exists: boolean;
		full: boolean;
		/** Coarse lobby figures, present only for a visible room. */
		players?: number;
		maxPlayers?: number;
		status?: 'lobby' | 'playing' | 'finished';
		categoryId?: number;
		difficulty?: 'easy' | 'hard';
		hostName?: string;
	} | null>(null);
	publicRooms = $state<PublicRoomSummary[]>([]);

	#ws: WebSocket | null = null;
	#openPromise: Promise<void> | null = null;
	#pendingAck: { resolve: (code: string) => void; reject: (err: Error) => void } | null = null;

	#pendingTransfer: { resolve: (name: string) => void; reject: (err: Error) => void } | null = null;
	#pendingDelete: { resolve: () => void; reject: (err: Error) => void } | null = null;

	#lastJoin: { code: string; profile: Profile } | null = null;
	#reconnectAttempt = 0;
	#reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	#toastTimer: ReturnType<typeof setTimeout> | null = null;

	constructor() {
		if (browser) window.addEventListener('online', () => this.#reconnectNow());
	}

	#serverOffset = 0;
	#bestRtt = Infinity;
	#clockTimer: ReturnType<typeof setInterval> | null = null;

	#toLocal(serverTs: number): number {
		return serverTs - this.#serverOffset;
	}

	#pingBurst(count: number): void {
		this.#bestRtt = Infinity;
		let sent = 0;
		const id = setInterval(() => {
			if (this.#ws?.readyState !== 1 || sent >= count) {
				clearInterval(id);
				return;
			}
			sent++;
			this.#send({ type: ClientMsg.PING, t0: Date.now() });
		}, 200);
	}

	#startClockSync(): void {
		this.#pingBurst(5); // quick initial estimate on connect
		if (this.#clockTimer) clearInterval(this.#clockTimer);
		this.#clockTimer = setInterval(() => this.#pingBurst(3), 30_000); // correct slow drift
	}

	connect(): Promise<void> {
		if (!browser) return Promise.resolve();
		if (this.#ws && this.#ws.readyState <= 1 && this.#openPromise) return this.#openPromise;

		const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
		const ws = new WebSocket(`${proto}//${location.host}/ws`);
		this.#ws = ws;

		this.#openPromise = new Promise((resolve, reject) => {
			ws.addEventListener('open', () => {
				this.connected = true;
				this.reconnecting = false;
				this.#reconnectAttempt = 0;
				this.#startClockSync();
				this.#rejoin();
				resolve();
			});
			ws.addEventListener('error', () => reject(new Error('WebSocket error')));
		});

		ws.addEventListener('close', () => {
			this.connected = false;
			if (this.#clockTimer) {
				clearInterval(this.#clockTimer);
				this.#clockTimer = null;
			}
			this.#scheduleReconnect();
		});
		ws.addEventListener('message', (ev) => this.#onMessage(ev));
		return this.#openPromise;
	}

	/**
	 * Re-enters the room we were in.
	 */
	#rejoin(): void {
		if (!this.#lastJoin) return;
		const { code, profile } = this.#lastJoin;
		this.#send({ type: ClientMsg.JOIN, code, profile });
	}

	#scheduleReconnect(): void {
		if (!browser || this.#reconnectTimer || !this.#lastJoin) return;

		const base = Math.min(500 * 2 ** this.#reconnectAttempt++, MAX_RECONNECT_DELAY_MS);
		this.reconnecting = true;
		this.#reconnectTimer = setTimeout(
			() => {
				this.#reconnectTimer = null;
				this.#ws = null;
				this.#openPromise = null;
				this.connect().catch(() => {});
			},
			base * (0.7 + Math.random() * 0.6)
		);
	}

	#reconnectNow(): void {
		if (this.#ws?.readyState === 1 || !this.#lastJoin) return;
		if (this.#reconnectTimer) clearTimeout(this.#reconnectTimer);
		this.#reconnectTimer = null;
		this.#reconnectAttempt = 0;
		this.#ws = null;
		this.#openPromise = null;
		this.connect().catch(() => {});
	}

	#showToast(text: string, kind: 'info' | 'error'): void {
		this.toast = { text, kind };
		if (this.#toastTimer) clearTimeout(this.#toastTimer);
		this.#toastTimer = setTimeout(() => (this.toast = null), 10_000);
	}

	#pushBadge(achievement: string): void {
		const id = ++badgeSeq;
		this.badgeToasts = [...this.badgeToasts, { id, achievement }];
		setTimeout(() => {
			this.badgeToasts = this.badgeToasts.filter((b) => b.id !== id);
		}, 6000);
	}

	#stopReconnecting(): void {
		this.#lastJoin = null;
		if (this.#reconnectTimer) clearTimeout(this.#reconnectTimer);
		this.#reconnectTimer = null;
		this.reconnecting = false;
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
				this.errorCode = null;
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
				this.gameBadges = [];
				this.countdown = { until: this.#toLocal(msg.startsAt + msg.durationMs) };
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
					endsAt: this.#toLocal(msg.endsAt)
				};
				break;
			case ServerMsg.ROUND_END:
				this.roundResult = {
					answer: msg.answer,
					answerDe: msg.answerDe ?? msg.answer,
					info: msg.info ?? null,
					context: msg.context ?? null,
					revealPath: msg.revealPath ?? null,
					players: msg.players,
					nextInMs: msg.nextInMs,
					nextRoundAt: Date.now() + (msg.nextInMs ?? 0),
					isLast: !!msg.isLast,
					endless: !!msg.endless
				};
				break;
			case ServerMsg.PAUSED:
				this.paused = { remainingMs: msg.remainingMs };
				break;
			case ServerMsg.RESUMED:
				this.paused = null;
				if (this.round) this.round = { ...this.round, endsAt: this.#toLocal(msg.endsAt) };
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
					{ id, reaction: msg.reaction, playerId: msg.playerId, name: msg.name }
				];
				setTimeout(() => {
					this.reactions = this.reactions.filter((r) => r.id !== id);
				}, 3000);
				break;
			}
			case ServerMsg.ROOM_EXISTS:
				this.roomCheck = {
					code: msg.code,
					exists: !!msg.exists,
					full: !!msg.full,
					players: msg.players,
					maxPlayers: msg.maxPlayers,
					status: msg.status,
					categoryId: msg.categoryId,
					difficulty: msg.difficulty,
					hostName: msg.hostName
				};
				break;
			case ServerMsg.PUBLIC_ROOMS:
				this.publicRooms = msg.rooms ?? [];
				break;
			case ServerMsg.LEADERBOARD:
				this.leaderboard = msg.players ?? [];
				break;
			case ServerMsg.STATS:
				this.stats = msg.stats ?? null;
				break;
			case ServerMsg.MY_PROFILE:
				this.myProfile = msg.profile ?? null;
				break;
			case ServerMsg.PROFILE:
				this.viewedProfile = msg.profile ?? null;
				break;
			case ServerMsg.DAILY:
				this.daily = msg.daily ?? null;
				break;
			case ServerMsg.TRANSFER_CODE:
				this.transferCode = { code: msg.code, expiresAt: Date.now() + msg.expiresInMs };
				break;
			case ServerMsg.PROFILE_DELETED:
				profileStore.clearIdentity();
				this.myProfile = null;
				this.stats = null;
				this.daily = null;
				this.transferCode = null;
				this.#pendingDelete?.resolve();
				this.#pendingDelete = null;
				break;
			case ServerMsg.TRANSFER_DONE: {
				profileStore.setIdentity(msg.clientId, msg.sig);
				if (msg.name) profileStore.set(msg.name);
				if (msg.avatar) profileStore.setAvatar(msg.avatar);

				if (this.#lastJoin) this.#lastJoin.profile = profileStore.toJSON();
				this.transferCode = null;
				this.#pendingTransfer?.resolve(profileStore.name);
				this.#pendingTransfer = null;
				this.requestMyProfile();
				this.requestStats();
				break;
			}
			case ServerMsg.ACHIEVEMENT: {
				const ids: string[] = Array.isArray(msg.ids) ? msg.ids : [];
				this.gameBadges = [...this.gameBadges, ...ids];
				ids.forEach((achievement, i) => {
					setTimeout(() => this.#pushBadge(achievement), i * 400);
				});
				break;
			}
			case ServerMsg.PONG: {
				const rtt = Date.now() - msg.t0;
				if (rtt <= this.#bestRtt) {
					this.#bestRtt = rtt;
					this.#serverOffset = msg.serverTime + rtt / 2 - Date.now();
				}
				break;
			}
			case ServerMsg.IDENTITY:
				if (typeof msg.clientId === 'string' && typeof msg.sig === 'string') {
					profileStore.setIdentity(msg.clientId, msg.sig);
					if (this.#lastJoin) this.#lastJoin.profile = profileStore.toJSON();
				}
				break;
			case ServerMsg.NOTICE: {
				if (typeof msg.text !== 'string') break;
				this.#showToast(msg.text, 'info');
				break;
			}
			case ServerMsg.SERVER_SHUTDOWN:
				this.reconnecting = true;
				break;
			case ServerMsg.ERROR: {
				const message = typeof msg.message === 'string' ? msg.message : 'Unknown error';
				this.error = message;
				this.errorCode = typeof msg.code === 'string' ? msg.code : null;

				if (this.errorCode === 'maintenance') this.#showToast(message, 'error');
				if (this.errorCode === 'not_found' || this.errorCode === 'closed') {
					this.#stopReconnecting();
					forgetRoom();
				}
				this.#pendingAck?.reject(new Error(message));
				this.#pendingAck = null;
				this.#pendingTransfer?.reject(new Error(message));
				this.#pendingTransfer = null;
				this.#pendingDelete?.reject(new Error(message));
				this.#pendingDelete = null;
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
		this.gameBadges = [];
	}

	#send(data: object): void {
		if (this.#ws?.readyState === 1) this.#ws.send(JSON.stringify(data));
	}

	async create(profile: Profile, solo = false, difficulty?: Difficulty): Promise<string> {
		await this.connect();
		this.error = null;
		this.errorCode = null;
		return new Promise((resolve, reject) => {
			this.#pendingAck = {
				resolve: (code) => {
					if (!solo) rememberRoom(code);

					this.#lastJoin = { code, profile: profileStore.toJSON() };
					resolve(code);
				},
				reject
			};
			this.#send({ type: ClientMsg.CREATE, profile, solo, difficulty });
		});
	}

	async join(code: string, profile: Profile): Promise<string> {
		await this.connect();
		this.error = null;
		this.errorCode = null;
		return new Promise((resolve, reject) => {
			this.#pendingAck = {
				resolve: (c) => {
					rememberRoom(c);
					this.#lastJoin = { code: c, profile: profileStore.toJSON() };
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
		endless?: boolean;
		roundDurationSec?: number;
		difficulty?: Difficulty;
		isPublic?: boolean;
		maxPlayers?: number;
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

	skip(): void {
		this.#send({ type: ClientMsg.SKIP });
	}

	finish(): void {
		this.#send({ type: ClientMsg.FINISH });
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

	react(reaction: string): void {
		this.#send({ type: ClientMsg.REACT, reaction });
	}

	async checkRoom(code: string): Promise<void> {
		await this.connect();
		this.#send({ type: ClientMsg.CHECK_ROOM, code });
	}

	async watchRooms(): Promise<void> {
		await this.connect();
		this.#send({ type: ClientMsg.LIST_ROOMS });
	}

	unwatchRooms(): void {
		this.#send({ type: ClientMsg.UNLIST_ROOMS });
	}

	async requestLeaderboard(): Promise<void> {
		await this.connect();
		this.#send({ type: ClientMsg.GET_LEADERBOARD });
	}

	async requestStats(): Promise<void> {
		await this.connect();
		if (!profileStore.clientId) return;
		this.#send({
			type: ClientMsg.GET_STATS,
			clientId: profileStore.clientId,
			sig: profileStore.clientSig
		});
	}

	async requestMyProfile(): Promise<void> {
		await this.connect();
		if (!profileStore.clientId) {
			this.myProfile = null;
			return;
		}
		this.#send({
			type: ClientMsg.GET_MY_PROFILE,
			clientId: profileStore.clientId,
			sig: profileStore.clientSig
		});
	}

	async requestProfile(publicId: string): Promise<void> {
		await this.connect();
		this.viewedProfile = undefined;
		this.#send({ type: ClientMsg.GET_PROFILE, publicId });
	}

	async saveProfilePrefs(isPrivate: boolean): Promise<void> {
		await this.connect();
		if (!profileStore.clientId) return;
		this.#send({
			type: ClientMsg.SET_PROFILE_PREFS,
			clientId: profileStore.clientId,
			sig: profileStore.clientSig,
			isPrivate
		});
	}

	async setPinnedBadge(badgeId: string): Promise<void> {
		await this.connect();
		if (!profileStore.clientId) return;
		if (this.myProfile) this.myProfile = { ...this.myProfile, pinnedBadge: badgeId };
		this.#send({
			type: ClientMsg.SET_PINNED_BADGE,
			clientId: profileStore.clientId,
			sig: profileStore.clientSig,
			badgeId
		});
	}

	async createTransfer(): Promise<void> {
		await this.connect();
		if (!profileStore.clientId) return;
		this.transferCode = null;
		this.error = null;
		this.errorCode = null;
		this.#send({
			type: ClientMsg.CREATE_TRANSFER,
			clientId: profileStore.clientId,
			sig: profileStore.clientSig
		});
	}

	async redeemTransfer(code: string): Promise<string> {
		await this.connect();
		this.error = null;
		this.errorCode = null;
		return new Promise((resolve, reject) => {
			this.#pendingTransfer = { resolve, reject };
			this.#send({ type: ClientMsg.REDEEM_TRANSFER, code });
		});
	}

	async deleteProfile(): Promise<void> {
		await this.connect();
		if (!profileStore.clientId) return;
		this.error = null;
		this.errorCode = null;
		return new Promise((resolve, reject) => {
			this.#pendingDelete = { resolve, reject };
			this.#send({
				type: ClientMsg.DELETE_PROFILE,
				clientId: profileStore.clientId,
				sig: profileStore.clientSig
			});
		});
	}

	async requestDaily(): Promise<void> {
		await this.connect();
		this.#send({
			type: ClientMsg.GET_DAILY,
			clientId: profileStore.clientId,
			sig: profileStore.clientSig
		});
	}

	async startDaily(profile: Profile): Promise<string> {
		await this.connect();
		this.error = null;
		this.errorCode = null;
		return new Promise((resolve, reject) => {
			this.#pendingAck = {
				resolve: (code) => {
					this.#lastJoin = { code, profile: profileStore.toJSON() };
					resolve(code);
				},
				reject
			};
			this.#send({ type: ClientMsg.START_DAILY, profile });
		});
	}

	dismissGameOver(): void {
		this.gameOver = null;
	}

	leave(): void {
		forgetRoom();
		this.#stopReconnecting();
		this.#send({ type: ClientMsg.LEAVE });
		this.room = null;
		this.playerId = null;
		this.#resetGame();
	}
}

export const game = new GameSocket();
