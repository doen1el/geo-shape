import { browser } from '$app/environment';
import { ClientMsg, ServerMsg, AdminAction } from '../../server/protocol.js';

export type AdminRoomPlayer = {
	id: string;
	name: string;
	score: number;
	connected: boolean;
	isHost: boolean;
};

export type AdminRoom = {
	code: string;
	status: 'lobby' | 'playing' | 'finished';
	solo: boolean;
	isPublic: boolean;
	difficulty: string;
	categoryId: number;
	round: number;
	maxRounds: number;
	maxPlayers: number;
	ageSec: number;
	idleSec: number;
	players: AdminRoomPlayer[];
};

export type AdminGame = {
	code: string;
	categoryId: number;
	difficulty: string;
	rounds: number;
	players: number;
	solo: boolean;
	winnerName: string | null;
	topScore: number;
	finishedAt: number;
};

export type AdminState = {
	maintenance: boolean;
	lastBackupAt: number | null;
	uptimeSec: number;
	connections: number;
	addresses: number;
	rssMb: number;
	heapUsedMb: number;
	rooms: AdminRoom[];
	totals: { players: number; games: number; gamesToday: number };
	recentGames: AdminGame[];
};

export type AdminPlayer = {
	clientId: string;
	name: string;
	avatar: string;
	gamesPlayed: number;
	gamesWon: number;
	totalScore: number;
	bestScore: number;
	lastSeen: number;
};

const TOKEN_KEY = 'geoshape:adminToken';

class AdminSocket {
	authed = $state(false);
	connected = $state(false);
	error = $state<string | null>(null);
	state = $state<AdminState | null>(null);
	players = $state<AdminPlayer[]>([]);
	log = $state<{ id: number; text: string }[]>([]);

	#ws: WebSocket | null = null;
	#token = '';
	#logSeq = 0;
	#retry: ReturnType<typeof setTimeout> | null = null;

	get savedToken(): string {
		if (!browser) return '';
		try {
			return sessionStorage.getItem(TOKEN_KEY) ?? '';
		} catch {
			return '';
		}
	}

	connect(token: string): void {
		if (!browser) return;
		this.#token = token;
		this.error = null;

		const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
		const ws = new WebSocket(`${proto}//${location.host}/ws`);
		this.#ws = ws;

		ws.addEventListener('open', () => {
			this.connected = true;
			ws.send(JSON.stringify({ type: ClientMsg.ADMIN_AUTH, token: this.#token }));
		});
		ws.addEventListener('close', () => {
			this.connected = false;
			if (!this.authed) return;

			if (this.#retry) clearTimeout(this.#retry);
			this.#retry = setTimeout(() => this.connect(this.#token), 2000);
		});
		ws.addEventListener('message', (ev) => this.#onMessage(ev));
	}

	#onMessage(ev: MessageEvent): void {
		let msg: any;
		try {
			msg = JSON.parse(ev.data);
		} catch {
			return;
		}

		switch (msg.type) {
			case ServerMsg.ADMIN_OK:
				this.authed = true;
				this.error = null;
				try {
					sessionStorage.setItem(TOKEN_KEY, this.#token);
				} catch {}
				this.#send({ type: ClientMsg.ADMIN_WATCH });
				break;
			case ServerMsg.ADMIN_STATE:
				this.state = msg.state;
				break;
			case ServerMsg.ADMIN_PLAYERS:
				this.players = msg.players ?? [];
				break;
			case ServerMsg.NOTICE:
				if (msg.admin) this.log = [{ id: ++this.#logSeq, text: msg.text }, ...this.log.slice(0, 9)];
				break;
			case ServerMsg.ERROR:
				if (msg.code === 'denied') {
					this.authed = false;
					this.error = msg.message ?? 'Denied';
					try {
						sessionStorage.removeItem(TOKEN_KEY);
					} catch {}
				}
				break;
		}
	}

	#send(data: object): void {
		if (this.#ws?.readyState === 1) this.#ws.send(JSON.stringify(data));
	}

	#action(action: string, extra: object = {}): void {
		this.#send({ type: ClientMsg.ADMIN_ACTION, action, ...extra });
	}

	closeRoom(code: string) {
		this.#action(AdminAction.CLOSE_ROOM, { code });
	}
	kick(code: string, playerId: string) {
		this.#action(AdminAction.KICK_PLAYER, { code, playerId });
	}
	announce(text: string) {
		this.#action(AdminAction.ANNOUNCE, { text });
	}
	setMaintenance(on: boolean) {
		this.#action(AdminAction.MAINTENANCE, { on });
	}
	deletePlayer(clientId: string) {
		this.#action(AdminAction.DELETE_PLAYER, { clientId });
	}
	backup() {
		this.#action(AdminAction.BACKUP);
	}
	search(query: string) {
		this.#send({ type: ClientMsg.ADMIN_SEARCH, query });
	}

	signOut(): void {
		try {
			sessionStorage.removeItem(TOKEN_KEY);
		} catch {}
		this.authed = false;
		this.#ws?.close();
	}
}

export const admin = new AdminSocket();
