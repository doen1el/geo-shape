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
import { germanStateInfo, continentFacts, continentStats, countryFacts, usStateFacts } from './fun-facts.js';

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

/**
 * Country adjacency, derived from shared border vertices — Natural Earth gives
 * neighbouring countries coincident boundary points, so two countries that share
 * ≥ NEIGHBOR_MIN_SHARED rounded vertices have a real land border (not a corner touch).
 * Filled by loadNeighbors(); lets a guess of a bordering country score "close".
 */
const NEIGHBORS = new Map(); // ADM0_A3 -> Set<ADM0_A3>
const COUNTRY_LABEL_BY_A3 = new Map(); // ADM0_A3 -> { name, nameDe, answers }
const COUNTRY_CONTEXT_BY_A3 = new Map(); // ADM0_A3 -> coarsely simplified feature (reveal backdrop)
const COUNTRY_LON_BY_A3 = new Map(); // ADM0_A3 -> centroid longitude (for distance culling)
const NEIGHBOR_MIN_SHARED = 2;
const CONTEXT_DETAIL = 0.2; // coarse simplification for neighbour backdrops (they're behind the answer)

// State/province adjacency within a single country (admin_1), for the states modes.
const ADMIN1_NEIGHBORS = new Map(); // "iso_a2|name" -> Set<"iso_a2|name">
const ADMIN1_PROPS_BY_KEY = new Map(); // "iso_a2|name" -> raw NE properties
const ADMIN1_CONTEXT_BY_KEY = new Map(); // "iso_a2|name" -> coarse feature (reveal backdrop)

// A candidate this far (in longitude °) from the target can't legitimately sit in the
// box, and near the antimeridian Mercator would wrap it across the frame — so cull it.
const CONTEXT_MAX_LON_DEG = 120;
const lonGap = (/** @type {number} */ a, /** @type {number} */ b) => {
	const d = Math.abs(a - b) % 360;
	return d > 180 ? 360 - d : d;
};

const LABEL_FONT = 30; // must match .nb-label font-size in ShapeCanvas.svelte
const LABEL_MIN_AREA = 14000; // label a region only once a real chunk of it is on screen (declutter)
const CONTEXT_MIN_AREA = 400; // draw (grey-fill) any surrounding region at least this visible
const ADMIN1_OWN_A3 = { US: 'USA', DE: 'DEU' }; // a states mode's own country (excluded from the foreign backdrop)
const STATE_MODE_ISO = new Set(['DE', 'US']); // countries whose admin_1 states get a backdrop

// Overseas-territory artefacts: borders that exist only through a far-flung territory
// the game doesn't draw. France's mainland is shown, but its ADM0 outline includes
// French Guiana, which borders Brazil and Suriname — so drop those pairs (keys sorted).
const NEIGHBOR_EXCLUDE = new Set(['BRA|FRA', 'FRA|SUR']);

// German states: colloquial aliases beyond NE name / name_en / postal code.
const GERMAN_ALIASES = {
	NW: ['nrw'],
	HB: ['hansestadt bremen'],
	HH: ['hansestadt hamburg']
};

// English names for the 16 German states
const GERMAN_STATE_EN = {
	BW: 'Baden-Württemberg', BY: 'Bavaria', BE: 'Berlin', BB: 'Brandenburg',
	HB: 'Bremen', HH: 'Hamburg', HE: 'Hesse', MV: 'Mecklenburg-Western Pomerania',
	NI: 'Lower Saxony', NW: 'North Rhine-Westphalia', RP: 'Rhineland-Palatinate',
	SL: 'Saarland', SN: 'Saxony', ST: 'Saxony-Anhalt', SH: 'Schleswig-Holstein', TH: 'Thuringia'
};

const stateCode = (/** @type {any} */ p) => p.code_hasc?.split('.')[1] || p.postal;

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
const NON_SOVEREIGN = new Set([
	'Somaliland', 'Western Sahara', 'W. Sahara',
	'Baikonur', 'Bir Tawil', 'Southern Patagonian Ice Field', 'Cyprus U.N. Buffer Zone',
	'Scarborough Reef', 'Spratly Is.', 'Bajo Nuevo Bank', 'Serranilla Bank', 'Brazilian I.'
]);

