<script lang="ts">
	import type { StateInfo } from '$lib/ws.svelte';
	import { i18n, t } from '$lib/i18n/index.svelte';

	let { info, name }: { info: StateInfo; name: string } = $props();

	const locale = $derived(i18n.locale);
	const nf = $derived(new Intl.NumberFormat(locale === 'de' ? 'de-DE' : 'en-US'));
</script>

<div class="rounded-base border-2 border-border bg-surface p-4 shadow-shadow">
	<h3 class="mb-3 text-lg font-extrabold">{name}</h3>

	<dl class="grid grid-cols-3 gap-2 text-center">
		<div class="rounded-base border-2 border-border bg-bg px-2 py-2">
			<dt class="text-[11px] font-bold tracking-wide text-ink/50 uppercase">{t('info.capital')}</dt>
			<dd class="font-extrabold">{info.capital}</dd>
		</div>
		<div class="rounded-base border-2 border-border bg-bg px-2 py-2">
			<dt class="text-[11px] font-bold tracking-wide text-ink/50 uppercase">
				{t('info.population')}
			</dt>
			<dd class="font-extrabold tabular-nums">{nf.format(info.population)}</dd>
		</div>
		<div class="rounded-base border-2 border-border bg-bg px-2 py-2">
			<dt class="text-[11px] font-bold tracking-wide text-ink/50 uppercase">{t('info.area')}</dt>
			<dd class="font-extrabold tabular-nums">{nf.format(info.areaKm2)} km²</dd>
		</div>
	</dl>

	<div class="mt-3 rounded-base border-2 border-border bg-secondary px-3 py-2">
		<p class="text-[11px] font-bold tracking-wide uppercase">💡 {t('info.didYouKnow')}</p>
		<p class="text-sm font-medium">{locale === 'de' ? info.funFact.de : info.funFact.en}</p>
	</div>
</div>
