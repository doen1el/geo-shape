<script lang="ts" module>
	import { Style, Avatar } from '@dicebear/core';
	import { PLAYER_COLORS_BARE } from '$lib/playerColors';

	// Client-side avatar generation
	const loaders: Record<string, () => Promise<{ default: unknown }>> = {
		'fun-emoji': () => import('@dicebear/styles/fun-emoji.json'),
		'adventurer': () => import('@dicebear/styles/adventurer.json'),
		'adventurer-neutral': () => import('@dicebear/styles/adventurer-neutral.json'),
		'avataaars': () => import('@dicebear/styles/avataaars.json'),
		'avataaars-neutral': () => import('@dicebear/styles/avataaars-neutral.json'),
		'big-ears': () => import('@dicebear/styles/big-ears.json'),
		'big-ears-neutral': () => import('@dicebear/styles/big-ears-neutral.json'),
		'big-smile': () => import('@dicebear/styles/big-smile.json'),
		'bottts': () => import('@dicebear/styles/bottts.json'),
		'bottts-neutral': () => import('@dicebear/styles/bottts-neutral.json'),
		'croodles': () => import('@dicebear/styles/croodles.json'),
		'croodles-neutral': () => import('@dicebear/styles/croodles-neutral.json'),
		'dylan': () => import('@dicebear/styles/dylan.json'),
		'lorelei': () => import('@dicebear/styles/lorelei.json'),
		'lorelei-neutral': () => import('@dicebear/styles/lorelei-neutral.json'),
		'micah': () => import('@dicebear/styles/micah.json'),
		'miniavs': () => import('@dicebear/styles/miniavs.json'),
		'notionists': () => import('@dicebear/styles/notionists.json'),
		'notionists-neutral': () => import('@dicebear/styles/notionists-neutral.json'),
		'open-peeps': () => import('@dicebear/styles/open-peeps.json'),
		'personas': () => import('@dicebear/styles/personas.json'),
		'pixel-art': () => import('@dicebear/styles/pixel-art.json'),
		'pixel-art-neutral': () => import('@dicebear/styles/pixel-art-neutral.json'),
		'toon-head': () => import('@dicebear/styles/toon-head.json'),
		'thumbs': () => import('@dicebear/styles/thumbs.json'),
		'disco': () => import('@dicebear/styles/disco.json'),
		'glass': () => import('@dicebear/styles/glass.json'),
		'glyphs': () => import('@dicebear/styles/glyphs.json'),
		'icons': () => import('@dicebear/styles/icons.json'),
		'identicon': () => import('@dicebear/styles/identicon.json'),
		'initial-face': () => import('@dicebear/styles/initial-face.json'),
		'initials': () => import('@dicebear/styles/initials.json'),
		'rings': () => import('@dicebear/styles/rings.json'),
		'shape-grid': () => import('@dicebear/styles/shape-grid.json'),
		'shapes': () => import('@dicebear/styles/shapes.json'),
		'stripes': () => import('@dicebear/styles/stripes.json'),
		'triangles': () => import('@dicebear/styles/triangles.json')
	};

	const DEFAULT_STYLE = 'fun-emoji';

	const styleCache = new Map<string, Promise<Style<unknown>>>();

	function loadStyle(name: string): Promise<Style<unknown>> {
		const key = loaders[name] ? name : DEFAULT_STYLE;
		let cached = styleCache.get(key);
		if (!cached) {
			cached = loaders[key]().then((m) => new Style(m.default as never));
			styleCache.set(key, cached);
		}
		return cached;
	}

	// 1×1 transparent GIF
	const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
</script>

<script lang="ts">
	type Props = {
		seed: string;
		style: string;
		size?: number;
		alt?: string;
		class?: string;
	};
	let { seed, style, size = 64, alt = 'avatar', class: klass = '' }: Props = $props();

	let src = $state(BLANK);

	$effect(() => {
		const styleName = style;
		const rawSeed = seed;
		const px = size;
		let active = true;
		loadStyle(styleName).then((s) => {
			if (!active) return;
			src = new Avatar(s, {
				seed: rawSeed?.trim() ? rawSeed.trim() : 'anon',
				size: px,
				backgroundColor: PLAYER_COLORS_BARE,
				borderRadius: 10
			}).toDataUri();
		});
		return () => {
			active = false;
		};
	});
</script>

<img {src} {alt} width={size} height={size} class={klass} />
