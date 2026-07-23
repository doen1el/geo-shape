<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import Slider from '$lib/components/ui/Slider.svelte';
	import AvatarPicker from '$lib/components/ui/AvatarPicker.svelte';
	import CategorySelect from '$lib/components/game/CategorySelect.svelte';
	import { profile } from '$lib/stores/profile.svelte';
	import { game, getLastRoom, forgetRoom } from '$lib/ws.svelte';
	import { t } from '$lib/i18n/index.svelte';
	import { X, Calendar } from '@lucide/svelte';

	let name = $state(profile.name);
	let joinCode = $state('');
	let busy = $state(false);
	let errorMsg = $state('');
	let soloOpen = $state(false);
	let soloMode = $state<'normal' | 'endless'>('normal');
	let soloDifficulty = $state<'easy' | 'hard'>('easy');
	let soloCategory = $state(1);
	let soloRounds = $state(5);
	let soloTime = $state(90);
	let resumeCode = $state<string | null>(null);
	let resumeAvailable = $state(false);

	const MIN_TIME = 30;
	const MAX_TIME = 180;
	const TIME_STEP = 15;

	const CATEGORY_SIZES: Record<number, number> = {
		0: 16, 1: 7, 2: 40, 3: 50, 4: 49, 5: 45, 6: 15, 7: 12, 8: 164
	};

	const soloCategorySize = $derived(CATEGORY_SIZES[soloCategory] ?? 10);
	const roundMax = $derived(soloCategorySize);
	const soloRoundsLabel = $derived(
		soloRounds >= roundMax ? `${t('settings.allRounds')} (${soloCategorySize})` : String(soloRounds)
	);

	function pickSoloCategory(id: number) {
		soloCategory = id;
		const size = CATEGORY_SIZES[id] ?? 10;
		if (soloRounds > size) soloRounds = size;
	}

	const canPlay = $derived(name.trim().length > 0);

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

	const dailyAvailable = $derived(!!game.daily && !game.daily.attempted);

	onMount(() => {
		game.watchRooms();
		game.requestDaily();
		const last = getLastRoom();
		if (last && last !== game.room?.code) {
			resumeCode = last;
			game.checkRoom(last);
		}
		return () => game.unwatchRooms();
	});

	function joinPublic(roomCode: string) {
		if (!canPlay) return;
		saveName();
		goto(`/room/${roomCode}`);
	}

	$effect(() => {
		if (code.length !== 4) return;
		const id = setTimeout(() => game.checkRoom(code), 250);
		return () => clearTimeout(id);
	});

	$effect(() => {
		const rc = game.roomCheck;
		if (resumeCode && rc && rc.code === resumeCode) resumeAvailable = rc.exists;
	});

	function resumeRoom() {
		if (resumeCode) goto(`/room/${resumeCode}`);
	}
	function dismissResume() {
		forgetRoom();
		resumeCode = null;
		resumeAvailable = false;
	}

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
			errorMsg = game.errorCode ? '' : t('error.connect');
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
			const endless = soloMode === 'endless';
			game.setSettings({
				categoryId: soloCategory,
				roundDurationSec: soloTime,
				endless,
				...(endless
					? {}
					: soloRounds >= roundMax
						? { allRounds: true }
						: { maxRounds: soloRounds })
			});
			game.start();
			soloOpen = false;
			await goto(`/room/${newCode}?solo=1`);
		} catch {
			errorMsg = game.errorCode ? '' : t('error.connect');
		} finally {
			busy = false;
		}
	}
</script>

