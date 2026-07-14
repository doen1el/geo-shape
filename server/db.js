import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DB_PATH } from './config.js';

/** @type {DatabaseSync | null} */
let db = null;

function getDb() {
	if (db) return db;
	try {
		mkdirSync(dirname(DB_PATH), { recursive: true });
		db = new DatabaseSync(DB_PATH);
		db.exec('PRAGMA journal_mode = WAL;');
		db.exec('PRAGMA busy_timeout = 5000;');
		db.exec(`
			CREATE TABLE IF NOT EXISTS players (
				client_id     TEXT PRIMARY KEY,
				name          TEXT NOT NULL,
				avatar        TEXT NOT NULL,
				games_played  INTEGER NOT NULL DEFAULT 0,
				games_won     INTEGER NOT NULL DEFAULT 0,
				total_score   INTEGER NOT NULL DEFAULT 0,
				best_score    INTEGER NOT NULL DEFAULT 0,
				last_seen     INTEGER NOT NULL
			);
		`);
		db.exec(`
			CREATE TABLE IF NOT EXISTS meta (
				key   TEXT PRIMARY KEY,
				value TEXT NOT NULL
			);
		`);
		db.exec(`
			CREATE TABLE IF NOT EXISTS games (
				id           INTEGER PRIMARY KEY AUTOINCREMENT,
				code         TEXT NOT NULL,
				category_id  INTEGER NOT NULL,
				difficulty   TEXT NOT NULL,
				rounds       INTEGER NOT NULL,
				players      INTEGER NOT NULL,
				solo         INTEGER NOT NULL DEFAULT 0,
				winner_name  TEXT,
				top_score    INTEGER NOT NULL DEFAULT 0,
				finished_at  INTEGER NOT NULL
			);
			CREATE INDEX IF NOT EXISTS idx_games_finished_at ON games (finished_at DESC);
		`);
		console.log(`[db] sqlite ready at ${DB_PATH}`);
		return db;
	} catch (e) {
		console.error('[db] failed to open:', e instanceof Error ? e.message : e);
		return null;
	}
}

export function closeDb() {
	if (!db) return;
	try {
		db.close();
	} catch (e) {
		console.error('[db] close failed:', e instanceof Error ? e.message : e);
	}
	db = null;
}

/**
 * Small key/value store for things that must outlive a restart
 *
 * @param {string} key
 * @returns {string | null}
 */
export function getMeta(key) {
	const conn = getDb();
	if (!conn) return null;
	try {
		const row = conn.prepare('SELECT value FROM meta WHERE key = ?').get(key);
		return row ? String(row.value) : null;
	} catch (e) {
		console.error('[db] getMeta failed:', e instanceof Error ? e.message : e);
		return null;
	}
}

/** @param {string} key @param {string} value */
export function setMeta(key, value) {
	const conn = getDb();
	if (!conn) return;
	try {
		conn
			.prepare(
				`INSERT INTO meta (key, value) VALUES (?, ?)
				 ON CONFLICT(key) DO UPDATE SET value = excluded.value`
			)
			.run(key, value);
	} catch (e) {
		console.error('[db] setMeta failed:', e instanceof Error ? e.message : e);
	}
}

/**
 * Writes a consistent copy of the database to `path`.
 *
 * @param {string} path Must not already exist.
 * @returns {boolean}
 */
export function backupTo(path) {
	const conn = getDb();
	if (!conn) return false;
	try {
		conn.prepare('VACUUM INTO ?').run(path);
		return true;
	} catch (e) {
		console.error('[db] backup failed:', e instanceof Error ? e.message : e);
		return false;
	}
}

/**
 * Records the outcome of one finished game for one player (upsert/accumulate).
 * @param {{ clientId: string, name: string, avatar: string }} player
 * @param {{ won: boolean, score: number }} result
 */
export function recordGameResult(player, result) {
	if (!player.clientId) return;
	const conn = getDb();
	if (!conn) return;
	try {
		conn
			.prepare(
				`INSERT INTO players
					(client_id, name, avatar, games_played, games_won, total_score, best_score, last_seen)
				 VALUES (?, ?, ?, 1, ?, ?, ?, ?)
				 ON CONFLICT(client_id) DO UPDATE SET
					name         = excluded.name,
					avatar       = excluded.avatar,
					games_played = games_played + 1,
					games_won    = games_won + excluded.games_won,
					total_score  = total_score + excluded.total_score,
					best_score   = MAX(best_score, excluded.best_score),
					last_seen    = excluded.last_seen`
			)
			.run(
				player.clientId,
				player.name,
				player.avatar,
				result.won ? 1 : 0,
				result.score,
				result.score,
				Date.now()
			);
	} catch (e) {
		console.error('[db] recordGameResult failed:', e instanceof Error ? e.message : e);
	}
}

/**
 * Refreshes the display name/avatar of an existing leaderboard record so the
 * board reflects the player's current profile.
 * @param {{ clientId: string, name: string, avatar: string }} player
 */
export function touchPlayer(player) {
	if (!player.clientId) return;
	const conn = getDb();
	if (!conn) return;
	try {
		conn
			.prepare(`UPDATE players SET name = ?, avatar = ?, last_seen = ? WHERE client_id = ?`)
			.run(player.name, player.avatar, Date.now(), player.clientId);
	} catch (e) {
		console.error('[db] touchPlayer failed:', e instanceof Error ? e.message : e);
	}
}

/**
 * Top players for the leaderboard. Never exposes the clientId.
 * @param {number} [limit]
 * @returns {Array<{ name: string, avatar: string, gamesWon: number, gamesPlayed: number, totalScore: number, bestScore: number }>}
 */
