<script lang="ts">
	import { Code, Scale } from '@lucide/svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import Slider from '$lib/components/ui/Slider.svelte';
	import { buttonSound } from '$lib/audio/buttonSound';
	import { i18n, t, type Locale } from '$lib/i18n/index.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { APP_VERSION } from '$lib/version';

	let { open = $bindable(false) }: { open?: boolean } = $props();

	const LANGS: { id: Locale; label: string }[] = [
		{ id: 'de', label: 'Deutsch' },
		{ id: 'en', label: 'English' }
	];

	let musicPct = $state(Math.round(settings.volume * 100));
	let sfxPct = $state(Math.round(settings.sfxVolume * 100));
	$effect(() => {
		settings.setVolume(musicPct / 100);
	});
	$effect(() => {
		settings.setSfxVolume(sfxPct / 100);
	});
</script>

<Dialog {open} onclose={() => (open = false)}>
	<div class="flex flex-col gap-5">
		<h2 class="text-xl font-extrabold">{t('settings.title')}</h2>

		<!-- Language -->
		<div class="flex flex-col gap-1.5">
			<span class="text-xs font-bold tracking-wide text-ink/50 uppercase">
				{t('settings.language')}
			</span>
			<div class="flex gap-2">
				{#each LANGS as lang (lang.id)}
					<button
						type="button"
						use:buttonSound
						class="flex-1 rounded-base border-2 border-border px-3 py-1.5 text-sm font-extrabold transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none {i18n.locale ===
						lang.id
							? 'bg-main shadow-shadow'
							: 'bg-surface'}"
						onclick={() => i18n.set(lang.id)}
					>
						{lang.label}
					</button>
				{/each}
			</div>
		</div>

		<!-- Sound on/off -->
		<div class="flex flex-col gap-1.5">
			<span class="text-xs font-bold tracking-wide text-ink/50 uppercase">
				{t('settings.sound')}
			</span>
			<div class="flex gap-2">
				{#each [{ on: true, label: t('common.on') }, { on: false, label: t('common.off') }] as opt (opt.on)}
					<button
						type="button"
						use:buttonSound
						class="flex-1 rounded-base border-2 border-border px-3 py-1.5 text-sm font-extrabold transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none {settings.soundOn ===
						opt.on
							? 'bg-main shadow-shadow'
							: 'bg-surface'}"
						onclick={() => settings.setSound(opt.on)}
					>
						{opt.label}
					</button>
				{/each}
			</div>
		</div>

		<!-- Volume -->
		<div class="flex flex-col gap-1.5">
			<div class="flex items-center justify-between" class:opacity-40={!settings.soundOn}>
				<span class="text-xs font-bold tracking-wide text-ink/50 uppercase">
					{t('settings.musicVolume')}
				</span>
				<span class="text-xs font-extrabold tabular-nums">{musicPct}%</span>
			</div>
			<Slider
				bind:value={musicPct}
				min={0}
				max={100}
				disabled={!settings.soundOn}
				aria-label={t('settings.musicVolume')}
			/>
		</div>

		<div class="flex flex-col gap-1.5">
			<div class="flex items-center justify-between" class:opacity-40={!settings.soundOn}>
				<span class="text-xs font-bold tracking-wide text-ink/50 uppercase">
					{t('settings.sfxVolume')}
				</span>
				<span class="text-xs font-extrabold tabular-nums">{sfxPct}%</span>
			</div>
			<Slider
				bind:value={sfxPct}
				min={0}
				max={100}
				disabled={!settings.soundOn}
				aria-label={t('settings.sfxVolume')}
			/>
		</div>

		<!-- Source code + licenses -->
		<div class="flex flex-col gap-2 border-t-2 border-border pt-4 items-center text-center">
			<span class="text-xs font-bold tracking-wide text-ink/50 uppercase">
				{t('settings.about')}
			</span>
			<div class="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm font-bold">
				<a
					href="https://codeberg.org/doen1el/geo-shape"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-1.5 text-ink/70 underline-offset-2 hover:text-ink hover:underline"
				>
					<Code size={15} aria-hidden="true" />
					{t('settings.sourceCodeberg')}
				</a>
				<a
					href="https://github.com/doen1el/geo-shape"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-1.5 text-ink/70 underline-offset-2 hover:text-ink hover:underline"
				>
					<Code size={15} aria-hidden="true" />
					{t('settings.sourceGithub')}
				</a>
				<a
					href="/licenses"
					onclick={() => (open = false)}
					class="inline-flex items-center gap-1.5 text-ink/70 underline-offset-2 hover:text-ink hover:underline"
				>
					<Scale size={15} aria-hidden="true" />
					{t('settings.licenses')}
				</a>
			</div>
			<p class="text-xs font-bold tracking-wide text-ink/40">GeoShape v{APP_VERSION}</p>
		</div>
	</div>
</Dialog>