<div class="mx-auto flex w-full max-w-lg min-h-0 flex-1 flex-col justify-center gap-3">
	{#if resumeCode && resumeAvailable}
		<Card class="flex items-center gap-3 bg-main p-3">
			<p class="min-w-0 flex-1 text-sm font-bold">
				{t('rejoin.banner', { code: resumeCode })}
			</p>
			<Button size="sm" variant="neutral" onclick={resumeRoom}>{t('rejoin.go')}</Button>
			<Button
				size="sm"
				variant="neutral"
				class="w-9 shrink-0 px-0"
				onclick={dismissResume}
				aria-label={t('rejoin.dismiss')}
				title={t('rejoin.dismiss')}
			>
				<X size={18} aria-hidden="true" />
			</Button>
		</Card>
	{/if}

	<!-- Identity -->
	<Card class="p-4">
		<div class="flex items-center gap-4">
			<AvatarPicker seed={name} size={64} />
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

		<div class="grid grid-cols-2 gap-3">
			<Button
				variant="neutral"
				class="w-full"
				disabled={!canPlay || busy}
				onclick={() => (soloOpen = true)}
			>
				{t('solo.button')}
			</Button>
			<div class="relative flex">
				<Button
					variant="secondary"
					href={canPlay ? '/daily' : undefined}
					disabled={!canPlay}
					title={dailyAvailable ? t('daily.available') : undefined}
					class="w-full"
				>
					<Calendar size={18} aria-hidden="true" />
					{t('daily.play')}
				</Button>
				{#if dailyAvailable}
					<span
						class="pointer-events-none absolute -top-1.5 -right-1.5 flex h-4 w-4"
						aria-hidden="true"
					>
						<span
							class="absolute inline-flex h-full w-full animate-ping rounded-full bg-main opacity-75"
						></span>
						<span
							class="relative inline-flex h-4 w-4 rounded-full border-2 border-border bg-main"
						></span>
					</span>
				{/if}
			</div>
		</div>
	</Card>

	{#if errorMsg}
		<p class="text-center font-bold text-danger">{errorMsg}</p>
	{/if}

	<!-- Solo setup: pick difficulty, category, rounds & time before starting -->
	<Dialog
		open={soloOpen}
		onclose={() => (soloOpen = false)}
		class="max-w-md max-h-[calc(100svh-2rem)] overflow-y-auto"
	>
		<div class="flex flex-col gap-4">
			<h2 class="text-xl font-extrabold">{t('solo.setup')}</h2>

			<div class="flex flex-col gap-1.5">
				<span class="text-xs font-bold tracking-wide text-ink/50 uppercase">
					{t('settings.mode')}
				</span>
				<div class="flex gap-2">
					{#each ['normal', 'endless'] as const as m (m)}
						<button
							type="button"
							class="flex-1 rounded-base border-2 border-border px-3 py-1.5 text-sm font-extrabold transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none {soloMode ===
							m
								? 'bg-main shadow-shadow'
								: 'bg-surface'}"
							onclick={() => (soloMode = m)}
						>
							{t(`mode.${m}`)}
						</button>
					{/each}
				</div>
				<p class="text-[11px] font-medium text-ink/50">
					{t(`mode.${soloMode}.desc` as 'mode.normal.desc')}
				</p>
			</div>

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
				<CategorySelect value={soloCategory} onpick={pickSoloCategory} />
			</div>

			<div class="flex flex-col gap-1.5">
				<div class="flex items-baseline justify-between gap-2">
					<span class="text-xs font-bold tracking-wide text-ink/50 uppercase">
						{t('settings.rounds')}
					</span>
					<span class="text-sm font-extrabold">
						{soloMode === 'endless' ? t('mode.endless') : soloRoundsLabel}
					</span>
				</div>
				<Slider
					bind:value={soloRounds}
					min={1}
					max={roundMax}
					disabled={soloMode === 'endless'}
					aria-label={t('settings.rounds')}
				/>
			</div>

			<div class="flex flex-col gap-1.5">
				<div class="flex items-baseline justify-between gap-2">
					<span class="text-xs font-bold tracking-wide text-ink/50 uppercase">
						{t('settings.time')}
					</span>
					<span class="text-sm font-extrabold">{soloTime}s</span>
				</div>
				<Slider
					bind:value={soloTime}
					min={MIN_TIME}
					max={MAX_TIME}
					step={TIME_STEP}
					aria-label={t('settings.time')}
				/>
			</div>

			<Button class="w-full" disabled={busy} onclick={playSolo}>
				{busy ? t('create.creating') : t('solo.start')}
			</Button>
		</div>
	</Dialog>

	<!-- Public lobbies -->
	{#if game.publicRooms.length > 0}
		<Card class="flex min-h-0 flex-col gap-2 p-3">
			<div class="flex items-baseline justify-between">
				<h2 class="text-xs font-bold tracking-wide text-ink/50 uppercase">{t('browse.title')}</h2>
				<span class="text-xs font-extrabold text-ink/40">{game.publicRooms.length}</span>
			</div>
			<ul class="flex max-h-44 min-h-0 flex-col gap-2 overflow-y-auto">
				{#each game.publicRooms as r (r.code)}
					{@const full = r.players >= r.maxPlayers}
					<li class="flex items-center gap-2 rounded-base border-2 border-border bg-bg px-2.5 py-1.5">
						<div class="min-w-0 flex-1">
							<div class="flex items-baseline gap-1.5">
								<span class="truncate text-sm font-extrabold">
									{t(`category.${r.categoryId}` as 'category.0')}
								</span>
								<span class="shrink-0 text-[10px] font-bold text-ink/50 uppercase">
									{t(`difficulty.${r.difficulty}` as 'difficulty.easy')}
								</span>
							</div>
							<p class="truncate text-[11px] font-bold text-ink/50">
								{r.hostName ? t('browse.hostedBy', { name: r.hostName }) : r.code}
							</p>
						</div>

						<span
							class="shrink-0 rounded border-2 border-border px-1.5 py-0.5 text-[10px] font-extrabold whitespace-nowrap
								{r.status === 'lobby' ? 'bg-main' : 'bg-secondary'}"
						>
							{r.status === 'lobby'
								? t('browse.lobby')
								: t('game.round', { round: r.round, max: r.maxRounds })}
						</span>
						<span class="shrink-0 text-xs font-extrabold tabular-nums">
							{r.players}/{r.maxPlayers}
						</span>
						<Button
							size="sm"
							variant="secondary"
							disabled={!canPlay || full}
							onclick={() => joinPublic(r.code)}
						>
							{full ? t('browse.full') : t('browse.join')}
						</Button>
					</li>
				{/each}
			</ul>
		</Card>
	{/if}
</div>