const CONTINENTS = {
	Africa: { name: 'Africa', nameDe: 'Afrika', answers: ['Afrika', 'Africa'] },
	Asia: { name: 'Asia', nameDe: 'Asien', answers: ['Asien', 'Asia'] },
	Europe: { name: 'Europe', nameDe: 'Europa', answers: ['Europa', 'Europe'] },
	'North America': { name: 'North America', nameDe: 'Nordamerika', answers: ['Nordamerika', 'North America'] },
	'South America': { name: 'South America', nameDe: 'Südamerika', answers: ['Südamerika', 'South America'] },
	Oceania: { name: 'Oceania', nameDe: 'Ozeanien', answers: ['Ozeanien', 'Oceania', 'Australien', 'Australia'] },
	Antarctica: { name: 'Antarctica', nameDe: 'Antarktika', answers: ['Antarktika', 'Antarktis', 'Antarctica'] }
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

/**
 * Capital name pair (English + German) for spreading into an info object. Keys are
 * `undefined` — and thus dropped by JSON.stringify — when the capital is unknown.
 */
const capNames = (cap) => ({ capital: cap?.name, capitalDe: cap?.nameDe });

/** Display name + answers for a German state (English display, German + code answers). */
const germanStateLabel = (/** @type {any} */ p) => {
	const code = stateCode(p);
	return {
		name: GERMAN_STATE_EN[code] ?? p.name,
		nameDe: p.name,
		answers: [p.name, p.name_en, code, ...(GERMAN_ALIASES[code] ?? [])].filter(Boolean)
	};
};

/** Display name + answers for a US state. */
const usStateLabel = (/** @type {any} */ p) => ({
	name: p.name,
	answers: [p.name, p.name_en, p.postal].filter(Boolean)
});

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
		label: germanStateLabel,

		info: (_shape, p) => {
			const base = germanStateInfo[stateCode(p)];
			if (!base) return base;
			const cap = CAPITALS.admin1.get(`DEU|${p.name}`) ?? CAPITALS.country.get('DEU');
			return { ...base, capital: cap?.name ?? base.capital, capitalDe: cap?.nameDe ?? base.capital };
		},
		neighbors: (p) => admin1NeighborAliases(p, germanStateLabel),
		context: 'admin1',
		capital: (p) => CAPITALS.admin1.get(`DEU|${p.name}`) ?? CAPITALS.country.get('DEU')
	},

	continents: {
		id: 1,
		source: 'ne_10m_admin_0_countries',
		// Reassign Russia to Asia so "Europe" is the classic shape and Asia keeps Russia.
		remap: (p) => (p.NAME === 'Russia' ? { ...p, CONTINENT: 'Asia' } : p),
		select: (p) => CONTINENTS[p.CONTINENT] != null,
		dissolve: 'CONTINENT',
		detail: 0.8,
		projection: 'naturalEarth',
		minRatio: 0.0008, // keep major islands (Japan, Greenland, NZ, British Isles)
		label: (p) => CONTINENTS[p.CONTINENT],
		info: (shape, p) => ({
			...continentStats[p.CONTINENT],
			areaKm2: areaKm2(shape),
			funFact: continentFacts[p.CONTINENT]
		})
	},

	europe: {
		id: 2,
		source: 'ne_10m_admin_0_countries',
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
			...capNames(CAPITALS.country.get(p.ADM0_A3)),
			population: p.POP_EST > 0 ? p.POP_EST : undefined,
			areaKm2: areaKm2(shape),
			funFact: countryFacts[p.ADM0_A3]
		}),
		neighbors: (p) => neighborAliases(p.ADM0_A3),
		context: 'country',
		capital: (p) => CAPITALS.country.get(p.ADM0_A3)
	},

	us_states: {
		id: 3,
		source: 'ne_10m_admin_1_states_provinces',
		select: (p) => p.iso_a2 === 'US' && p.type_en === 'State',
		detail: 0.42,
		projection: 'mercator',
		label: usStateLabel,
		info: (shape, p) => ({
			...capNames(CAPITALS.admin1.get(`USA|${p.name}`)),
			areaKm2: areaKm2(shape),
			funFact: usStateFacts[p.postal]
		}),
		neighbors: (p) => admin1NeighborAliases(p, usStateLabel),
		context: 'admin1',
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
	return { name, nameDe: p.NAME_DE || name, answers: answers.filter(Boolean) };
}

