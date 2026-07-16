import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomBytes } from 'node:crypto';
import { DB_PATH } from './config.js';

/** @type {DatabaseSync | null} */
let db = null;

/**
 * @param {DatabaseSync} conn
 * @param {string} table
 * @param {string} column
 * @param {string} definition
 */
function addColumn(conn, table, column, definition) {
	const cols = conn.prepare(`PRAGMA table_info(${table})`).all();
	if (cols.some((c) => String(c.name) === column)) return;
	conn.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
	console.log(`[db] added column ${table}.${column}`);
}

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
		addColumn(db, 'players', 'public_id', 'TEXT');
		addColumn(db, 'players', 'is_private', 'INTEGER NOT NULL DEFAULT 0');
		addColumn(db, 'players', 'daily_streak', 'INTEGER NOT NULL DEFAULT 0');
		addColumn(db, 'players', 'daily_best_streak', 'INTEGER NOT NULL DEFAULT 0');
		addColumn(db, 'players', 'daily_last_day', 'TEXT');
		db.exec(
			'CREATE UNIQUE INDEX IF NOT EXISTS idx_players_public_id ON players (public_id) WHERE public_id IS NOT NULL;'
		);
		db.exec(`
			CREATE TABLE IF NOT EXISTS achievements (
				client_id      TEXT NOT NULL,
				achievement_id TEXT NOT NULL,
				unlocked_at    INTEGER NOT NULL,
				PRIMARY KEY (client_id, achievement_id)
			);
		`);
		db.exec(`
			CREATE TABLE IF NOT EXISTS player_shapes (
				client_id   TEXT NOT NULL,
				category_id INTEGER NOT NULL,
				shape_id    INTEGER NOT NULL,
				solves      INTEGER NOT NULL DEFAULT 0,
				best_ms     INTEGER,
				PRIMARY KEY (client_id, category_id, shape_id)
			);
		`);
		db.exec(`
			CREATE TABLE IF NOT EXISTS player_counters (
				client_id TEXT NOT NULL,
				key       TEXT NOT NULL,
				value     INTEGER NOT NULL DEFAULT 0,
				PRIMARY KEY (client_id, key)
			);
		`);
		db.exec(`
			CREATE TABLE IF NOT EXISTS daily_results (
				day         TEXT NOT NULL,
				client_id   TEXT NOT NULL,
				score       INTEGER NOT NULL DEFAULT 0,
				solved      INTEGER NOT NULL DEFAULT 0,
				total_ms    INTEGER NOT NULL DEFAULT 0,
				finished_at INTEGER NOT NULL DEFAULT 0,
				PRIMARY KEY (day, client_id)
			);
			CREATE INDEX IF NOT EXISTS idx_daily_day_score ON daily_results (day, score DESC, total_ms ASC);
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
 * Records the player as seen: creates the account on first contact, and afterwards
 * keeps its name/avatar in step with their profile.
 *
 * @param {{ clientId: string, name: string, avatar: string }} player
 */
export function touchPlayer(player) {
	if (!player.clientId) return;
	const conn = getDb();
	if (!conn) return;
	try {
		conn
			.prepare(
				`INSERT INTO players (client_id, name, avatar, last_seen, public_id)
				 VALUES (?, ?, ?, ?, ?)
				 ON CONFLICT(client_id) DO UPDATE SET
					name      = excluded.name,
					avatar    = excluded.avatar,
					last_seen = excluded.last_seen,
					public_id = COALESCE(players.public_id, excluded.public_id)`
			)
			.run(player.clientId, player.name, player.avatar, Date.now(), newPublicId());
	} catch (e) {
		console.error('[db] touchPlayer failed:', e instanceof Error ? e.message : e);
	}
}

/** A random, shareable handle. 64 bits — enumeration is not a concern. */
function newPublicId() {
	return randomBytes(8).toString('base64url');
}

/**
 * Top players for the leaderboard. Never exposes the clientId.
 *
 * Accounts with no finished game are excluded: everyone who ever joined now has a
 * record, and a board padded with 0/0 entries would be worthless.
 *
 * @param {number} [limit]
 * @returns {Array<{ publicId: string, name: string, avatar: string, gamesWon: number, gamesPlayed: number, totalScore: number, bestScore: number }>}
 */
export function getLeaderboard(limit = 10) {
	const conn = getDb();
	if (!conn) return [];
	try {
		const rows = conn
			.prepare(
				`SELECT public_id, name, avatar, games_won, games_played, total_score, best_score
				 FROM players
				 WHERE games_played > 0 AND is_private = 0
				 ORDER BY games_won DESC, total_score DESC
				 LIMIT ?`
			)
			.all(limit);
		return rows.map((r) => ({
			publicId: r.public_id ? String(r.public_id) : '',
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
		for (const table of [
			'players',
			'achievements',
			'player_shapes',
			'player_counters',
			'daily_results'
		])
			conn.prepare(`DELETE FROM ${table} WHERE client_id = ?`).run(clientId);
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

/**
 * The ids this player has already unlocked. Loaded once per game and cached in memory,
 * so the solve hot path never reads the database.
 *
 * @param {string} clientId
 * @returns {string[]}
 */
export function getUnlocked(clientId) {
	if (!clientId) return [];
	const conn = getDb();
	if (!conn) return [];
	try {
		const rows = conn
			.prepare('SELECT achievement_id FROM achievements WHERE client_id = ?')
			.all(clientId);
		return rows.map((r) => String(r.achievement_id));
	} catch (e) {
		console.error('[db] getUnlocked failed:', e instanceof Error ? e.message : e);
		return [];
	}
}

/**
 * @param {string} clientId
 * @returns {Array<{ id: string, unlockedAt: number }>}
 */
export function getUnlockedWithDates(clientId) {
	if (!clientId) return [];
	const conn = getDb();
	if (!conn) return [];
	try {
		const rows = conn
			.prepare(
				'SELECT achievement_id, unlocked_at FROM achievements WHERE client_id = ? ORDER BY unlocked_at DESC'
			)
			.all(clientId);
		return rows.map((r) => ({ id: String(r.achievement_id), unlockedAt: Number(r.unlocked_at) }));
	} catch (e) {
		console.error('[db] getUnlockedWithDates failed:', e instanceof Error ? e.message : e);
		return [];
	}
}

/**
 * @param {string} clientId
 * @param {string[]} ids
 */
export function unlockAchievements(clientId, ids) {
	if (!clientId || !ids.length) return;
	const conn = getDb();
	if (!conn) return;
	try {
		const stmt = conn.prepare(
			'INSERT OR IGNORE INTO achievements (client_id, achievement_id, unlocked_at) VALUES (?, ?, ?)'
		);
		const now = Date.now();
		for (const id of ids) stmt.run(clientId, id, now);
	} catch (e) {
		console.error('[db] unlockAchievements failed:', e instanceof Error ? e.message : e);
	}
}

/**
 * What share of badge-earning players holds each achievement — the "3% of players have
 * this" rarity shown in the tooltip.
 *
 * @returns {Record<string, number>}
 */
export function getAchievementRarity() {
	const conn = getDb();
	if (!conn) return {};
	try {
		const total = Number(
			conn.prepare('SELECT COUNT(DISTINCT client_id) AS n FROM achievements').get()?.n ?? 0
		);
		if (total === 0) return {};
		const rows = conn
			.prepare('SELECT achievement_id, COUNT(*) AS n FROM achievements GROUP BY achievement_id')
			.all();
		/** @type {Record<string, number>} */
		const out = {};
		for (const r of rows)
			out[String(r.achievement_id)] = Math.max(1, Math.round((Number(r.n) / total) * 100));
		return out;
	} catch (e) {
		console.error('[db] getAchievementRarity failed:', e instanceof Error ? e.message : e);
		return {};
	}
}

/**
 * Every shape this player has ever solved, as `"<categoryId>:<shapeId>"` keys.
 *
 * @param {string} clientId
 * @returns {string[]}
 */
export function getSolvedShapes(clientId) {
	if (!clientId) return [];
	const conn = getDb();
	if (!conn) return [];
	try {
		const rows = conn
			.prepare('SELECT category_id, shape_id FROM player_shapes WHERE client_id = ?')
			.all(clientId);
		return rows.map((r) => `${Number(r.category_id)}:${Number(r.shape_id)}`);
	} catch (e) {
		console.error('[db] getSolvedShapes failed:', e instanceof Error ? e.message : e);
		return [];
	}
}

/**
 * One solve credits every equivalent key (see `shapeKeys` — the same country lives in
 * both its continent category and World under different ids).
 *
 * @param {string} clientId
 * @param {string[]} keys `<categoryId>:<shapeId>`
 * @param {number} solveMs
 */
export function recordShapeSolves(clientId, keys, solveMs) {
	if (!clientId || !keys.length) return;
	const conn = getDb();
	if (!conn) return;
	try {
		const stmt = conn.prepare(
			`INSERT INTO player_shapes (client_id, category_id, shape_id, solves, best_ms)
			 VALUES (?, ?, ?, 1, ?)
			 ON CONFLICT(client_id, category_id, shape_id) DO UPDATE SET
				solves  = solves + 1,
				best_ms = MIN(COALESCE(best_ms, excluded.best_ms), excluded.best_ms)`
		);
		for (const key of keys) {
			const [categoryId, shapeId] = key.split(':').map(Number);
			stmt.run(clientId, categoryId, shapeId, solveMs);
		}
	} catch (e) {
		console.error('[db] recordShapeSolves failed:', e instanceof Error ? e.message : e);
	}
}

/**
 * How many distinct shapes the player has solved per category.
 * @param {string} clientId
 * @returns {Record<number, number>}
 */
export function getCategoryProgress(clientId) {
	if (!clientId) return {};
	const conn = getDb();
	if (!conn) return {};
	try {
		const rows = conn
			.prepare(
				'SELECT category_id, COUNT(*) AS n FROM player_shapes WHERE client_id = ? GROUP BY category_id'
			)
			.all(clientId);
		/** @type {Record<number, number>} */
		const out = {};
		for (const r of rows) out[Number(r.category_id)] = Number(r.n);
		return out;
	} catch (e) {
		console.error('[db] getCategoryProgress failed:', e instanceof Error ? e.message : e);
		return {};
	}
}

/**
 * Lifetime counters an achievement can test against (fast solves, first-blood count …).
 * @param {string} clientId
 * @returns {Record<string, number>}
 */
export function getCounters(clientId) {
	if (!clientId) return {};
	const conn = getDb();
	if (!conn) return {};
	try {
		const rows = conn
			.prepare('SELECT key, value FROM player_counters WHERE client_id = ?')
			.all(clientId);
		/** @type {Record<string, number>} */
		const out = {};
		for (const r of rows) out[String(r.key)] = Number(r.value);
		return out;
	} catch (e) {
		console.error('[db] getCounters failed:', e instanceof Error ? e.message : e);
		return {};
	}
}

/**
 * @param {string} clientId
 * @param {Record<string, number>} deltas
 */
export function bumpCounters(clientId, deltas) {
	if (!clientId) return;
	const entries = Object.entries(deltas).filter(([, v]) => v);
	if (!entries.length) return;
	const conn = getDb();
	if (!conn) return;
	try {
		const stmt = conn.prepare(
			`INSERT INTO player_counters (client_id, key, value) VALUES (?, ?, ?)
			 ON CONFLICT(client_id, key) DO UPDATE SET value = value + excluded.value`
		);
		for (const [key, by] of entries) stmt.run(clientId, key, by);
	} catch (e) {
		console.error('[db] bumpCounters failed:', e instanceof Error ? e.message : e);
	}
}

/**
 * Claims today's attempt. Returns false if this player already has one
 *
 * @param {string} day `YYYY-MM-DD`
 * @param {string} clientId
 * @returns {boolean} true if the attempt was claimed, false if already used
 */
export function claimDaily(day, clientId) {
	if (!clientId) return false;
	const conn = getDb();
	if (!conn) return false;
	try {
		const res = conn
			.prepare('INSERT OR IGNORE INTO daily_results (day, client_id) VALUES (?, ?)')
			.run(day, clientId);
		return Number(res.changes) > 0;
	} catch (e) {
		console.error('[db] claimDaily failed:', e instanceof Error ? e.message : e);
		return false;
	}
}

/**
 * Writes the result of a claimed attempt.
 *
 * @param {string} day
 * @param {string} clientId
 * @param {{ score: number, solved: number, totalMs: number }} result
 */
export function finishDaily(day, clientId, result) {
	if (!clientId) return;
	const conn = getDb();
	if (!conn) return;
	try {
		conn
			.prepare(
				`UPDATE daily_results SET score = ?, solved = ?, total_ms = ?, finished_at = ?
				 WHERE day = ? AND client_id = ? AND finished_at = 0`
			)
			.run(result.score, result.solved, result.totalMs, Date.now(), day, clientId);
	} catch (e) {
		console.error('[db] finishDaily failed:', e instanceof Error ? e.message : e);
	}
}

/**
 * @param {string} day
 * @param {string} clientId
 * @returns {{ score: number, solved: number, totalMs: number, finishedAt: number } | null}
 */
export function getDailyResult(day, clientId) {
	if (!clientId) return null;
	const conn = getDb();
	if (!conn) return null;
	try {
		const r = conn
			.prepare(
				'SELECT score, solved, total_ms, finished_at FROM daily_results WHERE day = ? AND client_id = ?'
			)
			.get(day, clientId);
		if (!r) return null;
		return {
			score: Number(r.score),
			solved: Number(r.solved),
			totalMs: Number(r.total_ms),
			finishedAt: Number(r.finished_at)
		};
	} catch (e) {
		console.error('[db] getDailyResult failed:', e instanceof Error ? e.message : e);
		return null;
	}
}

/**
 * Today's board. Unfinished (abandoned) attempts are excluded, and private players are
 * left out for the same reason as on the all-time board — see `getLeaderboard`.
 *
 * @param {string} day
 * @param {number} [limit]
 */
export function getDailyLeaderboard(day, limit = 10) {
	const conn = getDb();
	if (!conn) return [];
	try {
		const rows = conn
			.prepare(
				`SELECT p.public_id, p.name, p.avatar, d.score, d.solved, d.total_ms
				 FROM daily_results d JOIN players p ON p.client_id = d.client_id
				 WHERE d.day = ? AND d.finished_at > 0 AND p.is_private = 0
				 ORDER BY d.score DESC, d.total_ms ASC
				 LIMIT ?`
			)
			.all(day, limit);
		return rows.map((r) => ({
			publicId: r.public_id ? String(r.public_id) : '',
			name: String(r.name),
			avatar: String(r.avatar),
			score: Number(r.score),
			solved: Number(r.solved),
			totalMs: Number(r.total_ms)
		}));
	} catch (e) {
		console.error('[db] getDailyLeaderboard failed:', e instanceof Error ? e.message : e);
		return [];
	}
}

/**
 * 1-based placement on today's board, or 0 if the player has no finished run.
 * @param {string} day
 * @param {string} clientId
 */
export function getDailyRank(day, clientId) {
	if (!clientId) return 0;
	const conn = getDb();
	if (!conn) return 0;
	try {
		const r = conn
			.prepare(
				`SELECT COUNT(*) AS n FROM daily_results o
				 WHERE o.day = ? AND o.finished_at > 0 AND (
					o.score > (SELECT score FROM daily_results WHERE day = ? AND client_id = ?)
					OR (o.score = (SELECT score FROM daily_results WHERE day = ? AND client_id = ?)
						AND o.total_ms < (SELECT total_ms FROM daily_results WHERE day = ? AND client_id = ?))
				 )`
			)
			.get(day, day, clientId, day, clientId, day, clientId);
		const result = getDailyResult(day, clientId);
		if (!result || result.finishedAt === 0) return 0;
		return Number(r?.n ?? 0) + 1;
	} catch (e) {
		console.error('[db] getDailyRank failed:', e instanceof Error ? e.message : e);
		return 0;
	}
}

/**
 * Advances the player's daily streak for `day`: +1 when they played yesterday, otherwise
 * back to 1. Idempotent — replaying the same day does not inflate it.
 *
 * @param {string} clientId
 * @param {string} day `YYYY-MM-DD`
 * @param {string} yesterday
 * @returns {{ streak: number, bestStreak: number }}
 */
export function bumpDailyStreak(clientId, day, yesterday) {
	const empty = { streak: 0, bestStreak: 0 };
	if (!clientId) return empty;
	const conn = getDb();
	if (!conn) return empty;
	try {
		const r = conn
			.prepare(
				'SELECT daily_streak, daily_best_streak, daily_last_day FROM players WHERE client_id = ?'
			)
			.get(clientId);
		if (!r) return empty;
		const last = r.daily_last_day ? String(r.daily_last_day) : '';
		if (last === day)
			return { streak: Number(r.daily_streak), bestStreak: Number(r.daily_best_streak) };

		const streak = last === yesterday ? Number(r.daily_streak) + 1 : 1;
		const bestStreak = Math.max(Number(r.daily_best_streak), streak);
		conn
			.prepare(
				'UPDATE players SET daily_streak = ?, daily_best_streak = ?, daily_last_day = ? WHERE client_id = ?'
			)
			.run(streak, bestStreak, day, clientId);
		return { streak, bestStreak };
	} catch (e) {
		console.error('[db] bumpDailyStreak failed:', e instanceof Error ? e.message : e);
		return empty;
	}
}

/**
 * @typedef {Object} PlayerProfile
 * @property {string} publicId
 * @property {string} name
 * @property {string} avatar
 * @property {boolean} isPrivate
 * @property {number} gamesPlayed
 * @property {number} gamesWon
 * @property {number} totalScore
 * @property {number} bestScore
 * @property {number} dailyStreak
 * @property {number} dailyBestStreak
 * @property {number} lastSeen
 */

/** @param {any} r @returns {PlayerProfile} */
function toProfile(r) {
	return {
		publicId: r.public_id ? String(r.public_id) : '',
		name: String(r.name),
		avatar: String(r.avatar),
		isPrivate: Number(r.is_private) === 1,
		gamesPlayed: Number(r.games_played),
		gamesWon: Number(r.games_won),
		totalScore: Number(r.total_score),
		bestScore: Number(r.best_score),
		dailyStreak: Number(r.daily_streak),
		dailyBestStreak: Number(r.daily_best_streak),
		lastSeen: Number(r.last_seen)
	};
}

const PROFILE_COLS = `public_id, name, avatar, is_private, games_played, games_won,
	total_score, best_score, daily_streak, daily_best_streak, last_seen`;

/**
 * Looks a player up by the *public* handle. Never returns the client id.
 * @param {string} publicId
 * @returns {PlayerProfile | null}
 */
export function getProfileByPublicId(publicId) {
	if (!publicId) return null;
	const conn = getDb();
	if (!conn) return null;
	try {
		const r = conn.prepare(`SELECT ${PROFILE_COLS} FROM players WHERE public_id = ?`).get(publicId);
		return r ? toProfile(r) : null;
	} catch (e) {
		console.error('[db] getProfileByPublicId failed:', e instanceof Error ? e.message : e);
		return null;
	}
}

/**
 * @param {string} clientId
 * @returns {PlayerProfile | null}
 */
export function getProfileByClientId(clientId) {
	if (!clientId) return null;
	const conn = getDb();
	if (!conn) return null;
	try {
		const r = conn.prepare(`SELECT ${PROFILE_COLS} FROM players WHERE client_id = ?`).get(clientId);
		return r ? toProfile(r) : null;
	} catch (e) {
		console.error('[db] getProfileByClientId failed:', e instanceof Error ? e.message : e);
		return null;
	}
}

/**
 * @param {string} clientId
 * @param {{ isPrivate: boolean }} prefs
 */
export function setProfilePrefs(clientId, prefs) {
	if (!clientId) return;
	const conn = getDb();
	if (!conn) return;
	try {
		conn
			.prepare('UPDATE players SET is_private = ? WHERE client_id = ?')
			.run(prefs.isPrivate ? 1 : 0, clientId);
	} catch (e) {
		console.error('[db] setProfilePrefs failed:', e instanceof Error ? e.message : e);
	}
}

/**
 * Resolves the public handle back to the secret id.
 *
 * @param {string} publicId
 * @returns {string}
 */
function clientIdByPublicId(publicId) {
	if (!publicId) return '';
	const conn = getDb();
	if (!conn) return '';
	try {
		const r = conn.prepare('SELECT client_id FROM players WHERE public_id = ?').get(publicId);
		return r ? String(r.client_id) : '';
	} catch (e) {
		console.error('[db] clientIdByPublicId failed:', e instanceof Error ? e.message : e);
		return '';
	}
}

/**
 * @typedef {PlayerProfile & {
 *   achievements: Array<{ id: string, unlockedAt: number }>,
 *   progress: Record<number, number>,
 *   counters: Record<string, number>
 * }} FullProfile
 */

/**
 * Everything a profile page shows. Callers get no way back to the client id.
 *
 * @param {string} clientId
 * @returns {FullProfile | null}
 */
export function getFullProfile(clientId) {
	const base = getProfileByClientId(clientId);
	if (!base) return null;
	return {
		...base,
		achievements: getUnlockedWithDates(clientId),
		progress: getCategoryProgress(clientId),
		counters: getCounters(clientId)
	};
}

/**
 * The same, addressed by the *public* handle — this is what a visitor gets.
 *
 * @param {string} publicId
 * @returns {FullProfile | null}
 */
export function getFullProfileByPublicId(publicId) {
	const clientId = clientIdByPublicId(publicId);
	return clientId ? getFullProfile(clientId) : null;
}
