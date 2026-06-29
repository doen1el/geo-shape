<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import { profile, avatarUrl } from '$lib/stores/profile.svelte';
	import { game } from '$lib/ws.svelte';
	import { i18n, t } from '$lib/i18n/index.svelte';

	let name = $state(profile.name);
	let joinCode = $state('');
	let busy = $state(false);
	let errorMsg = $state('');
	let soloOpen = $state(false);
	let soloDifficulty = $state<'easy' | 'hard'>('easy');
	let soloCategory = $state(0);

	const SOLO_CATEGORIES = [0, 1, 2, 3] as const;

	const canPlay = $derived(name.trim().length > 0);
	const nf = $derived(new Intl.NumberFormat(i18n.locale === 'de' ? 'de-DE' : 'en-US'));

	const code = $derived(joinCode.trim().toUpperCase());

	const checked = $derived(game.roomCheck?.code === code ? game.roomCheck : null);
	const codeReady = $derived(code.length === 4);
	const codeValid = $derived(codeReady && checked?.exists === true);

	const codeStateClass = $derived(
		!codeReady
			? ''
			: !checked
				? 'input-checking'
				: checked.exists
					? 'input-valid'
					: 'input-invalid'
	);

	onMount(() => {
		game.requestStats(profile.clientId);
	});

	$effect(() => {
		if (code.length !== 4) return;
		const id = setTimeout(() => game.checkRoom(code), 250);
		return () => clearTimeout(id);
	});

	function saveName() {
		profile.set(name);
	}

	async function createRoom() {
		if (!canPlay || busy) return;
		busy = true;
		errorMsg = '';
		saveName();
		try {
			const newCode = await game.create(profile.toJSON());
			await goto(`/room/${newCode}`);
		} catch {
			errorMsg = t('error.connect');
		} finally {
			busy = false;
		}
	}

	async function joinRoom() {
		if (!canPlay || !codeValid) return;
		saveName();
		await goto(`/room/${code}`);
	}

	async function playSolo() {
		if (!canPlay || busy) return;
		busy = true;
		errorMsg = '';
		saveName();
		try {
			const newCode = await game.create(profile.toJSON(), true, soloDifficulty);
			game.setSettings({ categoryId: soloCategory });
			game.start();
			soloOpen = false;
			await goto(`/room/${newCode}?solo=1`);
		} catch {
			errorMsg = t('error.connect');
		} finally {
			busy = false;
		}
	}
</script>

