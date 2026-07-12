<script lang="ts">
	import { t } from '$lib/i18n/index.svelte';

	type Props = {
		value: number;
		disabled?: boolean;
		onpick: (id: number) => void;
	};

	let { value, disabled = false, onpick }: Props = $props();

	// Continents stands alone — a one-entry group of the same name would be silly.
	const UNGROUPED = [1] as const;
	const GROUPS = [
		{ label: 'catgroup.countries', ids: [8, 2, 4, 5, 6, 7] },
		{ label: 'catgroup.states', ids: [0, 3] }
	] as const;
</script>

<div class="relative">
	<select
		class="w-full cursor-pointer appearance-none rounded-base border-2 border-border bg-surface px-3 py-2 pr-9 text-sm font-bold shadow-shadow transition-all
			enabled:hover:translate-x-[2px] enabled:hover:translate-y-[2px] enabled:hover:shadow-none
			disabled:cursor-default disabled:opacity-60"
		{disabled}
		{value}
		onchange={(e) => onpick(Number(e.currentTarget.value))}
		aria-label={t('settings.category')}
	>
		{#each UNGROUPED as id (id)}
			<option value={id}>{t(`category.${id}` as 'category.0')}</option>
		{/each}
		{#each GROUPS as group (group.label)}
			<optgroup label={t(group.label as 'catgroup.countries')}>
				{#each group.ids as id (id)}
					<option value={id}>{t(`category.${id}` as 'category.0')}</option>
				{/each}
			</optgroup>
		{/each}
	</select>
	<span
		class="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[10px] font-extrabold"
	>
		▼
	</span>
</div>