function continentCountries(continent, { id, minAreaKm2 = 5000, detail = 0.42, projection = 'mercator', trimDeg }) {
	return {
		id,
		source: 'ne_10m_admin_0_countries',
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
			...capNames(CAPITALS.country.get(p.ADM0_A3)),
			population: p.POP_EST > 0 ? p.POP_EST : undefined,
			areaKm2: areaKm2(shape),
			funFact: countryFacts[p.ADM0_A3]
		}),
		neighbors: (/** @type {any} */ p) => neighborAliases(p.ADM0_A3),
		context: 'country',
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
		// NAME is the English/international name; NAME_DE gives the German exonym
		// (Moscow → Moskau, Rome → Rom) so the info panel can localize the capital.
		const names = { name: p.NAME, nameDe: p.NAME_DE || p.NAME };
		if (p.ADM0CAP === 1 && p.ADM0_A3) CAPITALS.country.set(p.ADM0_A3, { ...names, lon, lat });
		if (p.FEATURECLA === 'Admin-1 capital' && p.ADM0_A3 && p.ADM1NAME)
			CAPITALS.admin1.set(`${p.ADM0_A3}|${p.ADM1NAME}`, { ...names, lon, lat });
	}
}

/** Compute country adjacency from coincident border vertices (fills NEIGHBORS). */
async function loadNeighbors() {
	const fc = await loadSource('ne_10m_admin_0_countries');
	const round = (/** @type {number} */ n) => n.toFixed(4);
	const eachPoint = (/** @type {any} */ coords, /** @type {(pt: number[]) => void} */ cb) => {
		if (typeof coords[0] === 'number') return cb(coords);
		for (const c of coords) eachPoint(c, cb);
	};

	const coordCountries = new Map(); // "x,y" -> Set<ADM0_A3>
	for (const f of fc.features) {
		const a3 = f.properties.ADM0_A3;
		if (!a3 || !f.geometry) continue;
		COUNTRY_LABEL_BY_A3.set(a3, countryLabel(f.properties));
		const seen = new Set(); // one vote per country per coordinate
		eachPoint(f.geometry.coordinates, ([x, y]) => {
			const k = `${round(x)},${round(y)}`;
			if (seen.has(k)) return;
			seen.add(k);
			let set = coordCountries.get(k);
			if (!set) coordCountries.set(k, (set = new Set()));
			set.add(a3);
		});
	}

	const shared = new Map(); // "A|B" -> shared vertex count
	for (const set of coordCountries.values()) {
		if (set.size < 2) continue;
		const list = [...set];
		for (let i = 0; i < list.length; i++)
			for (let j = i + 1; j < list.length; j++) {
				const key = list[i] < list[j] ? `${list[i]}|${list[j]}` : `${list[j]}|${list[i]}`;
				shared.set(key, (shared.get(key) ?? 0) + 1);
			}
	}
	for (const [key, count] of shared) {
		if (count < NEIGHBOR_MIN_SHARED || NEIGHBOR_EXCLUDE.has(key)) continue;
		const [a, b] = key.split('|');
		if (!NEIGHBORS.has(a)) NEIGHBORS.set(a, new Set());
		if (!NEIGHBORS.has(b)) NEIGHBORS.set(b, new Set());
		NEIGHBORS.get(a).add(b);
		NEIGHBORS.get(b).add(a);
	}
}

/**
 * Compute state/province adjacency *within* each of the given countries (admin_1),
 * so the states modes can score a bordering state as "close". Fills ADMIN1_NEIGHBORS.
 * @param {string[]} isoCodes ISO-2 country codes to include (e.g. ['DE', 'US'])
 */