<div class="mx-auto flex w-full max-w-lg min-h-0 flex-1 flex-col justify-center gap-3">
	<!-- Identity -->
	<Card class="p-4">
		<div class="flex items-center gap-4">
			<div class="group relative shrink-0">
				<button
					type="button"
					onclick={() => profile.cycleAvatar()}
					aria-label={t('identity.tapAvatar')}
					class="block rounded-base border-2 border-border bg-surface shadow-shadow transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
				>
					<img src={avatarUrl(profile.avatar, name)} alt="avatar" width="64" height="64" />
				</button>
				<div
					class="pointer-events-none absolute -top-10 left-1/2 z-10 -translate-x-1/2 rounded-base border-2 border-border bg-secondary px-2.5 py-1 text-xs font-bold whitespace-nowrap text-ink opacity-0 shadow-shadow transition-opacity duration-150 group-hover:opacity-100"
				>
					{t('identity.tapAvatar')}
				</div>
			</div>
			<div class="flex min-w-0 flex-1 flex-col gap-1">
				<Input
					bind:value={name}
					placeholder={t('identity.namePlaceholder')}
					maxlength={20}
					oninput={saveName}
					aria-label={t('identity.namePlaceholder')}
				/>
			</div>
		</div>
	</Card>

	<!-- Play -->
	<Card class="flex flex-col gap-4 p-4">
		<Button size="lg" class="w-full" disabled={!canPlay || busy} onclick={createRoom}>
			{busy ? t('create.creating') : t('create.button')}
		</Button>

		<div class="flex items-center gap-2 text-xs font-bold text-ink/30">
			<div class="h-0.5 flex-1 bg-ink/10"></div>
			{t('join.subtitle')}
			<div class="h-0.5 flex-1 bg-ink/10"></div>
		</div>

		<form class="flex gap-3" onsubmit={(e) => (e.preventDefault(), joinRoom())}>
			<div class="min-w-0 flex-1">
				<Input
					bind:value={joinCode}
					placeholder={t('join.codePlaceholder')}
					maxlength={4}
					aria-invalid={codeReady && checked ? !checked.exists : undefined}
					class={`text-center text-lg font-extrabold tracking-[0.3em] uppercase ${codeStateClass}`}
					aria-label={t('join.codePlaceholder')}
				/>
			</div>
			<Button variant="secondary" type="submit" disabled={!canPlay || !codeValid}>
				{t('join.go')}
			</Button>
		</form>

		<div class="flex items-center gap-2 text-xs font-bold text-ink/30">
			<div class="h-0.5 flex-1 bg-ink/10"></div>
			{t('common.or')}
			<div class="h-0.5 flex-1 bg-ink/10"></div>
		</div>

		<Button
			variant="neutral"
			class="w-full"
			disabled={!canPlay || busy}
			onclick={() => (soloOpen = true)}
		>
			{t('solo.button')}
		</Button>
	</Card>

	{#if errorMsg}
		<p class="text-center font-bold text-danger">{errorMsg}</p>
	{/if}

	<!-- Solo setup: pick difficulty + category before starting -->
	<Dialog open={soloOpen} onclose={() => (soloOpen = false)}>
		<div class="flex flex-col gap-4">
			<h2 class="text-xl font-extrabold">{t('solo.setup')}</h2>

			<div class="flex flex-col gap-1.5">
				<span class="text-xs font-bold tracking-wide text-ink/50 uppercase">
					{t('settings.difficulty')}
				</span>
				<div class="flex gap-2">
					{#each ['easy', 'hard'] as const as d (d)}
						<button
							type="button"
							class="flex-1 rounded-base border-2 border-border px-3 py-1.5 text-sm font-extrabold transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none {soloDifficulty ===
							d
								? 'bg-main shadow-shadow'
								: 'bg-surface'}"
							onclick={() => (soloDifficulty = d)}
						>
							{t(`difficulty.${d}`)}
						</button>
					{/each}
				</div>
				<p class="text-[11px] font-medium text-ink/50">
					{t(`difficulty.${soloDifficulty}.desc` as 'difficulty.easy.desc')}
				</p>
			</div>

			<div class="flex flex-col gap-1.5">
				<span class="text-xs font-bold tracking-wide text-ink/50 uppercase">
					{t('settings.category')}
				</span>
				<div class="grid grid-cols-2 gap-2">
					{#each SOLO_CATEGORIES as id (id)}
						<button
							type="button"
							class="rounded-base border-2 border-border px-2 py-2.5 text-sm font-bold transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none {soloCategory ===
							id
								? 'bg-main shadow-shadow'
								: 'bg-surface'}"
							onclick={() => (soloCategory = id)}
						>
							{t(`category.${id}` as 'category.0')}
						</button>
					{/each}
				</div>
			</div>

			<Button class="w-full" disabled={busy} onclick={playSolo}>
				{busy ? t('create.creating') : t('solo.start')}
			</Button>
		</div>
	</Dialog>

	<!-- Your stats -->
	{#if game.stats && game.stats.gamesPlayed > 0}
		<div class="grid grid-cols-4 gap-2 text-center">
			{#each [{ v: game.stats.gamesPlayed, l: t('stats.games'), hl: false }, { v: game.stats.gamesWon, l: t('stats.wins'), hl: true }, { v: game.stats.bestScore, l: t('stats.best'), hl: false }, { v: nf.format(game.stats.totalScore), l: t('stats.total'), hl: false }] as s (s.l)}
				<div
					class="rounded-base border-2 border-border px-2 py-2 {s.hl ? 'bg-main' : 'bg-surface'}"
				>
					<div class="text-xl font-extrabold tabular-nums">{s.v}</div>
					<div class="text-[10px] font-bold tracking-wide text-ink/50 uppercase">{s.l}</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