export function getLeaderboard(limit = 10) {
	const conn = getDb();
	if (!conn) return [];
	try {
		const rows = conn
			.prepare(
				`SELECT name, avatar, games_won, games_played, total_score, best_score
				 FROM players
				 ORDER BY games_won DESC, total_score DESC
				 LIMIT ?`
			)
			.all(limit);
		return rows.map((r) => ({
			name: String(r.name),
			avatar: String(r.avatar),
			gamesWon: Number(r.games_won),
			gamesPlayed: Number(r.games_played),
			totalScore: Number(r.total_score),
			bestScore: Number(r.best_score)
		}));
	} catch (e) {
		console.error('[db] getLeaderboard failed:', e instanceof Error ? e.message : e);
		return [];
	}
}

/**
 * One finished game. Unlike the player stats this also records solo games
 * @param {{ code: string, categoryId: number, difficulty: string, rounds: number,
 *   players: number, solo: boolean, winnerName: string | null, topScore: number }} game
 */
export function recordGame(game) {
	const conn = getDb();
	if (!conn) return;
	try {
		conn
			.prepare(
				`INSERT INTO games
					(code, category_id, difficulty, rounds, players, solo, winner_name, top_score, finished_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
			)
			.run(
				game.code,
				game.categoryId,
				game.difficulty,
				game.rounds,
				game.players,
				game.solo ? 1 : 0,
				game.winnerName,
				game.topScore,
				Date.now()
			);
	} catch (e) {
		console.error('[db] recordGame failed:', e instanceof Error ? e.message : e);
	}
}

/**
 * Most recently finished games, newest first.
 * @param {number} [limit]
 */
export function getRecentGames(limit = 20) {
	const conn = getDb();
	if (!conn) return [];
	try {
		const rows = conn
			.prepare(
				`SELECT code, category_id, difficulty, rounds, players, solo, winner_name, top_score, finished_at
				 FROM games ORDER BY finished_at DESC LIMIT ?`
			)
			.all(limit);
		return rows.map((r) => ({
			code: String(r.code),
			categoryId: Number(r.category_id),
			difficulty: String(r.difficulty),
			rounds: Number(r.rounds),
			players: Number(r.players),
			solo: Number(r.solo) === 1,
			winnerName: r.winner_name == null ? null : String(r.winner_name),
			topScore: Number(r.top_score),
			finishedAt: Number(r.finished_at)
		}));
	} catch (e) {
		console.error('[db] getRecentGames failed:', e instanceof Error ? e.message : e);
		return [];
	}
}

/** Headline numbers for the admin dashboard. */
export function getTotals() {
	const conn = getDb();
	if (!conn) return { players: 0, games: 0, gamesToday: 0 };
	try {
		const dayAgo = Date.now() - 86_400_000;
		const num = (/** @type {string} */ sql, /** @type {any[]} */ args = []) =>
			Number(conn.prepare(sql).get(...args)?.n ?? 0);
		return {
			players: num('SELECT COUNT(*) AS n FROM players'),
			games: num('SELECT COUNT(*) AS n FROM games'),
			gamesToday: num('SELECT COUNT(*) AS n FROM games WHERE finished_at >= ?', [dayAgo])
		};
	} catch (e) {
		console.error('[db] getTotals failed:', e instanceof Error ? e.message : e);
		return { players: 0, games: 0, gamesToday: 0 };
	}
}

/**
 * Player lookup for the admin view.
 * @param {string} query
 * @param {number} [limit]
 */
export function searchPlayers(query, limit = 25) {
	const conn = getDb();
	if (!conn) return [];
	try {
		const rows = conn
			.prepare(
				`SELECT client_id, name, avatar, games_played, games_won, total_score, best_score, last_seen
				 FROM players
				 WHERE (? = '' OR name LIKE ? OR client_id LIKE ?)
				 ORDER BY last_seen DESC
				 LIMIT ?`
			)
			.all(query, `%${query}%`, `%${query}%`, limit);
		return rows.map((r) => ({
			clientId: String(r.client_id),
			name: String(r.name),
			avatar: String(r.avatar),
			gamesPlayed: Number(r.games_played),
			gamesWon: Number(r.games_won),
			totalScore: Number(r.total_score),
			bestScore: Number(r.best_score),
			lastSeen: Number(r.last_seen)
		}));
	} catch (e) {
		console.error('[db] searchPlayers failed:', e instanceof Error ? e.message : e);
		return [];
	}
}

/**
 * Erases a player's stored record (deletion requests).
 * @param {string} clientId
 * @returns {boolean}
 */
export function deletePlayer(clientId) {
	if (!clientId) return false;
	const conn = getDb();
	if (!conn) return false;
	try {
		conn.prepare('DELETE FROM players WHERE client_id = ?').run(clientId);
		return true;
	} catch (e) {
		console.error('[db] deletePlayer failed:', e instanceof Error ? e.message : e);
		return false;
	}
}

/**
 * One player's own stats.
 * @param {string} clientId
 * @returns {{ gamesPlayed: number, gamesWon: number, totalScore: number, bestScore: number } | null}
 */
export function getPlayerStats(clientId) {
	if (!clientId) return null;
	const conn = getDb();
	if (!conn) return null;
	try {
		const r = conn
			.prepare(
				`SELECT games_played, games_won, total_score, best_score FROM players WHERE client_id = ?`
			)
			.get(clientId);
		if (!r) return null;
		return {
			gamesPlayed: Number(r.games_played),
			gamesWon: Number(r.games_won),
			totalScore: Number(r.total_score),
			bestScore: Number(r.best_score)
		};
	} catch (e) {
		console.error('[db] getPlayerStats failed:', e instanceof Error ? e.message : e);
		return null;
	}
}