async function loadAdmin1Neighbors(isoCodes) {
	const want = new Set(isoCodes);
	const fc = await loadSource('ne_10m_admin_1_states_provinces');
	const round = (/** @type {number} */ n) => n.toFixed(4);
	const eachPoint = (/** @type {any} */ coords, /** @type {(pt: number[]) => void} */ cb) => {
		if (typeof coords[0] === 'number') return cb(coords);
		for (const c of coords) eachPoint(c, cb);
	};

	const coordRegions = new Map(); // "x,y" -> Set<"iso_a2|name">
	for (const f of fc.features) {
		const p = f.properties;
		if (!want.has(p.iso_a2) || !f.geometry) continue;
		const rk = `${p.iso_a2}|${p.name}`;
		ADMIN1_PROPS_BY_KEY.set(rk, p);
		const seen = new Set();
		eachPoint(f.geometry.coordinates, ([x, y]) => {
			const k = `${round(x)},${round(y)}`;
			if (seen.has(k)) return;
			seen.add(k);
			let set = coordRegions.get(k);
			if (!set) coordRegions.set(k, (set = new Set()));
			set.add(rk);
		});
	}

	const shared = new Map(); // "A||B" -> shared vertex count ("||" avoids the key's own "|")
	for (const set of coordRegions.values()) {
		if (set.size < 2) continue;
		const list = [...set];
		for (let i = 0; i < list.length; i++)
			for (let j = i + 1; j < list.length; j++) {
				const a = list[i], b = list[j];
				if (a.split('|')[0] !== b.split('|')[0]) continue; // only within the same country
				const key = a < b ? `${a}||${b}` : `${b}||${a}`;
				shared.set(key, (shared.get(key) ?? 0) + 1);
			}
	}
	for (const [key, count] of shared) {
		if (count < NEIGHBOR_MIN_SHARED) continue;
		const [a, b] = key.split('||');
		if (!ADMIN1_NEIGHBORS.has(a)) ADMIN1_NEIGHBORS.set(a, new Set());
		if (!ADMIN1_NEIGHBORS.has(b)) ADMIN1_NEIGHBORS.set(b, new Set());
		ADMIN1_NEIGHBORS.get(a).add(b);
		ADMIN1_NEIGHBORS.get(b).add(a);
	}
}

/**
 * Coarse backdrop outlines for the reveal. Countries and the DE/US states are
 * simplified in ONE shared topology, so a state↔country border (their raw vertices
 * already coincide) simplifies to the *same* line — no double outlines at the seam.
 */
async function loadContextGeometry() {
	const a0 = await loadSource('ne_10m_admin_0_countries');
	const a1 = await loadSource('ne_10m_admin_1_states_provinces');
	const feats = [
		...a0.features
			.filter((f) => f.properties.ADM0_A3 && f.geometry)
			.map((f) => ({ ...f, properties: { ...f.properties, _ctx: 'c' } })),
		...a1.features
			.filter((f) => STATE_MODE_ISO.has(f.properties.iso_a2) && f.geometry)
			.map((f) => ({ ...f, properties: { ...f.properties, _ctx: 's' } }))
	];
	for (const g of processFeatures(feats, { detail: CONTEXT_DETAIL })) {
		if (g.properties._ctx === 'c') {
			COUNTRY_CONTEXT_BY_A3.set(g.properties.ADM0_A3, g);
			COUNTRY_LON_BY_A3.set(g.properties.ADM0_A3, geoCentroid(g)[0]);
		} else {
			ADMIN1_CONTEXT_BY_KEY.set(`${g.properties.iso_a2}|${g.properties.name}`, g);
		}
	}
}

/**
 * Guessable names for every country bordering `a3`. Aliases shorter than 3 chars
 * (bare ISO codes) are dropped so a stray two-letter typo can't trigger "close".
 */
function neighborAliases(/** @type {string} */ a3) {
	const out = [];
	const seen = new Set();
	for (const nb of NEIGHBORS.get(a3) ?? []) {
		const label = COUNTRY_LABEL_BY_A3.get(nb);
		if (!label) continue;
		for (const alias of [label.name, label.nameDe, ...label.answers]) {
			if (!alias || alias.length < 3) continue;
			const k = String(alias).toLowerCase().replace(/[^a-z0-9]/gi, '');
			if (k && !seen.has(k)) (seen.add(k), out.push(alias));
		}
	}
	return out;
}

/**
 * Guessable names for every state bordering `p` within the same country. `labelFn`
 * is the category's own label builder, so aliases match how a state is guessed.
 */
function admin1NeighborAliases(/** @type {any} */ p, /** @type {(props: any) => any} */ labelFn) {
	const out = [];
	const seen = new Set();
	const selfKey = `${p.iso_a2}|${p.name}`;
	for (const nbKey of ADMIN1_NEIGHBORS.get(selfKey) ?? []) {
		const np = ADMIN1_PROPS_BY_KEY.get(nbKey);
		if (!np) continue;
		const label = labelFn(np);
		for (const alias of [label.name, label.nameDe, ...(label.answers ?? [])]) {
			if (!alias || String(alias).length < 3) continue;
			const k = String(alias).toLowerCase().replace(/[^a-z0-9]/gi, '');
			if (k && !seen.has(k)) (seen.add(k), out.push(alias));
		}
	}
	return out;
}

