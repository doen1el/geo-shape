#!/usr/bin/env node
/**
 * GeoShape outline generator (build by Claude Code (Opus 4.8))
 *
 * Takes Natural-Earth GeoJSON, filters + simplifies (TopoJSON) and projects
 * each shape on its own (d3-geo) so it sits centered and fills a 1000×1000 box,
 * then writes `server/data/<key>_paths.js` for each category.
 *
 * Usage:
 *   node scripts/build-shapes.mjs                 # build every category
 *   node scripts/build-shapes.mjs europe us_states  # build only these keys
 */
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	geoMercator,
	geoEqualEarth,
	geoNaturalEarth1,
	geoAzimuthalEqualArea,
	geoCentroid,
	geoArea,
	geoDistance
} from 'd3-geo';
import { topology } from 'topojson-server';
import { presimplify, simplify as topoSimplify, quantile } from 'topojson-simplify';
import { merge, feature } from 'topojson-client';
import { germanStateInfo, continentFacts, countryFacts, usStateFacts } from './fun-facts.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const CACHE = join(ROOT, '.cache', 'natural-earth');
const OUT_DIR = join(ROOT, 'server', 'data');
const NE_BASE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/';
const SIZE = 1000; // each shape is projected to fill a SIZE×SIZE box
const DEFAULT_MIN_RATIO = 0.003; // drop polygons smaller than this fraction of the largest
const MIN_SEG_PX = 2.0; // drop points closer than this (px) to the previous — sub-pixel detail
const EARTH_R = 6371; // km, for area from spherical geometry

/**
 * Capital lookups, filled from Natural Earth populated places in main().
 * Each value is `{ name, lon, lat }` — the coordinate lets us project the capital
 * into the shape's own pixel box and mark it with an X on the round reveal.
 */
const CAPITALS = { country: new Map(), admin1: new Map() };

// German states: colloquial aliases beyond NE name / name_en / postal code.
const GERMAN_ALIASES = {
	NW: ['nrw'],
	HB: ['hansestadt bremen'],
	HH: ['hansestadt hamburg']
};

const PROJECTIONS = { mercator: geoMercator, equalEarth: geoEqualEarth, naturalEarth: geoNaturalEarth1 };

// ── Country name aliases (keyed by Natural-Earth NAME_EN) ──────────────────────
// Only extras beyond NAME_DE / NAME_EN / NAME / NAME_LONG, which are always added.
const COUNTRY_ALIASES = {
	'United Kingdom': ['uk', 'großbritannien', 'grossbritannien', 'england', 'great britain', 'britain'],
	Czechia: ['tschechien', 'czech republic'],
	Netherlands: ['holland'],
	Russia: ['russland'],
	'North Macedonia': ['mazedonien', 'macedonia'],
	'Bosnia and Herz.': ['bosnien', 'bosnia', 'herzegowina'],
	Moldova: ['moldau', 'moldawien'],
	'United States of America': ['usa', 'vereinigte staaten', 'amerika', 'america', 'us'],
	Serbia: ['serbien']
};

// Cleaner display names where NE's NAME_EN is the long official form. Answers still
// accept every NE spelling (NAME/NAME_LONG/NAME_DE) plus the ISO code and aliases.
const DISPLAY_NAME = {
	"People's Republic of China": 'China',
	'United States of America': 'United States'
};

// Disputed / non-UN entities to drop from the country categories: their outline is
// carved out of a neighbour (Somaliland out of Somalia, Western Sahara out of Morocco),
// so asking for them as a country is both unfair and mangles the neighbour's shape.
const NON_SOVEREIGN = new Set(['Somaliland', 'Western Sahara', 'W. Sahara']);

// Continents (keyed by Natural-Earth CONTINENT): English display `name` +
// accepted answers (German + English).
const CONTINENTS = {
	Africa: { name: 'Africa', answers: ['Afrika', 'Africa'] },
	Asia: { name: 'Asia', answers: ['Asien', 'Asia'] },
	Europe: { name: 'Europe', answers: ['Europa', 'Europe'] },
	'North America': { name: 'North America', answers: ['Nordamerika', 'North America'] },
	'South America': { name: 'South America', answers: ['Südamerika', 'South America'] },
	Oceania: { name: 'Oceania', answers: ['Ozeanien', 'Oceania', 'Australien', 'Australia'] },
	Antarctica: { name: 'Antarctica', answers: ['Antarktika', 'Antarktis', 'Antarctica'] }
};

