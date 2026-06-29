<script lang="ts">
	import type { StateInfo } from '$lib/ws.svelte';
	import { i18n, t } from '$lib/i18n/index.svelte';

	let { info, name }: { info: StateInfo; name: string } = $props();

	const locale = $derived(i18n.locale);
	const nf = $derived(new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-US'));

	const cells = $derived(
		[
			info.capital && { label: t('info.capital'), value: info.capital },
			info.population && { label: t('info.population'), value: nf.format(info.population) },
			info.areaKm2 && { label: t('info.area'), value: `${nf.format(info.areaKm2)} km²` }
		].filter((c) => !!c)
	);
	const funFact = $derived(info.funFact ? (locale === 'de' ? info.funFact.de : info.funFact.en) : '');
</script>

<div class="rounded-base border-2 border-border bg-surface p-4 shadow-shadow">
	<h3 class="mb-3 text-lg font-extrabold">{name}</h3>

	{#if cells.length}
		<dl
			class="grid gap-2 text-center"
			style="grid-template-columns: repeat({cells.length}, minmax(0, 1fr))"
		>
			{#each cells as cell (cell.label)}
				<div class="rounded-base border-2 border-border bg-bg px-2 py-2">
					<dt class="text-[11px] font-bold tracking-wide text-ink/50 uppercase">{cell.label}</dt>
					<dd class="font-extrabold tabular-nums">{cell.value}</dd>
				</div>
			{/each}
		</dl>
	{/if}

	{#if funFact}
		<div class="mt-3 rounded-base border-2 border-border bg-secondary px-3 py-2">
			<p class="text-[11px] font-bold tracking-wide uppercase">💡 {t('info.didYouKnow')}</p>
			<p class="text-sm font-medium">{funFact}</p>
		</div>
	{/if}
</div>