const CONTEXT_CLIP_MARGIN = 16; // clip just past the padded viewBox (±12) so fill reaches the frame, no further

/** Sutherland–Hodgman: clip a projected ring to the axis-aligned box [minX,minY]-[maxX,maxY]. */
function clipRing(/** @type {number[][]} */ pts, minX, minY, maxX, maxY) {
	const clip = (input, inside, cut) => {
		const out = [];
		for (let i = 0; i < input.length; i++) {
			const cur = input[i];
			const prev = input[(i + input.length - 1) % input.length];
			const ci = inside(cur), pi = inside(prev);
			if (ci) {
				if (!pi) out.push(cut(prev, cur));
				out.push(cur);
			} else if (pi) {
				out.push(cut(prev, cur));
			}
		}
		return out;
	};
	const atX = (a, b, X) => [X, a[1] + ((X - a[0]) / (b[0] - a[0])) * (b[1] - a[1])];
	const atY = (a, b, Y) => [a[0] + ((Y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]), Y];
	let r = pts;
	r = clip(r, (p) => p[0] >= minX, (a, b) => atX(a, b, minX)); if (r.length < 3) return [];
	r = clip(r, (p) => p[0] <= maxX, (a, b) => atX(a, b, maxX)); if (r.length < 3) return [];
	r = clip(r, (p) => p[1] >= minY, (a, b) => atY(a, b, minY)); if (r.length < 3) return [];
	r = clip(r, (p) => p[1] <= maxY, (a, b) => atY(a, b, maxY));
	return r.length < 3 ? [] : r;
}

/** Shoelace area of a closed ring in pixel space. */
function ringArea(/** @type {number[][]} */ r) {
	let a = 0;
	for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += r[j][0] * r[i][1] - r[i][0] * r[j][1];
	return Math.abs(a) / 2;
}

/** Signed distance from (x,y) to a closed ring: positive inside, negative outside. */
function pointToRingDist(/** @type {number} */ x, /** @type {number} */ y, /** @type {number[][]} */ r) {
	let inside = false;
	let minSq = Infinity;
	for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
		const a = r[i], b = r[j];
		if ((a[1] > y) !== (b[1] > y) && x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
		// distance² to segment a–b
		const dx = b[0] - a[0], dy = b[1] - a[1];
		let t = dx || dy ? ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy) : 0;
		t = Math.max(0, Math.min(1, t));
		const px = a[0] + t * dx - x, py = a[1] + t * dy - y;
		minSq = Math.min(minSq, px * px + py * py);
	}
	return (inside ? 1 : -1) * Math.sqrt(minSq);
}

/**
 * Pole of inaccessibility: the interior point farthest from the ring's edges — the
 * best spot for a label, since it's always well inside the (possibly crescent-shaped)
 * visible region, unlike the centroid which can fall outside.
 */
function visualCenter(/** @type {number[][]} */ ring) {
	let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
	for (const p of ring) {
		if (p[0] < x0) x0 = p[0];
		if (p[0] > x1) x1 = p[0];
		if (p[1] < y0) y0 = p[1];
		if (p[1] > y1) y1 = p[1];
	}
	const w = x1 - x0, h = y1 - y0;
	if (w <= 0 || h <= 0) return [(x0 + x1) / 2, (y0 + y1) / 2];
	let best = [(x0 + x1) / 2, (y0 + y1) / 2];
	let bestD = pointToRingDist(best[0], best[1], ring);
	const n = 10, sx = w / n, sy = h / n;
	for (let i = 0; i <= n; i++)
		for (let j = 0; j <= n; j++) {
			const x = x0 + i * sx, y = y0 + j * sy;
			const d = pointToRingDist(x, y, ring);
			if (d > bestD) (bestD = d), (best = [x, y]);
		}
	for (let step = Math.min(sx, sy); step > 1; step /= 2)
		for (const [dx, dy] of [[-step, 0], [step, 0], [0, -step], [0, step]]) {
			const d = pointToRingDist(best[0] + dx, best[1] + dy, ring);
			if (d > bestD) (bestD = d), (best = [best[0] + dx, best[1] + dy]);
		}
	return best;
}

