<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { profile, avatarUrl } from '$lib/stores/profile.svelte';
	import { game } from '$lib/ws.svelte';
	import { i18n, t } from '$lib/i18n/index.svelte';

	let name = $state(profile.name);
	let joinCode = $state('');
	let busy = $state(false);
	let errorMsg = $state('');

	const canPlay = $derived(name.trim().length > 0);
	const nf = $derived(new Intl.NumberFormat(i18n.locale === 'de' ? 'de-DE' : 'en-US'));

	onMount(() => {
		game.requestStats(profile.clientId);
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
			const code = await game.create(profile.toJSON());
			await goto(`/room/${code}`);
		} catch {
			errorMsg = t('error.connect');
		} finally {
			busy = false;
		}
	}

	async function joinRoom() {
		const code = joinCode.trim().toUpperCase();
		if (!canPlay || code.length < 4) return;
		saveName();
		await goto(`/room/${code}`);
	}

	async function playSolo() {
		if (!canPlay || busy) return;
		busy = true;
		errorMsg = '';
		saveName();
		try {
			const code = await game.create(profile.toJSON());
			game.start();
			await goto(`/room/${code}?solo=1`);
		} catch {
			errorMsg = t('error.connect');
		} finally {
			busy = false;
		}
	}
</script>

<div class="flex flex-col gap-6">
	<!-- Identity -->
	<Card class="p-6">
		<h2 class="mb-4 text-xl font-extrabold">{t('identity.title')}</h2>
		<div class="flex items-center gap-4">
			<img
				src={avatarUrl(profile.avatar)}
				alt="avatar"
				width="72"
				height="72"
				class="rounded-base border-2 border-border bg-surface shadow-shadow"
			/>
			<div class="flex flex-1 flex-col gap-2">
				<Input
					bind:value={name}
					placeholder={t('identity.namePlaceholder')}
					maxlength={20}
					oninput={saveName}
					aria-label={t('identity.namePlaceholder')}
				/>
				<button
					type="button"
					class="self-start text-sm font-bold underline underline-offset-2 hover:text-main-accent"
					onclick={() => profile.shuffleAvatar()}
				>
					{t('identity.shuffleAvatar')}
				</button>
			</div>
		</div>
	</Card>

	<!-- Create -->
	<Card class="p-6">
		<h2 class="mb-1 text-xl font-extrabold">{t('create.title')}</h2>
		<p class="mb-4 text-sm font-medium text-ink/60">{t('create.subtitle')}</p>
		<Button size="lg" class="w-full" disabled={!canPlay || busy} onclick={createRoom}>
			{busy ? t('create.creating') : t('create.button')}
		</Button>
	</Card>

	<!-- Join -->
	<Card class="p-6">
		<h2 class="mb-1 text-xl font-extrabold">{t('join.title')}</h2>
		<p class="mb-4 text-sm font-medium text-ink/60">{t('join.subtitle')}</p>
		<form class="flex gap-3" onsubmit={(e) => (e.preventDefault(), joinRoom())}>
			<Input
				bind:value={joinCode}
				placeholder={t('join.codePlaceholder')}
				maxlength={4}
				class="text-center text-lg font-extrabold tracking-[0.3em] uppercase"
				aria-label={t('join.codePlaceholder')}
			/>
			<Button variant="secondary" type="submit" disabled={!canPlay || joinCode.trim().length < 4}>
				{t('join.go')}
			</Button>
		</form>
	</Card>

	<!-- Solo -->
	<Card class="p-6">
		<h2 class="mb-1 text-xl font-extrabold">{t('solo.title')}</h2>
		<p class="mb-4 text-sm font-medium text-ink/60">{t('solo.subtitle')}</p>
		<Button variant="neutral" class="w-full" disabled={!canPlay || busy} onclick={playSolo}>
			{t('solo.button')}
		</Button>
	</Card>

	{#if errorMsg}
		<p class="text-center font-bold text-danger">{errorMsg}</p>
	{/if}

	<!-- Playser Stats -->
	{#if game.stats && game.stats.gamesPlayed > 0}
		<Card class="p-6">
			<h2 class="mb-4 text-xl font-extrabold">{t('stats.title')}</h2>
			<dl class="grid grid-cols-4 gap-2 text-center">
				<div class="rounded-base border-2 border-border bg-bg px-2 py-3">
					<dd class="text-2xl font-extrabold tabular-nums">{game.stats.gamesPlayed}</dd>
					<dt class="text-[10px] font-bold tracking-wide text-ink/50 uppercase">
						{t('stats.games')}
					</dt>
				</div>
				<div class="rounded-base border-2 border-border bg-main px-2 py-3">
					<dd class="text-2xl font-extrabold tabular-nums">{game.stats.gamesWon}</dd>
					<dt class="text-[10px] font-bold tracking-wide text-ink/60 uppercase">
						{t('stats.wins')}
					</dt>
				</div>
				<div class="rounded-base border-2 border-border bg-bg px-2 py-3">
					<dd class="text-2xl font-extrabold tabular-nums">{game.stats.bestScore}</dd>
					<dt class="text-[10px] font-bold tracking-wide text-ink/50 uppercase">
						{t('stats.best')}
					</dt>
				</div>
				<div class="rounded-base border-2 border-border bg-bg px-2 py-3">
					<dd class="text-2xl font-extrabold tabular-nums">{nf.format(game.stats.totalScore)}</dd>
					<dt class="text-[10px] font-bold tracking-wide text-ink/50 uppercase">
						{t('stats.total')}
					</dt>
				</div>
			</dl>
		</Card>
	{/if}
</div>
