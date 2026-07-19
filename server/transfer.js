import { randomInt } from 'node:crypto';
import { TRANSFER_TTL_MS } from './config.js';
import { sign } from './identity.js';

const ALPHABET = 'ABCDEFGHJKMNPQRSTVWXYZ23456789';

const CODE_LENGTH = 10;

/** @type {Map<string, { clientId: string, expiresAt: number }>} */
const pending = new Map();

/**
 * One live code per account
 * @type {Map<string, string>}
 */
const codeByClient = new Map();

function newCode() {
	let out = '';
	for (let i = 0; i < CODE_LENGTH; i++) out += ALPHABET[randomInt(ALPHABET.length)];
	return out;
}

function sweep() {
	const now = Date.now();
	for (const [code, entry] of pending) {
		if (entry.expiresAt > now) continue;
		pending.delete(code);
		if (codeByClient.get(entry.clientId) === code) codeByClient.delete(entry.clientId);
	}
}

/** @param {unknown} raw */
function normalizeCode(raw) {
	if (typeof raw !== 'string') return '';
	return raw
		.toUpperCase()
		.replace(/[^A-Z0-9]/g, '')
		.slice(0, CODE_LENGTH);
}

/**
 * Issues a code for an *already verified* identity.
 *
 * @param {string} clientId
 * @returns {{ code: string, expiresInMs: number }}
 */
export function createTransfer(clientId) {
	sweep();
	const previous = codeByClient.get(clientId);
	if (previous) pending.delete(previous);

	let code = newCode();
	while (pending.has(code)) code = newCode();

	pending.set(code, { clientId, expiresAt: Date.now() + TRANSFER_TTL_MS });
	codeByClient.set(clientId, code);
	return { code, expiresInMs: TRANSFER_TTL_MS };
}

/**
 * Burns a code and returns the identity it stood for.
 *
 * @param {unknown} raw The code as typed.
 * @returns {{ clientId: string, sig: string } | null}
 */
export function redeemTransfer(raw) {
	sweep();
	const code = normalizeCode(raw);
	const entry = code ? pending.get(code) : undefined;
	if (!entry) return null;

	pending.delete(code);
	codeByClient.delete(entry.clientId);
	return { clientId: entry.clientId, sig: sign(entry.clientId) };
}
