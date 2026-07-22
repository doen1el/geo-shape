<script lang="ts">
	import { ChevronDown } from '@lucide/svelte';
	import Avatar, { preloadAvatarStyle } from '$lib/components/ui/Avatar.svelte';
	import { profile, AVATAR_PICKER_STYLES } from '$lib/stores/profile.svelte';
	import { t } from '$lib/i18n/index.svelte';

	type Props = {
		seed: string;
		size?: number;
		/** Where the grid pops up relative to the button. */
		placement?: 'top' | 'bottom';
	};
	let { seed, size = 64, placement = 'bottom' }: Props = $props();

	const PREVIEW_SIZE = 56;

	let open = $state(false);
	let preloaded = false;

	// Warm the grid's styles before it opens so the previews don't pop in.
	function preload() {
		if (preloaded) return;
		preloaded = true;
		for (const style of AVATAR_PICKER_STYLES) preloadAvatarStyle(style);
	}

	function pick(style: string) {
		profile.setAvatar(style);
		open = false;
	}
</script>

<svelte:window
	onkeydown={(e) => {
		if (open && e.key === 'Escape') open = false;
	}}
/>

<div class="relative shrink-0">
	{#if open}
		<button
			type="button"
			class="fixed inset-0 z-40 cursor-default"
			aria-label={t('common.cancel')}
			onclick={() => (open = false)}
		></button>
		<!-- w-max: without it the panel shrinks to the button's width and squashes the previews -->
		<div
			class="absolute left-0 z-50 grid w-max grid-cols-3 gap-2 rounded-base border-2 border-border bg-surface p-2 shadow-shadow
				{placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}"
		>
			{#each AVATAR_PICKER_STYLES as style (style)}
				<button
					type="button"
					aria-label={style}
					aria-pressed={profile.avatar === style}
					class="rounded-base border-2 p-1 transition-transform hover:-translate-y-0.5 {profile.avatar ===
					style
						? 'border-border bg-main'
						: 'border-transparent hover:border-border hover:bg-main'}"
					onclick={() => pick(style)}
				>
					<Avatar {style} {seed} size={PREVIEW_SIZE} alt={style} class="block" />
				</button>
			{/each}
		</div>
	{/if}

	<button
		type="button"
		aria-haspopup="true"
		aria-expanded={open}
		class="relative block rounded-base border-2 border-border bg-surface shadow-shadow transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
		onpointerenter={preload}
		onfocus={preload}
		onclick={() => ((open = !open), preload())}
	>
		<Avatar style={profile.avatar} {seed} {size} alt="avatar" class="block" />
		<ChevronDown
			class="pointer-events-none absolute right-0.5 bottom-0.5 text-ink"
			size={14}
			strokeWidth={3}
			aria-hidden="true"
		/>
	</button>
</div>
