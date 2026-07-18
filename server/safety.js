/**
 * @param {string} label
 * @param {unknown} err
 */
export function logError(label, err) {
	const detail = err instanceof Error ? (err.stack ?? err.message) : String(err);
	console.error(`[error] ${label}: ${detail}`);
}

/**
 * Runs `fn`, logging and swallowing anything it throws.
 * @template T
 * @param {string} label
 * @param {() => T} fn
 * @returns {T | undefined}
 */
export function guard(label, fn) {
	try {
		return fn();
	} catch (err) {
		logError(label, err);
		return undefined;
	}
}

/**
 * `setTimeout` whose callback can't kill the process.
 * @param {string} label
 * @param {() => void} fn
 * @param {number} ms
 */
export function safeTimeout(label, fn, ms) {
	return setTimeout(() => guard(label, fn), ms);
}

/**
 * `setInterval` whose callback can't kill the process. @see safeTimeout
 * @param {string} label
 * @param {() => void} fn
 * @param {number} ms
 */
export function safeInterval(label, fn, ms) {
	return setInterval(() => guard(label, fn), ms);
}

let installed = false;

/**
 * Last-resort process-level handlers.
 *
 * @param {{ onFatal: (err: unknown) => void }} handlers
 */
export function installProcessGuards({ onFatal }) {
	if (installed) return;
	installed = true;

	process.on('unhandledRejection', (reason) => logError('unhandledRejection', reason));
	process.on('uncaughtException', (err) => {
		logError('uncaughtException', err);
		onFatal(err);
	});
}
