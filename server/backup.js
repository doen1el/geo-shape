import { mkdirSync, readdirSync, unlinkSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { backupTo } from './db.js';
import { BACKUP_DIR, BACKUP_INTERVAL_MS, BACKUP_KEEP } from './config.js';
import { safeInterval, safeTimeout, logError } from './safety.js';

const PREFIX = 'geoshape-';

/** @type {number | null} */
let lastBackupAt = null;
export function lastBackup() {
	return lastBackupAt;
}

/**
 * Snapshots the database and prunes old copies.
 *
 * @returns {string | null} The file written, or null on failure.
 */
export function runBackup() {
	if (BACKUP_INTERVAL_MS <= 0) return null;

	try {
		mkdirSync(BACKUP_DIR, { recursive: true });
	} catch (e) {
		logError('backup mkdir', e);
		return null;
	}

	const stamp = new Date().toISOString().replace(/[:.]/g, '-');
	const target = join(BACKUP_DIR, `${PREFIX}${stamp}.db`);
	if (!backupTo(target)) return null;

	lastBackupAt = Date.now();
	console.log(`[backup] wrote ${target}`);
	prune();
	return target;
}

/** Keeps only the newest BACKUP_KEEP snapshots. */
function prune() {
	try {
		const files = readdirSync(BACKUP_DIR)
			.filter((f) => f.startsWith(PREFIX) && f.endsWith('.db'))
			.map((f) => join(BACKUP_DIR, f))
			.map((path) => ({ path, mtime: statSync(path).mtimeMs }))
			.sort((a, b) => b.mtime - a.mtime);

		for (const stale of files.slice(BACKUP_KEEP)) {
			unlinkSync(stale.path);
			console.log(`[backup] pruned ${stale.path}`);
		}
	} catch (e) {
		logError('backup prune', e);
	}
}

/**
 * @param {ReturnType<typeof setInterval>[]} timers
 */
export function startBackups(timers) {
	if (BACKUP_INTERVAL_MS <= 0) {
		console.log('[backup] disabled');
		return;
	}
	console.log(
		`[backup] every ${Math.round(BACKUP_INTERVAL_MS / 3600000)}h → ${BACKUP_DIR} (keep ${BACKUP_KEEP})`
	);

	safeTimeout('firstBackup', runBackup, 30_000).unref?.();
	timers.push(safeInterval('backup', runBackup, BACKUP_INTERVAL_MS));
}
