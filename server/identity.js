import { createHmac, randomUUID, randomBytes, timingSafeEqual } from 'node:crypto';
import { getMeta, setMeta } from './db.js';

const SECRET_KEY = 'identity_secret';

/** @type {string | null} */
let secret = null;

/**
 * The signing secret must be stable across restarts:
 */
function getSecret() {
	if (secret) return secret;

	if (process.env.GEOSHAPE_SECRET) {
		secret = process.env.GEOSHAPE_SECRET;
		return secret;
	}

	const stored = getMeta(SECRET_KEY);
	if (stored) {
		secret = stored;
		return secret;
	}

	secret = randomBytes(32).toString('hex');
	setMeta(SECRET_KEY, secret);
	console.log('[identity] generated a signing secret (kept in the database)');
	return secret;
}

/** @param {string} clientId */
export function sign(clientId) {
	return createHmac('sha256', getSecret()).update(clientId).digest('base64url').slice(0, 24);
}

/**
 * @param {string} clientId
 * @param {unknown} sig
 */
export function verify(clientId, sig) {
	if (!clientId || typeof sig !== 'string' || !sig) return false;
	const a = Buffer.from(sig);
	const b = Buffer.from(sign(clientId));
	return a.length === b.length && timingSafeEqual(a, b);
}

export function mint() {
	const clientId = randomUUID();
	return { clientId, sig: sign(clientId), minted: true };
}

/**
 * Turns whatever the client claims into an identity the server is willing to trust.
 *
 * @param {any} raw The profile as sent by the client.
 * @returns {{ clientId: string, sig: string, minted: boolean }}
 */
export function resolveIdentity(raw) {
	const clientId =
		typeof raw?.clientId === 'string'
			? raw.clientId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64)
			: '';
	if (clientId && verify(clientId, raw?.clientSig)) {
		return { clientId, sig: String(raw.clientSig), minted: false };
	}
	return mint();
}