// European features to drop (non-sovereign dependencies + indistinct micro-states).
const EUROPE_EXCLUDE = new Set([
	'Guernsey', 'Jersey', 'Isle of Man', 'Aland', 'Åland', 'Faroe Is.', 'Faroe Islands',
	'Vatican', 'Monaco', 'San Marino', 'Liechtenstein', 'Andorra'
]);

/** Area in km² from a feature's spherical geometry. */
function areaKm2(feature) {
	return Math.round(geoArea(feature) * EARTH_R * EARTH_R);
}

// ── Category configs ───────────────────────────────────────────────────────────
// Each: select features → label (display name + answers) → optional info. `assignId`
// pins ids (else they're assigned alphabetically by display name).
const CATEGORIES = {
	german_states: {
		id: 0,
		source: 'ne_10m_admin_1_states_provinces',
		select: (p) => p.iso_a2 === 'DE',
		detail: 0.45,
		projection: 'mercator',
		label: (p) => ({
			name: p.name, // German name (Bayern, Nordrhein-Westfalen…)
			answers: [p.name, p.name_en, p.postal, ...(GERMAN_ALIASES[p.postal] ?? [])].filter(Boolean)
		}),
		// Rich curated info (capital/pop/area/funFact), keyed by postal code.
		info: (_shape, p) => germanStateInfo[p.postal],
		// City-states (Berlin) have no admin-1 capital entry → fall back to the national capital.
		capital: (p) => CAPITALS.admin1.get(`DEU|${p.name}`) ?? CAPITALS.country.get('DEU')
	},

	continents: {
		id: 1,
		source: 'ne_110m_admin_0_countries',
		// Reassign Russia to Asia so "Europe" is the classic shape and Asia keeps Russia.
		remap: (p) => (p.NAME === 'Russia' ? { ...p, CONTINENT: 'Asia' } : p),
		select: (p) => CONTINENTS[p.CONTINENT] != null,
		dissolve: 'CONTINENT',
		detail: 0.8,
		projection: 'naturalEarth',
		minRatio: 0.0008, // keep major islands (Japan, Greenland, NZ, British Isles)
		label: (p) => CONTINENTS[p.CONTINENT],
		info: (shape, p) => ({ areaKm2: areaKm2(shape), funFact: continentFacts[p.CONTINENT] })
	},

	europe: {
		id: 2,
		source: 'ne_50m_admin_0_countries',
		// Keep self-governing countries, drop dependencies. NE suffixes a sovereign's
		// own SOV_A3 when it has dependencies (UK = GB1/GBR, France = FR1/FRA), so the
		// home territory shares the first two letters with ADM0_A3 while a dependency
		// does not (Jersey = GB1/JEY, Åland = FI1/ALD). Micro-states via EUROPE_EXCLUDE.
		select: (p) =>
			p.CONTINENT === 'Europe' &&
			p.SOV_A3.slice(0, 2) === p.ADM0_A3.slice(0, 2) &&
			!EUROPE_EXCLUDE.has(p.NAME),
		detail: 0.45,
		projection: 'mercator',
		trimDeg: 13, // drop overseas territories (France's Guyane/Réunion, Spain's Canaries…)
		label: countryLabel,
		info: (shape, p) => ({
			capital: CAPITALS.country.get(p.ADM0_A3)?.name,
			population: p.POP_EST > 0 ? p.POP_EST : undefined,
			areaKm2: areaKm2(shape),
			funFact: countryFacts[p.ADM0_A3]
		}),
		capital: (p) => CAPITALS.country.get(p.ADM0_A3)
	},

	us_states: {
		id: 3,
		source: 'ne_10m_admin_1_states_provinces',
		select: (p) => p.iso_a2 === 'US' && p.type_en === 'State',
		detail: 0.42,
		projection: 'mercator',
		label: (p) => ({ name: p.name, answers: [p.name, p.name_en, p.postal].filter(Boolean) }),
		info: (shape, p) => ({
			capital: CAPITALS.admin1.get(`USA|${p.name}`)?.name,
			areaKm2: areaKm2(shape),
			funFact: usStateFacts[p.postal]
		}),
		capital: (p) => CAPITALS.admin1.get(`USA|${p.name}`)
	},

	africa: continentCountries('Africa', { id: 4 }),
	asia: continentCountries('Asia', { id: 5 }),
	north_america: continentCountries('North America', { id: 6, trimDeg: 30 }),
	south_america: continentCountries('South America', { id: 7, trimDeg: 10 }),
	oceania: continentCountries('Oceania', { id: 8, trimDeg: 13, minAreaKm2: 30000 })
};

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Build display name + answer aliases for an admin-0 country feature. Display is
 * the international/English name; answers accept German + English + ISO-2 code.
 */
