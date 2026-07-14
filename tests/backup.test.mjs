import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { startServer, connect, sleep } from './helpers.mjs';

const TOKEN = 'test-admin-token';

test('a backup is a readable snapshot, and old ones are pruned', async () => {
	const server = await startServer({ GEOSHAPE_ADMIN_TOKEN: TOKEN, GEOSHAPE_BACKUP_KEEP: '2' });
	const backupDir = join(server.dir, 'backups');

	try {
		// Leave something in the database worth backing up. Creating a room mints a
		// signed identity, which persists the signing secret in `meta`. (A row in
		// `players` would need a *finished* game — touchPlayer only updates.)
		const player = connect(server.wsUrl);
		await player.opened;
		player.send({ type: 'create', profile: { name: 'Backy', avatar: 'avataaars' } });
		await player.wait((m) => m.type === 'identity', { label: 'identity' });
		await player.wait((m) => m.type === 'created', { label: 'created' });

		const admin = connect(server.wsUrl);
		await admin.opened;
		admin.send({ type: 'admin_auth', token: TOKEN });
		await admin.wait((m) => m.type === 'admin_ok', { label: 'admin_ok' });
		admin.send({ type: 'admin_watch' });
		await admin.wait((m) => m.type === 'admin_state', { label: 'snapshot' });

		// Three backups, keeping two.
		for (let i = 0; i < 3; i++) {
			admin.send({ type: 'admin_action', action: 'backup' });
			await admin.wait((m) => m.type === 'notice' && /Backup written/.test(m.text), {
				label: `backup ${i + 1}`
			});
			await sleep(1100); // the filename carries a second-resolution timestamp
		}

		const files = readdirSync(backupDir).filter((f) => f.endsWith('.db'));
		assert.equal(files.length, 2, 'only the newest two snapshots were kept');

		const snapshot = join(backupDir, files.sort().at(-1));
		assert.ok(statSync(snapshot).size > 0, 'the snapshot is not empty');

		// It must be a real, queryable database — not a half-written file.
		const copy = new DatabaseSync(snapshot, { readOnly: true });
		const secret = copy
			.prepare(`SELECT COUNT(*) AS n FROM meta WHERE key = 'identity_secret'`)
			.get();
		assert.equal(Number(secret.n), 1, 'live data made it into the snapshot');

		const tables = copy
			.prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`)
			.all()
			.map((r) => String(r.name));
		for (const table of ['players', 'games', 'meta']) {
			assert.ok(tables.includes(table), `the snapshot carries the ${table} table`);
		}
		copy.close();

		const state = await admin.wait((m) => m.type === 'admin_state' && m.state.lastBackupAt, {
			label: 'lastBackupAt'
		});
		assert.ok(state.state.lastBackupAt > 0, 'the dashboard reports the last backup');

		player.close();
		admin.close();
	} finally {
		await server.stop();
	}
});

test('backups can be switched off', async () => {
	const server = await startServer({
		GEOSHAPE_ADMIN_TOKEN: TOKEN,
		GEOSHAPE_BACKUP_INTERVAL_MS: '0'
	});
	try {
		const admin = connect(server.wsUrl);
		await admin.opened;
		admin.send({ type: 'admin_auth', token: TOKEN });
		await admin.wait((m) => m.type === 'admin_ok', { label: 'admin_ok' });

		admin.send({ type: 'admin_action', action: 'backup' });
		const result = await admin.wait((m) => m.type === 'notice', { label: 'backup result' });
		assert.match(result.text, /failed or disabled/);
		assert.match(server.log(), /\[backup\] disabled/);
		admin.close();
	} finally {
		await server.stop();
	}
});