/** Area-weighted centroid of a closed ring (falls back to the vertex mean if degenerate). */
function ringCentroid(/** @type {number[][]} */ r) {
	let a = 0, cx = 0, cy = 0;
	for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
		const f = r[j][0] * r[i][1] - r[i][0] * r[j][1];
		a += f;
		cx += (r[j][0] + r[i][0]) * f;
		cy += (r[j][1] + r[i][1]) * f;
	}
	if (Math.abs(a) < 1e-6)
		return [r.reduce((s, p) => s + p[0], 0) / r.length, r.reduce((s, p) => s + p[1], 0) / r.length];
	return [cx / (3 * a), cy / (3 * a)];
}

const fmtPt = (/** @type {number[]} */ p) => `${round1(p[0])},${round1(p[1])}`;

/**
 * Split a clipped ring into a stroked outline of only its *real* edges: segments
 * that lie along the clip rectangle (the frame) are dropped, so the frame never
 * gets a hard black line — the grey fill simply runs off the edge of the canvas.
 */
function ringStroke(/** @type {number[][]} */ r, m) {
	const n = r.length;
	const onFrame = (/** @type {number[]} */ a, /** @type {number[]} */ b) =>
		(a[0] <= -m + 1e-3 && b[0] <= -m + 1e-3) ||
		(a[0] >= SIZE + m - 1e-3 && b[0] >= SIZE + m - 1e-3) ||
		(a[1] <= -m + 1e-3 && b[1] <= -m + 1e-3) ||
		(a[1] >= SIZE + m - 1e-3 && b[1] >= SIZE + m - 1e-3);
	const real = [];
	for (let i = 0; i < n; i++) real.push(!onFrame(r[i], r[(i + 1) % n]));
	if (real.every(Boolean)) return 'M' + r.map(fmtPt).join('L') + 'Z'; // wholly inside → closed loop
	const start = real.indexOf(false); // begin after a frame edge so real runs don't wrap
	let out = '';
	let run = null;
	for (let k = 0; k < n; k++) {
		const i = (start + k) % n;
		if (real[i]) (run ??= [r[i]]).push(r[(i + 1) % n]);
		else {
			if (run && run.length >= 2) out += 'M' + run.map(fmtPt).join('L');
			run = null;
		}
	}
	if (run && run.length >= 2) out += 'M' + run.map(fmtPt).join('L');
	return out;
}

/**
 * Project a neighbour's outline with the target's projection and clip it to the box.
 * Returns a `path` (closed, for fill) and `border` (open polylines of only the real
 * coastline/borders, so the frame edge isn't stroked), plus the label anchor + area.
 */
function projectNeighbor(/** @type {any} */ feature, /** @type {any} */ proj) {
	const g = feature.geometry;
	const polys = g.type === 'MultiPolygon' ? g.coordinates : g.type === 'Polygon' ? [g.coordinates] : [];
	const m = CONTEXT_CLIP_MARGIN;
	let fill = '';
	let border = '';
	let fillArea = 0; // margin-clipped area → is any of it worth drawing at all?
	let visArea = 0; // box-clipped area → how much is actually on screen (for labelling)
	let best = null; // largest on-screen ring → label anchor
	for (const rings of polys)
		for (const ring of rings) {
			const pts = [];
			let last = null;
			for (const c of ring) {
				const p = proj(c);
				if (!p || !Number.isFinite(p[0]) || !Number.isFinite(p[1])) continue;
				if (last && Math.hypot(p[0] - last[0], p[1] - last[1]) < MIN_SEG_PX) continue;
				pts.push(p);
				last = p;
			}
			if (pts.length < 3) continue;
			const clipped = clipRing(pts, -m, -m, SIZE + m, SIZE + m);
			if (clipped.length >= 3) {
				fill += 'M' + clipped.map(fmtPt).join('L') + 'Z';
				border += ringStroke(clipped, m);
				fillArea += ringArea(clipped);
			}
			// Separate clip to the box itself measures the truly-visible extent, so a band
			// pinned to the frame (few vertices, big area) still labels correctly.
			const inBox = clipRing(pts, 0, 0, SIZE, SIZE);
			if (inBox.length >= 3) {
				const va = ringArea(inBox);
				visArea += va;
				if (!best || va > best.area) best = { area: va, ring: inBox };
			}
		}
	if (!fill) return null;
	return { path: fill, border, fillArea, visArea, ring: best?.ring ?? null };
}