function countryLabel(/** @type {any} */ p) {
	const name = DISPLAY_NAME[p.NAME_EN] ?? DISPLAY_NAME[p.NAME] ?? p.NAME_EN ?? p.NAME;
	const iso = /^[A-Za-z]{2}$/.test(p.ISO_A2) ? p.ISO_A2 : null; // Kürzel (skip NE's "-99")
	const aliases = COUNTRY_ALIASES[p.NAME_EN] ?? COUNTRY_ALIASES[p.NAME] ?? [];
	const answers = [p.NAME_DE, p.NAME_EN, p.NAME, p.NAME_LONG, iso, ...aliases];
	return { name, answers: answers.filter(Boolean) };
}

function continentCountries(continent, { id, minAreaKm2 = 5000, detail = 0.42, projection = 'mercator', trimDeg }) {
	return {
		id,
		source: 'ne_50m_admin_0_countries',
		select: (/** @type {any} */ p) =>
			p.CONTINENT === continent &&
			p.SOV_A3.slice(0, 2) === p.ADM0_A3.slice(0, 2) &&
			!NON_SOVEREIGN.has(p.NAME_EN) &&
			!NON_SOVEREIGN.has(p.NAME),
		detail,
		projection,
		minAreaKm2,
		trimDeg,
		label: countryLabel,
		info: (/** @type {any} */ shape, /** @type {any} */ p) => ({
			capital: CAPITALS.country.get(p.ADM0_A3)?.name,
			population: p.POP_EST > 0 ? p.POP_EST : undefined,
			areaKm2: areaKm2(shape),
			funFact: countryFacts[p.ADM0_A3]
		}),
		capital: (/** @type {any} */ p) => CAPITALS.country.get(p.ADM0_A3)
	};
}

/** Fetch (and cache) a Natural-Earth GeoJSON FeatureCollection. */
async function loadSource(name) {
	mkdirSync(CACHE, { recursive: true });
	const file = join(CACHE, `${name}.geojson`);
	if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
	const url = `${NE_BASE}${name}.geojson`;
	console.log(`  fetching ${url}`);
	const res = await fetch(url);
	if (!res.ok) throw new Error(`fetch ${name}: ${res.status}`);
	const text = await res.text();
	writeFileSync(file, text);
	return JSON.parse(text);
}

/**
 * Visvalingam-simplify (and optionally dissolve) a set of features via TopoJSON.
 * Building a topology means shared borders simplify consistently and `merge`
 * dissolves polygons that share arcs (countries → continents).
 *
 * `detail` is the topojson `quantile` fraction (0–1): higher keeps more points
 * (less simplification), lower is more aggressive. TopoJSON/d3 keep the
 * pre-RFC 7946 ring winding that d3-geo expects, so no winding fix is needed.
 */
function processFeatures(features, { detail, dissolve }) {
	const topo = presimplify(topology({ data: { type: 'FeatureCollection', features } }));
	const simplified = topoSimplify(topo, quantile(topo, detail));
	const geometries = simplified.objects.data.geometries;

	if (!dissolve) return geometries.map((g) => feature(simplified, g));

	const groups = new Map();
	for (const g of geometries) {
		const key = g.properties[dissolve];
		(groups.get(key) ?? groups.set(key, []).get(key)).push(g);
	}
	return [...groups].map(([key, gs]) => ({
		type: 'Feature',
		properties: { [dissolve]: key },
		geometry: merge(simplified, gs)
	}));
}

const round1 = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/**
 * Project a feature's rings to pixel space and emit an SVG path, dropping points
 * within MIN_SEG_PX of the previous one (sub-pixel detail is invisible at this
 * scale and dominates file size on dense coastlines). Holes are kept as separate
 * subpaths so the nonzero fill-rule cuts them out (e.g. Lesotho in South Africa).
 */
function buildPath(feature, proj) {
	const g = feature.geometry;
	const polys = g.type === 'MultiPolygon' ? g.coordinates : g.type === 'Polygon' ? [g.coordinates] : [];
	let d = '';
	for (const rings of polys) {
		for (const ring of rings) {
			const pts = [];
			let last = null;
			for (const coord of ring) {
				const p = proj(coord);
				if (!p || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) continue;
				if (last && Math.hypot(p[0] - last[0], p[1] - last[1]) < MIN_SEG_PX) continue;
				pts.push(p);
				last = p;
			}
			if (pts.length < 3) continue; // drop degenerate rings
			d += 'M' + pts.map((p) => `${round1(p[0])},${round1(p[1])}`).join('L') + 'Z';
		}
	}
	return d || null;
}

