<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto, beforeNavigate } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import Slider from '$lib/components/ui/Slider.svelte';
	import CategorySelect from '$lib/components/game/CategorySelect.svelte';
	import Countdown from '$lib/components/game/Countdown.svelte';
	import ShapeCanvas from '$lib/components/game/ShapeCanvas.svelte';
	import GuessChat from '$lib/components/game/GuessChat.svelte';
	import LobbyChat from '$lib/components/game/LobbyChat.svelte';
	import Scoreboard from '$lib/components/game/Scoreboard.svelte';
	import Podium from '$lib/components/game/Podium.svelte';
	import StateInfo from '$lib/components/game/StateInfo.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import AvatarPicker from '$lib/components/ui/AvatarPicker.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Loading from '$lib/components/ui/Loading.svelte';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';
	import { profile } from '$lib/stores/profile.svelte';
	import { game } from '$lib/ws.svelte';
	import { DEF_BY_ID } from '$lib/badges';
	import { i18n, t } from '$lib/i18n/index.svelte';
	import { Trophy, MapPinOff, UsersRound, House } from '@lucide/svelte';

	const code = (page.params.code ?? '').toUpperCase();
	const solo = page.url.searchParams.get('solo') === '1';
	const daily = page.url.searchParams.get('daily') === '1';
	const singlePlayer = solo || daily;

	const MIN_TIME = 30;
	const MAX_TIME = 180;
	const TIME_STEP = 15;
	const MIN_MAX_PLAYERS = 2;
	const MAX_MAX_PLAYERS = 20;

	let nameInput = $state(profile.name);
	let needsName = $state(!profile.isComplete);
	let checkedExists = $state<boolean | null>(null);
	let roomFull = $state(false);
	let joinStarted = false;
	let soloStartRequested = false;

	let confirmLeave = $state(false);
	let confirmEnd = $state(false);
	let pendingUrl: string | null = null;
	let leaving = false;

	const nf = $derived(new Intl.NumberFormat(i18n.locale === 'de' ? 'de-DE' : 'en-US'));

	const soloPlayer = $derived(
		game.gameOver?.players.find((p) => p.id === game.playerId) ?? game.gameOver?.players[0] ?? null
	);

	const room = $derived(game.room);
	const me = $derived(room?.players.find((p) => p.id === game.playerId) ?? null);
	const isHost = $derived(me?.isHost ?? false);
	const canStart = $derived((room?.players.length ?? 0) >= 2);
	const categorySize = $derived(room ? (room.categorySizes?.[room.categoryId] ?? Infinity) : Infinity);
	const roundMax = $derived(Number.isFinite(categorySize) ? categorySize : 10);

	let roundsUi = $state(5);
	let timeUi = $state(90);
	let playersUi = $state(10);
	$effect(() => {
		roundsUi = room?.allRounds ? roundMax : Math.min(room?.maxRounds ?? 5, roundMax);
	});
	$effect(() => {
		timeUi = room?.roundDurationSec ?? 90;
	});
	$effect(() => {
		playersUi = room?.maxPlayers ?? 10;
	});

	const playersMin = $derived(Math.max(MIN_MAX_PLAYERS, room?.players.length ?? 0));

	const roundsLabel = $derived(
		roundsUi >= roundMax
			? `${t('settings.allRounds')}${Number.isFinite(categorySize) ? ` (${categorySize})` : ''}`
			: String(roundsUi)
	);

	function commitRounds(v: number) {
		if (v >= roundMax) game.setSettings({ allRounds: true });
		else game.setSettings({ maxRounds: v });
	}

	const checking = $derived(!room && checkedExists === null);
	const notFound = $derived(!room && checkedExists === false);

	// Coarse figures from the room check, used to make the lobby behind the join
	// dialog reflect the real room. Never contains the other players' identities.
	const preview = $derived(game.roomCheck?.code === code ? game.roomCheck : null);
	const previewRows = $derived(Math.min(Math.max(preview?.players ?? 3, 1), 6));

	const revealInfo = $derived(
		game.roundResult
			? {
					nextRoundAt: game.roundResult.nextRoundAt,
					totalMs: game.roundResult.nextInMs,
					isLast: game.roundResult.isLast
				}
			: null
	);

	onMount(() => {
		if (game.room?.code === code) checkedExists = true;
		else game.checkRoom(code);
	});

	$effect(() => {
		if (game.room?.code === code) {
			checkedExists = true;
			return;
		}
		const rc = game.roomCheck;
		if (!rc || rc.code !== code) return;
		checkedExists = rc.exists;
		if (rc.exists && !needsName && !joinStarted) {
			joinStarted = true;
			ensureJoined();
		}
	});

	$effect(() => {
		if (
			solo &&
			isHost &&
			room?.status === 'lobby' &&
			!game.countdown &&
			!game.round &&
			!game.gameOver &&
			!soloStartRequested
		) {
			soloStartRequested = true;
			game.start();
		}
	});

	async function ensureJoined() {
		if (game.room?.code === code) return;
		try {
			await game.join(code, profile.toJSON());
		} catch {
			if (game.errorCode === 'full') roomFull = true;
			else checkedExists = false;
		}
	}

	function confirmName() {
		if (nameInput.trim().length === 0) return;
		profile.set(nameInput);
		needsName = false;
		joinStarted = true;
		ensureJoined();
	}

	beforeNavigate((nav) => {
		if (leaving || nav.type === 'leave') return;
		if (!game.room || game.room.code !== code) return;

		if (singlePlayer && game.gameOver) {
			leaving = true;
			game.leave();
			return;
		}
		nav.cancel();
		pendingUrl = nav.to?.url.href ?? '/';
		confirmLeave = true;
	});

	function doLeave() {
		leaving = true;
		confirmLeave = false;
		game.leave();
		goto(pendingUrl ?? '/');
	}
	function cancelLeave() {
		confirmLeave = false;
		pendingUrl = null;
	}
	function requestLeave() {
		goto('/');
	}

	function togglePause() {
		if (game.paused) game.resume();
		else game.pause();
	}
	function doEndGame() {
		confirmEnd = false;
		game.abort();
	}

	function playAgain() {
		if (solo) game.start();
		else game.dismissGameOver();
	}
