import type { Component } from 'svelte';
import { Flame, Laugh, ThumbsUp, Heart, Skull, PartyPopper } from '@lucide/svelte';

export const REACTION_ICON: Record<string, { icon: Component; color: string }> = {
	fire: { icon: Flame, color: 'text-orange-600' },
	laugh: { icon: Laugh, color: 'text-ink' },
	thumbs: { icon: ThumbsUp, color: 'text-ink' },
	heart: { icon: Heart, color: 'text-danger' },
	skull: { icon: Skull, color: 'text-ink' },
	party: { icon: PartyPopper, color: 'text-main-accent' }
};