/** Decompose a (Multi)Polygon feature into per-polygon area + centroid. */
function polygonsOf(feature) {
	const g = feature.geometry;
	const rings = g.type === 'MultiPolygon' ? g.coordinates : g.type === 'Polygon' ? [g.coordinates] : [];
	return rings.map((coordinates) => {
		const poly = { type: 'Polygon', coordinates };
		return { coordinates, area: geoArea(poly), centroid: geoCentroid(poly) };
	});
}

function fromPolygons(feature, polys) {
	return { ...feature, geometry: { type: 'MultiPolygon', coordinates: polys.map((p) => p.coordinates) } };
}

/**
 * Drop polygons far from a country's largest landmass (e.g. France's overseas
 * départements), which would otherwise blow up the bounding box and shrink the
 * mainland to a dot. Nearby islands (Sicily, Crete, Balearics…) are kept.
 */
function trimToMainland(feature, maxDeg) {
	const polys = polygonsOf(feature);
	if (polys.length < 2) return feature;
	const main = polys.reduce((a, b) => (b.area > a.area ? b : a));
	const maxRad = (maxDeg * Math.PI) / 180;
	const kept = polys.filter((p) => p === main || geoDistance(main.centroid, p.centroid) <= maxRad);
	return kept.length === polys.length ? feature : fromPolygons(feature, kept);
}

/**
 * Drop tiny islands/islets (area < `minRatio` × the largest polygon). At 10m
 * resolution a single coastline holds thousands of specks that bloat the output
 * and don't aid recognition; the largest landmass and major islands are kept.
 */
function pruneIslands(feature, minRatio) {
	const polys = polygonsOf(feature);
	if (polys.length < 2) return feature;
	const maxArea = Math.max(...polys.map((p) => p.area));
	const kept = polys.filter((p) => p.area >= minRatio * maxArea);
	return kept.length === polys.length ? feature : fromPolygons(feature, kept);
}

/** The geometry that actually gets shown: overseas territories + tiny islets removed. */
function prepareShape(feature, { trimDeg, minRatio }) {
	const trimmed = trimDeg ? trimToMainland(feature, trimDeg) : feature;
	return pruneIslands(trimmed, minRatio ?? DEFAULT_MIN_RATIO);
}

/** Build the projection that fits a prepared shape, on its own, into a SIZE box. */
function projectionFor(shape, { projection }) {
	const [lon, lat] = geoCentroid(shape);
	if (lat < -60) {
		// South-polar shape (Antarctica): a cylindrical projection flattens it into a
		// sliver, so use an azimuthal projection centred on the pole for the round outline.
		return geoAzimuthalEqualArea().rotate([-lon, 90]).fitSize([SIZE, SIZE], shape);
	}
	const make = PROJECTIONS[projection] ?? geoMercator;
	return make().rotate([-lon, 0]).fitSize([SIZE, SIZE], shape); // re-center meridian → no antimeridian wrap
}

/**
 * Project a capital's lon/lat with the shape's own projection. Returns a rounded
 * `[x, y]` in the SIZE box, or null if it lands outside (trimmed/simplified away).
 */
function projectCapital(cap, proj) {
	if (!cap || !Number.isFinite(cap.lon) || !Number.isFinite(cap.lat)) return null;
	const xy = proj([cap.lon, cap.lat]);
	if (!xy || !Number.isFinite(xy[0]) || !Number.isFinite(xy[1])) return null;
	if (xy[0] < 0 || xy[0] > SIZE || xy[1] < 0 || xy[1] > SIZE) return null;
	return [Number(round1(xy[0])), Number(round1(xy[1]))];
}

/** Load Natural-Earth populated places → national + admin-1 capital lookups (name + coord). */
async function loadCapitals() {
	const pp = await loadSource('ne_10m_populated_places');
	for (const f of pp.features) {
		const p = f.properties;
		const [lon, lat] = f.geometry?.coordinates ?? [];
		if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
		if (p.ADM0CAP === 1 && p.ADM0_A3) CAPITALS.country.set(p.ADM0_A3, { name: p.NAME, lon, lat });
		if (p.FEATURECLA === 'Admin-1 capital' && p.ADM0_A3 && p.ADM1NAME)
			CAPITALS.admin1.set(`${p.ADM0_A3}|${p.ADM1NAME}`, { name: p.NAME, lon, lat });
	}
}