</script>

{#snippet settingsPanel()}
	<Card class="flex min-h-0 flex-col gap-4 overflow-y-auto p-4">
		<h2 class="text-lg font-extrabold">{t('settings.title')}</h2>

		<div class="flex flex-wrap items-start gap-x-6 gap-y-3">
			<div class="flex flex-col gap-1.5">
				<span class="text-xs font-bold tracking-wide text-ink/50 uppercase">
					{t('settings.visibility')}
				</span>
				<div class="flex gap-2">
					{#each [false, true] as pub (pub)}
						{@const active = (room?.isPublic ?? false) === pub}
						<button
							class="rounded-base border-2 border-border px-3 py-1.5 text-sm font-extrabold transition-all
								{active ? 'bg-main shadow-shadow' : 'bg-surface'}
								{isHost ? 'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none' : ''}
								{!isHost && !active ? 'opacity-40' : ''}"
							disabled={!isHost}
							onclick={() => game.setSettings({ isPublic: pub })}
						>
							{pub ? t('visibility.public') : t('visibility.private')}
						</button>
					{/each}
				</div>
			</div>

			<div class="flex min-w-[8rem] flex-1 flex-col gap-1.5">
				<div class="flex items-baseline justify-between gap-2">
					<span class="text-xs font-bold tracking-wide text-ink/50 uppercase">
						{t('settings.maxPlayers')}
					</span>
					<span class="text-sm font-extrabold">{playersUi}</span>
				</div>
				<Slider
					bind:value={playersUi}
					min={playersMin}
					max={MAX_MAX_PLAYERS}
					disabled={!isHost}
					oncommit={(v) => game.setSettings({ maxPlayers: v })}
					aria-label={t('settings.maxPlayers')}
				/>
			</div>
		</div>
		<p class="-mt-2 text-[11px] font-medium text-ink/50">
			{room?.isPublic ? t('visibility.public.desc') : t('visibility.private.desc')}
		</p>

		<div class="flex flex-col gap-1.5">
			<span class="text-xs font-bold tracking-wide text-ink/50 uppercase">
				{t('settings.difficulty')}
			</span>
			<div class="flex flex-wrap gap-2">
				{#each ['easy', 'hard'] as const as diff (diff)}
					{@const active = (room?.difficulty ?? 'easy') === diff}
					<button
						class="rounded-base border-2 border-border px-3 py-1.5 text-sm font-extrabold transition-all
							{active ? 'bg-main shadow-shadow' : 'bg-surface'}
							{isHost ? 'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none' : ''}
							{!isHost && !active ? 'opacity-40' : ''}"
						disabled={!isHost}
						onclick={() => game.setSettings({ difficulty: diff })}
					>
						{t(`difficulty.${diff}`)}
					</button>
				{/each}
			</div>
			<p class="text-[11px] font-medium text-ink/50">
				{t(`difficulty.${room?.difficulty ?? 'easy'}.desc` as 'difficulty.easy.desc')}
			</p>
		</div>

		<div class="flex flex-col gap-1.5">
			<span class="text-xs font-bold tracking-wide text-ink/50 uppercase">
				{t('settings.category')}
			</span>
			<CategorySelect
				value={room?.categoryId ?? 1}
				disabled={!isHost}
				onpick={(id) => game.setSettings({ categoryId: id })}
			/>
		</div>

		<div class="flex flex-col gap-1.5">
			<div class="flex items-baseline justify-between gap-2">
				<span class="text-xs font-bold tracking-wide text-ink/50 uppercase">{t('settings.rounds')}</span>
				<span class="text-sm font-extrabold">{roundsLabel}</span>
			</div>
			<Slider
				bind:value={roundsUi}
				min={1}
				max={roundMax}
				disabled={!isHost}
				oncommit={commitRounds}
				aria-label={t('settings.rounds')}
			/>
		</div>

		<div class="flex flex-col gap-1.5">
			<div class="flex items-baseline justify-between gap-2">
				<span class="text-xs font-bold tracking-wide text-ink/50 uppercase">{t('settings.time')}</span>
				<span class="text-sm font-extrabold">{timeUi}s</span>
			</div>
			<Slider
				bind:value={timeUi}
				min={MIN_TIME}
				max={MAX_TIME}
				step={TIME_STEP}
				disabled={!isHost}
				oncommit={(v) => game.setSettings({ roundDurationSec: v })}
				aria-label={t('settings.time')}
			/>
		</div>

	</Card>
{/snippet}

{#if room}
	<!-- Game Over -->
	{#if game.gameOver}
		<div class="flex flex-1 items-center justify-center">
			<Card
				class="flex max-h-full w-full max-w-lg flex-col items-center gap-5 overflow-y-auto p-6 text-center"
			>
				{#if singlePlayer}
					<h2 class="text-2xl font-extrabold">{t('game.soloDone')}</h2>

					<Avatar
						style={soloPlayer?.avatar ?? profile.avatar}
						seed={soloPlayer?.name ?? profile.name}
						size={72}
						alt={soloPlayer?.name ?? profile.name}
						class="rounded-base border-2 border-border bg-surface shadow-shadow"
					/>

					<div class="w-full rounded-base border-2 border-border bg-main px-4 py-5 shadow-shadow">
						<div class="text-4xl font-extrabold tabular-nums">
							{nf.format(soloPlayer?.score ?? 0)}
						</div>
						<div class="mt-0.5 text-xs font-bold tracking-wide text-ink/60 uppercase">
							{t('game.yourScore')}
						</div>
					</div>
				{:else}
					<div>
						<h2 class="text-2xl font-extrabold">{t('game.gameOver')}</h2>
						<p class="mt-1 text-lg font-bold">
							{#if game.gameOver.isTie}
								{t('game.tie')}
							{:else if game.gameOver.winnerName}
								{t('game.winner', { name: game.gameOver.winnerName })}
							{/if}
						</p>
					</div>

					<Podium players={game.gameOver.players} playerId={game.playerId} />

					<div class="w-full">
						<Scoreboard players={game.gameOver.players} playerId={game.playerId} />
					</div>
				{/if}

				{#if game.gameBadges.length}
					<div class="w-full">
						<p class="mb-2 text-xs font-bold tracking-wide text-ink/50 uppercase">
							{t('game.unlocked')}
						</p>
						<div class="flex flex-wrap justify-center gap-2">
							{#each game.gameBadges as id (id)}
								{#if DEF_BY_ID.has(id)}
									<Badge {id} size="sm" class="w-24" />
								{/if}
							{/each}
						</div>
					</div>
				{/if}

				<div class="flex gap-3">
					{#if daily}
						<Button href="/daily">{t('daily.title')}</Button>
					{:else}
						<Button variant="neutral" onclick={requestLeave}>{t('lobby.leave')}</Button>
						<Button onclick={playAgain}>{solo ? t('solo.again') : t('game.playAgain')}</Button>
					{/if}
				</div>
			</Card>
		</div>

		<!-- Playing -->
	{:else if room.status === 'playing'}
		{#if game.countdown && !game.round}
			<Countdown until={game.countdown.until} />
		{:else if game.round}
			{@const revealing = !!game.roundResult}
			<div class="flex min-h-0 flex-1 flex-col gap-3">
				<!-- Control bar: host pause / end + everyone can leave -->
				<div class="flex shrink-0 items-center gap-2">
					<div class="ml-auto flex items-center gap-2">
						{#if isHost && !revealing}
							<Button size="sm" variant="neutral" onclick={togglePause}>
								{game.paused ? t('game.resume') : t('game.pause')}
							</Button>
						{/if}
						{#if isHost && !solo}
							<Button size="sm" variant="neutral" onclick={() => (confirmEnd = true)}>
								{t('game.endGame')}
							</Button>
						{/if}
						<Button size="sm" variant="danger" onclick={requestLeave}>{t('lobby.leave')}</Button>
					</div>
				</div>

				<div class="grid min-h-0 flex-1 gap-4 sm:grid-cols-[1fr_260px] md:grid-cols-[1fr_300px]">
					<div class="flex min-h-0 flex-col gap-3">
						{#if revealing}
							<div class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1 pb-1">
								<div class="min-h-[16svh] flex-1">
									<ShapeCanvas
										round={game.round}
										revealed
										reveal={revealInfo}
										context={game.roundResult?.context}
										revealPath={game.roundResult?.revealPath}
									/>
								</div>
								<p
									class="shrink-0 rounded-base border-2 border-border bg-main px-4 py-2 text-center text-lg font-extrabold shadow-shadow"
								>
									{t('game.theAnswerWas', {
										answer:
											(i18n.locale === 'de'
												? game.roundResult?.answerDe
												: game.roundResult?.answer) ?? ''
									})}
								</p>
								{#if game.roundResult?.info}
									<div class="shrink-0">
										<StateInfo
											info={game.roundResult.info}
											name={(i18n.locale === 'de'
												? game.roundResult.answerDe
												: game.roundResult.answer) ?? game.roundResult.answer}
										/>
									</div>
								{/if}
							</div>
						{:else}
							<div class="min-h-0 flex-[3]">
								<ShapeCanvas round={game.round} paused={game.paused} />
							</div>
							<div class="flex min-h-0 flex-[2] flex-col gap-1.5">
								<h3 class="shrink-0 font-extrabold">{t('lobby.chat')}</h3>
								<div class="min-h-0 flex-1">
									<GuessChat />
								</div>
							</div>
						{/if}
					</div>
					<div class="flex min-h-0 flex-col gap-3 overflow-y-auto">
						<h3 class="font-extrabold">{t('game.scores')}</h3>
						<Scoreboard players={room.players} playerId={game.playerId} showSolved={true} />
					</div>
				</div>
			</div>
		{:else}
			<p class="flex flex-1 items-center justify-center font-bold text-ink/60">
				{t('game.waitingNextRound')}
			</p>
		{/if}

		<!-- Solo: no lobby, just a brief "starting" screen while it auto-starts -->
	{:else if solo}
		<Loading card class="flex-1" />

		<!-- Lobby (multiplayer) -->
	{:else}
		<div class="flex min-h-0 flex-1 flex-col gap-4">
			<div class="grid min-h-0 flex-1 gap-4 sm:grid-cols-2">
				<!-- Left: players + chat -->
				<div class="flex min-h-0 flex-col gap-4">
					<Card class="flex min-h-0 flex-1 flex-col p-4">
						<h2 class="mb-3 text-lg font-extrabold">
							{t('lobby.players')}
							<span class="text-ink/40">({room.players.length}/{room.maxPlayers})</span>
						</h2>
						<ul class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
							{#each room.players as p (p.id)}
								<li
									class="flex items-center gap-3 rounded-base border-2 border-border bg-bg px-3 py-2 {p.connected
										? ''
										: 'opacity-50'}"
								>
									<Avatar
										style={p.avatar}
										seed={p.name}
										size={36}
										alt={p.name}
										class="rounded-base border-2 border-border bg-surface"
									/>
									{#if p.publicId}
										<a
											href="/p/{p.publicId}"
											target="_blank"
											rel="noopener"
											class="truncate font-bold hover:underline"
											title={t('lobby.viewProfile')}
										>
											{p.name}
										</a>
									{:else}
										<span class="truncate font-bold">{p.name}</span>
									{/if}
									{#if p.wins > 0}
										<span
											class="flex items-center gap-1 text-xs font-bold text-ink/50"
											title={t('stats.wins')}
										>
											<Trophy size={13} class="text-ink" aria-hidden="true" />
											{p.wins}
										</span>
									{/if}
									<span class="ml-auto flex items-center gap-2">
										{#if p.isHost}
											<span
												class="rounded border-2 border-border bg-secondary px-1.5 py-0.5 text-[10px] font-extrabold"
											>
												{t('lobby.host')}
											</span>
										{/if}
										{#if p.id === game.playerId}
											<span class="text-[10px] font-bold text-ink/50">{t('lobby.you')}</span>
										{/if}
									</span>
								</li>
							{/each}
						</ul>
					</Card>

					<Card class="flex min-h-0 flex-1 flex-col p-4">
						<h2 class="mb-3 text-lg font-extrabold">{t('lobby.chat')}</h2>
						<div class="min-h-0 flex-1">
							<LobbyChat />
						</div>
					</Card>
				</div>

				<!-- Settings -->
				{@render settingsPanel()}
			</div>

			<!-- Actions -->
			<div class="flex shrink-0 items-stretch gap-3">
				<Button variant="neutral" class="flex-1" onclick={requestLeave}>{t('lobby.leave')}</Button>
				{#if isHost}
					<!-- Tooltip only shows while hovering the disabled Start button -->
					<div class="group relative flex flex-[2]">
						<Button class="w-full" disabled={!canStart} onclick={() => game.start()}>
							{t('lobby.start')}
						</Button>
						{#if !canStart}
							<div
								class="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 rounded-base border-2 border-border bg-secondary px-2.5 py-1 text-xs font-bold whitespace-nowrap opacity-0 shadow-shadow transition-opacity duration-150 group-hover:opacity-100"
							>
								{t('lobby.needPlayers')}
							</div>
						{/if}
					</div>
				{:else}
					<div
						class="mt-1 flex flex-[2] items-center justify-center rounded-base border-2 border-dashed border-border/40 font-bold text-ink/50"
					>
						{t('lobby.waitingHost')}
					</div>
				{/if}
			</div>
		</div>
	{/if}
{:else if roomFull}
	<ErrorState
		icon={UsersRound}
		title={t('room.full', { code })}
		desc={t('room.full.desc')}
		class="flex-1"
	>
		{#snippet actions()}
			<Button href="/" class="gap-2">
				<House size={18} aria-hidden="true" />
				{t('error.home')}
			</Button>
		{/snippet}
	</ErrorState>
{:else if notFound}
	<ErrorState
		icon={MapPinOff}
		title={t('room.notFound', { code })}
		desc={t('room.notFound.desc')}
		class="flex-1"
	>
		{#snippet actions()}
			<Button href="/" class="gap-2">
				<House size={18} aria-hidden="true" />
				{t('error.home')}
			</Button>
		{/snippet}
	</ErrorState>
{:else if checking}
	<Loading card class="flex-1" />
{:else if needsName}
	<!-- Skeleton lobby behind the name dialog — mirrors the real lobby layout. -->
	<div class="grid min-h-0 flex-1 gap-4 sm:grid-cols-2" aria-hidden="true">
		<div class="flex min-h-0 flex-col gap-4">
			<Card class="flex min-h-0 flex-1 flex-col gap-3 p-4">
				<h2 class="text-lg font-extrabold">
					{t('lobby.players')}
					{#if preview?.players != null}
						<span class="text-ink/40">({preview.players}/{preview.maxPlayers})</span>
					{/if}
				</h2>
				{#each { length: previewRows } as _, i (i)}
					<div class="flex items-center gap-3 rounded-base border-2 border-border bg-bg px-3 py-2">
						<div class="h-9 w-9 shrink-0 rounded-base border-2 border-border bg-surface"></div>
						{#if i === 0 && preview?.hostName}
							<span class="truncate font-bold">{preview.hostName}</span>
							<span
								class="ml-auto rounded border-2 border-border bg-secondary px-1.5 py-0.5 text-[10px] font-extrabold"
							>
								{t('lobby.host')}
							</span>
						{:else}
							<div class="h-3.5 rounded bg-ink/15" style="width: {[7, 5, 6, 4, 6, 5][i % 6]}rem"></div>
						{/if}
					</div>
				{/each}
			</Card>

			<Card class="flex min-h-0 flex-1 flex-col gap-3 p-4">
				<div class="h-6 w-20 rounded bg-ink/10"></div>
				<div class="h-3 w-3/4 rounded bg-ink/10"></div>
				<div class="h-3 w-1/2 rounded bg-ink/10"></div>
				<div class="mt-auto h-11 rounded-base border-2 border-border bg-bg"></div>
			</Card>
		</div>

		<Card class="flex min-h-0 flex-col gap-4 p-4">
			<h2 class="text-lg font-extrabold">{t('settings.title')}</h2>

			{#if preview?.difficulty}
				<div class="flex flex-col gap-1.5">
					<span class="text-xs font-bold tracking-wide text-ink/50 uppercase">
						{t('settings.difficulty')}
					</span>
					<div class="flex gap-2">
						{#each ['easy', 'hard'] as const as d (d)}
							<span
								class="rounded-base border-2 border-border px-3 py-1.5 text-sm font-extrabold
									{preview.difficulty === d ? 'bg-main shadow-shadow' : 'bg-surface opacity-40'}"
							>
								{t(d === 'easy' ? 'difficulty.easy' : 'difficulty.hard')}
							</span>
						{/each}
					</div>
				</div>
			{/if}

			{#if preview?.categoryId != null}
				<div class="flex flex-col gap-1.5">
					<span class="text-xs font-bold tracking-wide text-ink/50 uppercase">
						{t('settings.category')}
					</span>
					<span
						class="w-fit rounded-base border-2 border-border bg-main px-3 py-1.5 text-sm font-extrabold shadow-shadow"
					>
						{t(`category.${preview.categoryId}` as 'category.0')}
					</span>
				</div>
			{/if}

			{#each [0, 1] as i (i)}
				<div class="flex flex-col gap-1.5">
					<div class="h-3 w-24 rounded bg-ink/10"></div>
					<div class="h-3.5 rounded-base border-2 border-border bg-surface"></div>
				</div>
			{/each}
			<div class="mt-auto h-11 rounded-base border-2 border-border bg-main shadow-shadow"></div>
		</Card>
	</div>
{:else}
	<Loading card class="flex-1" />
{/if}

<!-- Name dialog for players opening a room link directly -->
<Dialog open={needsName && checkedExists === true} dismissable={false}>
	<h2 class="text-xl font-extrabold">{t('lobby.nameTitle')}</h2>

	<div class="mt-3 mb-5 flex items-center gap-2">
		<span class="text-xs font-bold tracking-wide text-ink/50 uppercase">
			{t('room.codeLabel')}
		</span>
		<span
			class="rounded-base border-2 border-border bg-bg px-2.5 py-1 text-sm font-extrabold tracking-[0.25em]"
		>
			{code}
		</span>
	</div>

	<form class="flex flex-col gap-3" onsubmit={(e) => (e.preventDefault(), confirmName())}>
		<div class="flex items-center gap-3">
			<AvatarPicker seed={nameInput} size={56} />
			<Input
				bind:value={nameInput}
				placeholder={t('identity.namePlaceholder')}
				maxlength={20}
				class="flex-1"
			/>
		</div>
		<Button type="submit" class="w-full" disabled={nameInput.trim().length === 0}>
			{t('join.title')}
		</Button>
	</form>
</Dialog>

<!-- Leave confirmation -->
<Dialog open={confirmLeave} onclose={cancelLeave}>
	<h2 class="mb-2 text-xl font-extrabold">
		{singlePlayer ? t('leave.titleSolo') : t('leave.title')}
	</h2>
	<p class="mb-5 text-sm font-medium text-ink/60">
		{singlePlayer ? t('leave.textSolo') : t('leave.text')}
	</p>
	<div class="flex justify-end gap-3">
		<Button variant="neutral" onclick={cancelLeave}>{t('leave.cancel')}</Button>
		<Button variant="danger" onclick={doLeave}>{t('leave.confirm')}</Button>
	</div>
</Dialog>

<!-- End game confirmation (host) -->
<Dialog open={confirmEnd} onclose={() => (confirmEnd = false)}>
	<h2 class="mb-2 text-xl font-extrabold">{t('game.endTitle')}</h2>
	<p class="mb-5 text-sm font-medium text-ink/60">{t('game.endText')}</p>
	<div class="flex justify-end gap-3">
		<Button variant="neutral" onclick={() => (confirmEnd = false)}>{t('common.cancel')}</Button>
		<Button variant="danger" onclick={doEndGame}>{t('game.endGame')}</Button>
	</div>
</Dialog>
