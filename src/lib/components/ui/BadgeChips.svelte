<script lang="ts">
	import { cn } from '$lib/utils';
	import { t } from '$lib/i18n/index.svelte';
	import { DEF_BY_ID } from '$lib/badges';
	import { badgeIcon } from '$lib/badgeIcons';

	type Props = {
		ids: string[];
		class?: string;
	};

	let { ids, class: className }: Props = $props();

	const shown = $derived(ids.filter((id) => DEF_BY_ID.has(id)));
</script>

{#if shown.length}
	<span class={cn('inline-flex items-center gap-0.5', className)}>
		{#each shown as id (id)}
			{@const Icon = badgeIcon(id).icon}
			<Icon
				size={14}
				class={badgeIcon(id).color}
				aria-label={t(`achievement.${id}.title` as 'achievement.blitz.title')}
			/>
		{/each}
	</span>
{/if}