/**
 * A backdrop entry `{ name, nameDe, path, cx?, cy? }`. The label is dropped when the
 * visible sliver is tiny, and otherwise clamped so the whole word stays inside the box.
 */
function contextEntry(/** @type {any} */ label, /** @type {any} */ projd) {
	const entry = { name: label.name, nameDe: label.nameDe ?? label.name, path: projd.path, border: projd.border };
	// Only label a region when a real chunk is on screen — not a thin edge sliver.
	if (!projd.ring || projd.visArea < LABEL_MIN_AREA) return entry;
	// Anchor deep inside the visible region so the label never bleeds into a neighbour.
	const [cx, cy] = visualCenter(projd.ring);
	const maxLen = Math.max(String(entry.name).length, String(entry.nameDe).length);
	const halfW = Math.min(SIZE * 0.46, (maxLen * LABEL_FONT * 0.62) / 2);
	const halfH = LABEL_FONT * 0.6;
	entry.cx = Number(round1(Math.max(halfW + 8, Math.min(SIZE - halfW - 8, cx))));
	entry.cy = Number(round1(Math.max(halfH, Math.min(SIZE - halfH, cy))));
	return entry;
}

/**
 * The reveal backdrop: every surrounding region (from `candidates`) projected with
 * the target's own projection and clipped to the box, so the whole frame is filled
 * with the correct geography — not just the direct neighbours. `candidates` is a list
 * of `{ geom, label }`; regions that project to nothing (or a speck) are dropped.
 */
function buildContext(/** @type {any} */ proj, /** @type {any[]} */ candidates) {
	const out = [];
	for (const { geom, label } of candidates) {
		if (!geom || !label) continue;
		const projd = projectNeighbor(pruneIslands(trimToMainland(geom, 20), 0.05), proj);
		if (projd && projd.fillArea >= CONTEXT_MIN_AREA) out.push(contextEntry(label, projd));
	}
	return out.length ? out : undefined;
}

/** Countries near `targetLon` (far/antimeridian ones culled), as backdrop candidates. */
function countryCandidatesNear(/** @type {number} */ targetLon, /** @type {string} */ excludeA3) {
	const out = [];
	for (const [a3, geom] of COUNTRY_CONTEXT_BY_A3) {
		if (a3 === excludeA3) continue;
		if (lonGap(COUNTRY_LON_BY_A3.get(a3) ?? 0, targetLon) > CONTEXT_MAX_LON_DEG) continue;
		const label = COUNTRY_LABEL_BY_A3.get(a3);
		if (label) out.push({ geom, label });
	}
	return out;
}

/** Candidate backdrop regions for a country target: every (nearby) other country. */
function countryCandidates(/** @type {string} */ targetA3, /** @type {number} */ targetLon) {
	return countryCandidatesNear(targetLon, targetA3);
}

