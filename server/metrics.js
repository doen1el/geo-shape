/** @type {Map<string, number>} */
const perIp = new Map();
let total = 0;

/** @param {string} ip */
export function addConnection(ip) {
	total++;
	perIp.set(ip, (perIp.get(ip) ?? 0) + 1);
}

/** @param {string} ip */
export function removeConnection(ip) {
	total--;
	const left = (perIp.get(ip) ?? 1) - 1;
	if (left > 0) perIp.set(ip, left);
	else perIp.delete(ip);
}

/** @param {string} ip */
export function connectionsFrom(ip) {
	return perIp.get(ip) ?? 0;
}

export function connectionCount() {
	return total;
}

/** Distinct client addresses currently connected. */
export function uniqueAddresses() {
	return perIp.size;
}
