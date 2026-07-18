<script lang="ts">
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { t } from '$lib/i18n/index.svelte';
	import { ArrowLeft, ExternalLink, ChevronDown } from '@lucide/svelte';
	import { LICENSES } from '$lib/data/licenses';

	let openText = $state<Record<string, boolean>>({});
</script>

<div class="-mx-12 flex h-full flex-col gap-4 overflow-x-hidden overflow-y-auto px-12 pb-4">
	<Button href="/" variant="neutral" class="h-10 shrink-0 gap-2 self-start px-4">
		<ArrowLeft size={18} aria-hidden="true" />
		{t('common.back')}
	</Button>

	<Card class="p-6">
		<h1 class="text-2xl font-extrabold">{t('licenses.title')}</h1>
		<p class="mt-2 text-sm font-bold text-ink/60">{t('licenses.intro')}</p>

		<ul class="mt-5 flex flex-col gap-3">
			{#each LICENSES as lib (lib.name)}
				<li class="rounded-base border-2 border-border bg-bg p-3">
					<div class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
						<a
							href={lib.url}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-flex items-center gap-1.5 font-extrabold underline-offset-2 hover:underline"
						>
							{lib.name}
							{#if lib.version}<span class="text-xs font-bold text-ink/40">v{lib.version}</span>{/if}
							<ExternalLink size={12} class="text-ink/40" aria-hidden="true" />
						</a>
						<span
							class="rounded-base border-2 border-border bg-surface px-2 py-0.5 text-xs font-extrabold"
						>
							{lib.license}
						</span>
					</div>

					{#if lib.description}
						<p class="mt-1.5 text-sm font-bold text-ink/60">{lib.description}</p>
					{/if}

					{#if lib.text}
						<button
							type="button"
							onclick={() => (openText[lib.name] = !openText[lib.name])}
							class="mt-2 inline-flex items-center gap-1 text-xs font-extrabold text-ink/50 hover:text-ink"
						>
							<ChevronDown
								size={14}
								class="transition-transform {openText[lib.name] ? 'rotate-180' : ''}"
								aria-hidden="true"
							/>
							{openText[lib.name] ? t('licenses.hideText') : t('licenses.showText')}
						</button>
						{#if openText[lib.name]}
							<pre
								class="mt-2 max-h-72 overflow-auto rounded-base border-2 border-border bg-surface p-3 text-[11px] leading-relaxed whitespace-pre-wrap">{lib.text}</pre>
						{/if}
					{/if}
				</li>
			{/each}
		</ul>
	</Card>
</div>
