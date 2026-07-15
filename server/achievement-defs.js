/**
 * The badge catalogue — metadata only, no imports.
 *
 * @typedef {'bronze' | 'silver' | 'gold'} Tier
 * @typedef {'solve' | 'round_end' | 'game_end'} Event
 *
 * @typedef {Object} AchievementDef
 * @property {string} id
 * @property {Tier} tier
 * @property {string} group
 * @property {Event[]} on
 * @property {'any' | 'contest'} [scope] `contest` = needs more than one player in the room.
 * @property {boolean} [hidden] Withheld from the catalogue until unlocked.
 * @property {number} [categoryId] Collection target — drives the progress bar.
 */

/** @type {AchievementDef[]} */
export const ACHIEVEMENT_DEFS = [
	{ id: 'first_solo', tier: 'bronze', group: 'basics', on: ['game_end'] },
	{ id: 'first_multiplayer', tier: 'bronze', group: 'basics', scope: 'contest', on: ['game_end'] },

	{ id: 'blitz', tier: 'gold', group: 'speed', on: ['solve'] },
	{ id: 'quick10', tier: 'bronze', group: 'speed', on: ['solve'] },
	{ id: 'quick50', tier: 'silver', group: 'speed', on: ['solve'] },

	{ id: 'streak5', tier: 'bronze', group: 'streak', on: ['solve'] },
	{ id: 'flawless', tier: 'silver', group: 'streak', on: ['game_end'] },
	{ id: 'flawless5', tier: 'gold', group: 'streak', on: ['game_end'] },

	{ id: 'firstwin', tier: 'bronze', group: 'competition', scope: 'contest', on: ['game_end'] },
	{ id: 'win10', tier: 'silver', group: 'competition', scope: 'contest', on: ['game_end'] },
	{ id: 'win50', tier: 'gold', group: 'competition', scope: 'contest', on: ['game_end'] },
	{ id: 'sniper', tier: 'silver', group: 'competition', scope: 'contest', on: ['game_end'] },
	{ id: 'landslide', tier: 'gold', group: 'competition', scope: 'contest', on: ['game_end'] },

	{ id: 'explorer', tier: 'bronze', group: 'collection', on: ['solve'] },
	{ id: 'collect_continents', tier: 'silver', group: 'collection', categoryId: 1, on: ['solve'] },
	{
		id: 'collect_german_states',
		tier: 'silver',
		group: 'collection',
		categoryId: 0,
		on: ['solve']
	},
	{ id: 'collect_europe', tier: 'gold', group: 'collection', categoryId: 2, on: ['solve'] },
	{ id: 'collect_africa', tier: 'gold', group: 'collection', categoryId: 4, on: ['solve'] },
	{ id: 'collect_asia', tier: 'gold', group: 'collection', categoryId: 5, on: ['solve'] },
	{
		id: 'collect_north_america',
		tier: 'silver',
		group: 'collection',
		categoryId: 6,
		on: ['solve']
	},
	{
		id: 'collect_south_america',
		tier: 'silver',
		group: 'collection',
		categoryId: 7,
		on: ['solve']
	},
	{ id: 'collect_us_states', tier: 'gold', group: 'collection', categoryId: 3, on: ['solve'] },
	{ id: 'collect_world', tier: 'gold', group: 'collection', categoryId: 8, on: ['solve'] },

	{ id: 'daily_first', tier: 'bronze', group: 'daily', on: ['game_end'] },
	{ id: 'daily3', tier: 'bronze', group: 'daily', on: ['game_end'] },
	{ id: 'daily7', tier: 'silver', group: 'daily', on: ['game_end'] },
	{ id: 'daily30', tier: 'gold', group: 'daily', on: ['game_end'] },

	{ id: 'buzzer', tier: 'silver', group: 'hidden', hidden: true, on: ['solve'] },
	{ id: 'stubborn', tier: 'bronze', group: 'hidden', hidden: true, on: ['solve'] }
];

/** @type {Map<string, AchievementDef>} */
export const DEF_BY_ID = new Map(ACHIEVEMENT_DEFS.map((d) => [d.id, d]));

/** How many badges a player may show next to their name. */
export const MAX_PINNED = 3;
