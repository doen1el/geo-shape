import type { Component } from 'svelte';
import {
	Gamepad2,
	Users,
	Zap,
	Rabbit,
	Wind,
	Target,
	Gem,
	Crown,
	Medal,
	Trophy,
	Star,
	Crosshair,
	Rocket,
	Compass,
	Globe,
	Map,
	Earth,
	MapPin,
	MapPinned,
	CalendarCheck,
	Flame,
	Sparkles,
	AlarmClock,
	Repeat
} from '@lucide/svelte';

export type BadgeIcon = { icon: Component; color: string };

// (bronze = sand, silver = white, gold = yellow).
const HOT = 'text-orange-600'; // speed, streak, daily
const COOL = 'text-teal-700'; // collection / geography
const INK = 'text-ink'; // everything else

export const BADGE_ICON: Record<string, BadgeIcon> = {
	first_solo: { icon: Gamepad2, color: INK },
	first_multiplayer: { icon: Users, color: INK },

	blitz: { icon: Zap, color: HOT },
	quick10: { icon: Rabbit, color: HOT },
	quick50: { icon: Wind, color: HOT },

	streak5: { icon: Target, color: HOT },
	flawless: { icon: Gem, color: COOL },
	flawless5: { icon: Crown, color: INK },

	firstwin: { icon: Medal, color: INK },
	win10: { icon: Trophy, color: INK },
	win50: { icon: Star, color: INK },
	sniper: { icon: Crosshair, color: INK },
	landslide: { icon: Rocket, color: HOT },

	explorer: { icon: Compass, color: COOL },
	collect_continents: { icon: Globe, color: COOL },
	collect_german_states: { icon: MapPin, color: COOL },
	collect_europe: { icon: Map, color: COOL },
	collect_africa: { icon: Map, color: COOL },
	collect_asia: { icon: Map, color: COOL },
	collect_north_america: { icon: Map, color: COOL },
	collect_south_america: { icon: Map, color: COOL },
	collect_us_states: { icon: MapPinned, color: COOL },
	collect_world: { icon: Earth, color: COOL },

	daily_first: { icon: CalendarCheck, color: HOT },
	daily3: { icon: Flame, color: HOT },
	daily7: { icon: Flame, color: HOT },
	daily30: { icon: Sparkles, color: HOT },

	buzzer: { icon: AlarmClock, color: INK },
	stubborn: { icon: Repeat, color: INK }
};

export function badgeIcon(id: string): BadgeIcon {
	return BADGE_ICON[id] ?? { icon: Trophy, color: INK };
}