/** Serialize a `{ id: value }` map as pretty JS object source. */
function serializeMap(map, { quote = false } = {}) {
	const ids = Object.keys(map)
		.map(Number)
		.sort((a, b) => a - b);
	const lines = ids.map((id) => {
		const v = map[id];
		const value = quote ? JSON.stringify(v) : JSON.stringify(v);
		return `\t${id}: ${value}`;
	});
	return `{\n${lines.join(',\n')}\n}`;
}

// ── Build one category ───────────────────────────────────────────────────────────
async function build(key) {
	const cfg = CATEGORIES[key];
	if (!cfg) throw new Error(`unknown category: ${key}`);
	console.log(`\n▶ ${key} (id ${cfg.id}) from ${cfg.source}`);

	const fc = await loadSource(cfg.source);
	let features = fc.features;
	if (cfg.remap) features = features.map((f) => ({ ...f, properties: cfg.remap(f.properties) }));
	features = features.filter((f) => f.geometry && cfg.select(f.properties));
	console.log(`  selected ${features.length} features`);

	const simplified = processFeatures(features, cfg);

	// Build one item per feature: prepared geometry → path, display name, answers, info.
	const items = [];
	for (const f of simplified) {
		const p = f.properties;
		const label = cfg.label(p);
		if (!label?.name) continue;
		const shape = prepareShape(f, cfg);
		if (cfg.minAreaKm2 && areaKm2(shape) < cfg.minAreaKm2) continue; // drop unguessable micro-states
		const proj = projectionFor(shape, cfg);
		const d = buildPath(shape, proj);
		if (!d) {
			console.warn(`  ! could not project ${label.name}`);
			continue;
		}
		const capital = projectCapital(cfg.capital?.(p), proj);
		items.push({ p, path: d, name: label.name, answers: dedupAnswers([label.name, ...label.answers]), info: cfg.info?.(shape, p), capital });
	}

	/** @type {Record<number, string>} */ const paths = {};
	/** @type {Record<number, string>} */ const names = {};
	/** @type {Record<number, string[]>} */ const answers = {};
	/** @type {Record<number, object>} */ const info = {};
	/** @type {Record<number, [number, number]>} */ const capitals = {};
	const put = (id, it) => {
		paths[id] = it.path;
		names[id] = it.name;
		answers[id] = it.answers;
		if (it.info) info[id] = it.info;
		if (it.capital) capitals[id] = it.capital;
	};

	if (cfg.assignId) {
		for (const it of items) {
			const id = cfg.assignId(it.p);
			if (id == null) console.warn(`  ! no id for ${it.name}`);
			else put(id, it);
		}
	} else {
		items.sort((a, b) => a.name.localeCompare(b.name, 'en')).forEach((it, id) => put(id, it));
	}

	writeCategoryFile(key, cfg, { paths, names, answers, info, capitals });
	const count = Object.keys(paths).length;
	console.log(`  → ${count} shapes`);
	return count;
}

/** Dedup answers case/accent-insensitively (the server normalizes the same way). */
function dedupAnswers(list) {
	const seen = new Set();
	const out = [];
	for (const a of list) {
		const k = String(a).toLowerCase().replace(/[^a-z0-9]/gi, '');
		if (k && !seen.has(k)) (seen.add(k), out.push(String(a)));
	}
	return out;
}

function writeCategoryFile(key, cfg, { paths, names, answers, info, capitals }) {
	const header = `// AUTO-GENERATED by scripts/build-shapes.mjs — do not edit by hand.\n// Source: Natural Earth (${cfg.source}). Each shape fills a ${SIZE}×${SIZE} box.\n`;
	let body = `${header}\nexport const paths = ${serializeMap(paths)};\n`;
	body += `\nexport const names = ${serializeMap(names)};\n`;
	body += `\nexport const answers = ${serializeMap(answers)};\n`;
	if (Object.keys(info).length) body += `\nexport const info = ${serializeMap(info)};\n`;
	if (capitals && Object.keys(capitals).length)
		body += `\n// Capital marker position [x, y] in the ${SIZE}×${SIZE} box.\nexport const capitals = ${serializeMap(capitals)};\n`;
	const file = join(OUT_DIR, `${key}_paths.js`);
	writeFileSync(file, body);
	const kb = (Buffer.byteLength(body) / 1024).toFixed(1);
	console.log(`  wrote ${file.replace(ROOT + '/', '')} (${kb} KB)`);
}

// ── Main ────────────────────────────────────────────────────────────────────────
const requested = process.argv.slice(2);
const keys = requested.length ? requested : Object.keys(CATEGORIES);
await loadCapitals();
for (const key of keys) await build(key);
console.log('\n✓ done');