/** Candidate backdrop regions for a state target: sibling states + nearby foreign countries. */
function admin1Candidates(/** @type {any} */ p, /** @type {(props: any) => any} */ labelFn, /** @type {number} */ targetLon) {
	const iso = p.iso_a2;
	const selfKey = `${iso}|${p.name}`;
	const out = [];
	for (const [key, geom] of ADMIN1_CONTEXT_BY_KEY) {
		if (key === selfKey || !key.startsWith(`${iso}|`)) continue;
		const props = ADMIN1_PROPS_BY_KEY.get(key);
		if (props) out.push({ geom, label: labelFn(props) });
	}
	return out.concat(countryCandidatesNear(targetLon, ADMIN1_OWN_A3[iso]));
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
		const targetLon = geoCentroid(shape)[0];
		const context =
			cfg.context === 'country'
				? buildContext(proj, countryCandidates(p.ADM0_A3, targetLon))
				: cfg.context === 'admin1'
					? buildContext(proj, admin1Candidates(p, cfg.label, targetLon))
					: undefined;
		// The answer's own coarse outline from the *same* backdrop topology. Drawn on the
		// reveal so its border coincides with the neighbours' (one line, not a double).
		const selfGeom =
			cfg.context === 'country'
				? COUNTRY_CONTEXT_BY_A3.get(p.ADM0_A3)
				: cfg.context === 'admin1'
					? ADMIN1_CONTEXT_BY_KEY.get(`${p.iso_a2}|${p.name}`)
					: null;
		const revealPath =
			context && selfGeom ? projectNeighbor(pruneIslands(trimToMainland(selfGeom, 20), 0.05), proj)?.path : undefined;
		items.push({ p, path: d, name: label.name, nameDe: label.nameDe ?? label.name, answers: dedupAnswers([label.name, ...label.answers]), info: cfg.info?.(shape, p), capital, neighbors: cfg.neighbors?.(p), context, revealPath });
	}

	/** @type {Record<number, string>} */ const paths = {};
	/** @type {Record<number, string>} */ const names = {};
	/** @type {Record<number, string>} */ const namesDe = {};
	/** @type {Record<number, string[]>} */ const answers = {};
	/** @type {Record<number, object>} */ const info = {};
	/** @type {Record<number, [number, number]>} */ const capitals = {};
	/** @type {Record<number, string[]>} */ const neighbors = {};
	/** @type {Record<number, object[]>} */ const context = {};
	/** @type {Record<number, string>} */ const revealPaths = {};
	const put = (id, it) => {
		paths[id] = it.path;
		names[id] = it.name;
		namesDe[id] = it.nameDe;
		answers[id] = it.answers;
		if (it.info) info[id] = it.info;
		if (it.capital) capitals[id] = it.capital;
		if (it.neighbors?.length) neighbors[id] = it.neighbors;
		if (it.context?.length) context[id] = it.context;
		if (it.revealPath) revealPaths[id] = it.revealPath;
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

	writeCategoryFile(key, cfg, { paths, names, namesDe, answers, info, capitals, neighbors, context, revealPaths });
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

function writeCategoryFile(key, cfg, { paths, names, namesDe, answers, info, capitals, neighbors, context, revealPaths }) {
	const header = `// AUTO-GENERATED by scripts/build-shapes.mjs — do not edit by hand.\n// Source: Natural Earth (${cfg.source}). Each shape fills a ${SIZE}×${SIZE} box.\n`;
	let body = `${header}\nexport const paths = ${serializeMap(paths)};\n`;
	body += `\nexport const names = ${serializeMap(names)};\n`;
	if (namesDe && Object.keys(namesDe).some((id) => namesDe[id] !== names[id]))
		body += `\n// German display names — client falls back to \`names\` when absent.\nexport const namesDe = ${serializeMap(namesDe)};\n`;
	body += `\nexport const answers = ${serializeMap(answers)};\n`;
	if (Object.keys(info).length) body += `\nexport const info = ${serializeMap(info)};\n`;
	if (capitals && Object.keys(capitals).length)
		body += `\n// Capital marker position [x, y] in the ${SIZE}×${SIZE} box.\nexport const capitals = ${serializeMap(capitals)};\n`;
	if (neighbors && Object.keys(neighbors).length)
		body += `\n// Bordering countries' guessable names — a guess of one scores "close" (server-only).\nexport const neighbors = ${serializeMap(neighbors)};\n`;
	if (context && Object.keys(context).length)
		body += `\n// Neighbour backdrop for the reveal: each border country's outline projected\n// with this shape's projection, plus a label anchor [cx, cy]. Sent only on reveal.\nexport const context = ${serializeMap(context)};\n`;
	if (revealPaths && Object.keys(revealPaths).length)
		body += `\n// The answer's own coarse outline (same topology as the backdrop) — drawn on the\n// reveal so its border coincides with the neighbours' instead of doubling. Reveal-only.\nexport const revealPaths = ${serializeMap(revealPaths)};\n`;
	const file = join(OUT_DIR, `${key}_paths.js`);
	writeFileSync(file, body);
	const kb = (Buffer.byteLength(body) / 1024).toFixed(1);
	console.log(`  wrote ${file.replace(ROOT + '/', '')} (${kb} KB)`);
}

// ── Main ────────────────────────────────────────────────────────────────────────
const requested = process.argv.slice(2);
const keys = requested.length ? requested : Object.keys(CATEGORIES);
await loadCapitals();
await loadNeighbors();
await loadAdmin1Neighbors(['DE', 'US']);
await loadContextGeometry();
for (const key of keys) await build(key);
console.log('\n✓ done');
