<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto, beforeNavigate } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import Countdown from '$lib/components/game/Countdown.svelte';
	import ShapeCanvas from '$lib/components/game/ShapeCanvas.svelte';
	import GuessChat from '$lib/components/game/GuessChat.svelte';
	import LobbyChat from '$lib/components/game/LobbyChat.svelte';
	import Scoreboard from '$lib/components/game/Scoreboard.svelte';
	import Podium from '$lib/components/game/Podium.svelte';
	import StateInfo from '$lib/components/game/StateInfo.svelte';
	import { profile, avatarUrl } from '$lib/stores/profile.svelte';
	import { game } from '$lib/ws.svelte';
	import { t } from '$lib/i18n/index.svelte';

	const code = (page.params.code ?? '').toUpperCase();
	const solo = page.url.searchParams.get('solo') === '1';

	const ROUND_OPTIONS = [3, 5, 8, 10];
	const TIME_OPTIONS = [45, 60, 90, 120];
	const CATEGORY_CARDS = [
		{ id: 0, key: 'category.0', available: true },
		{ id: 1, key: 'category.1', available: true },
		{ id: 2, key: 'category.2', available: true },
		{ id: 3, key: 'category.3', available: true }
	] as const;

	let nameInput = $state(profile.name);
	let needsName = $state(!profile.isComplete);
	let checkedExists = $state<boolean | null>(null);
	let joinStarted = false;
	let soloStartRequested = false;

	let confirmLeave = $state(false);
	let confirmEnd = $state(false);
	let pendingUrl: string | null = null;
	let leaving = false;

	const room = $derived(game.room);
	const me = $derived(room?.players.find((p) => p.id === game.playerId) ?? null);
	const isHost = $derived(me?.isHost ?? false);
	const canStart = $derived((room?.players.length ?? 0) >= 2);
	// Number of shapes in the chosen category — caps how many rounds you can pick.
	const categorySize = $derived(room ? (room.categorySizes?.[room.categoryId] ?? Infinity) : Infinity);

	const checking = $derived(!room && checkedExists === null);
	const notFound = $derived(!room && checkedExists === false);

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
			checkedExists = false;
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

<!-- snippet: a row of pill toggle buttons -->
{#snippet pills(
	options: readonly number[],
	current: number,
	pick: (v: number) => void,
	suffix: string
)}
	<div class="flex flex-wrap gap-2">
		{#each options as opt (opt)}
			{@const active = current === opt}
			<button
				class="rounded-base border-2 border-border px-3 py-1.5 text-sm font-extrabold transition-all
					{active ? 'bg-main shadow-shadow' : 'bg-surface'}
					{isHost ? 'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none' : ''}
					{!isHost && !active ? 'opacity-40' : ''}"
				disabled={!isHost}
				onclick={() => pick(opt)}
			>
				{opt}{suffix}
			</button>
		{/each}
	</div>
{/snippet}

{#snippet settingsPanel()}
	<Card class="flex min-h-0 flex-col gap-4 overflow-y-auto p-4">
		<h2 class="text-lg font-extrabold">{t('settings.title')}</h2>

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
			<div class="grid grid-cols-2 gap-2">
				{#each CATEGORY_CARDS as cat (cat.key)}
					{@const active = room?.categoryId === cat.id}
					<button
						class="relative flex h-16 items-center justify-center rounded-base border-2 border-border p-2 text-center text-sm font-bold transition-all
							{active ? 'bg-main shadow-shadow' : 'bg-surface'}
							{isHost && cat.available
							? 'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none'
							: ''}
							{!cat.available || (!isHost && !active) ? 'opacity-40' : ''}"
						disabled={!isHost || !cat.available}
						onclick={() => game.setSettings({ categoryId: cat.id })}
					>
						{t(cat.key)}
						{#if !cat.available}
							<span
								class="absolute top-1 right-1 rounded border border-border bg-secondary px-1 text-[9px] font-extrabold"
							>
								{t('common.soon')}
							</span>
						{/if}
					</button>
				{/each}
			</div>
		</div>

		<div class="flex flex-col gap-1.5">
			<span class="text-xs font-bold tracking-wide text-ink/50 uppercase">{t('settings.rounds')}</span>
			<div class="flex flex-wrap gap-2">
				{#each ROUND_OPTIONS as opt (opt)}
					{@const active = !room?.allRounds && room?.maxRounds === opt}
					{@const tooMany = opt > categorySize}
					<button
						class="rounded-base border-2 border-border px-3 py-1.5 text-sm font-extrabold transition-all
							{active ? 'bg-main shadow-shadow' : 'bg-surface'}
							{isHost && !tooMany ? 'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none' : ''}
							{tooMany || (!isHost && !active) ? 'opacity-40' : ''}"
						disabled={!isHost || tooMany}
						onclick={() => game.setSettings({ maxRounds: opt })}
					>
						{opt}
					</button>
				{/each}
				<button
					class="rounded-base border-2 border-border px-3 py-1.5 text-sm font-extrabold transition-all
						{room?.allRounds ? 'bg-main shadow-shadow' : 'bg-surface'}
						{isHost ? 'hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none' : ''}
						{!isHost && !room?.allRounds ? 'opacity-40' : ''}"
					disabled={!isHost}
					onclick={() => game.setSettings({ allRounds: true })}
				>
					{t('settings.allRounds')}{Number.isFinite(categorySize) ? ` (${categorySize})` : ''}
				</button>
			</div>
		</div>

		<div class="flex flex-col gap-1.5">
			<span class="text-xs font-bold tracking-wide text-ink/50 uppercase">{t('settings.time')}</span>
			{@render pills(
				TIME_OPTIONS,
				room?.roundDurationSec ?? 90,
				(v) => game.setSettings({ roundDurationSec: v }),
				's'
			)}
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

				<div class="flex gap-3">
					<Button variant="neutral" onclick={requestLeave}>{t('lobby.leave')}</Button>
					<Button onclick={playAgain}>{solo ? t('solo.again') : t('game.playAgain')}</Button>
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

				<div class="grid min-h-0 flex-1 gap-4 md:grid-cols-[1fr_300px]">
					<div class="flex min-h-0 flex-col gap-3">
						{#if revealing}
							<!-- Reveal: shape shrinks to make room for the answer + info -->
							<div class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
								<div class="min-h-[16svh] flex-1">
									<ShapeCanvas round={game.round} revealed reveal={revealInfo} />
								</div>
								<p
									class="shrink-0 rounded-base border-2 border-border bg-main px-4 py-2 text-center text-lg font-extrabold shadow-shadow"
								>
									{t('game.theAnswerWas', { answer: game.roundResult?.answer ?? '' })}
								</p>
								{#if game.roundResult?.info}
									<div class="shrink-0">
										<StateInfo info={game.roundResult.info} name={game.roundResult.answer} />
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
		<p class="flex flex-1 items-center justify-center font-bold text-ink/60">
			{t('common.connecting')}
		</p>

		<!-- Lobby (multiplayer) -->
	{:else}
		<div class="flex min-h-0 flex-1 flex-col gap-4">
			<div class="grid min-h-0 flex-1 gap-4 md:grid-cols-2">
				<!-- Left: players + chat -->
				<div class="flex min-h-0 flex-col gap-4">
					<Card class="flex min-h-0 flex-1 flex-col p-4">
						<h2 class="mb-3 text-lg font-extrabold">
							{t('lobby.players')} <span class="text-ink/40">({room.players.length})</span>
						</h2>
						<ul class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
							{#each room.players as p (p.id)}
								<li
									class="flex items-center gap-3 rounded-base border-2 border-border bg-bg px-3 py-2 {p.connected
										? ''
										: 'opacity-50'}"
								>
									<img
										src={avatarUrl(p.avatar, p.name)}
										alt={p.name}
										width="36"
										height="36"
										class="rounded-base border-2 border-border bg-surface"
									/>
									<span class="truncate font-bold">{p.name}</span>
									{#if p.wins > 0}
										<span class="text-xs font-bold text-ink/50" title="Wins">🏆 {p.wins}</span>
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
						class="flex flex-[2] items-center justify-center rounded-base border-2 border-dashed border-border/40 font-bold text-ink/50"
					>
						{t('lobby.waitingHost')}
					</div>
				{/if}
			</div>
		</div>
	{/if}
{:else if notFound}
	<div class="flex flex-1 items-center justify-center">
		<Card class="p-8 text-center">
			<p class="mb-4 text-lg font-extrabold">{t('room.notFound', { code })}</p>
			<Button href="/" variant="neutral">{t('common.back')}</Button>
		</Card>
	</div>
{:else if checking}
	<p class="flex flex-1 items-center justify-center font-bold text-ink/60">{t('common.connecting')}</p>
{:else if needsName}
	<!-- Skeleton lobby behind the name dialog -->
	<div class="grid min-h-0 flex-1 gap-4 md:grid-cols-2" aria-hidden="true">
		<Card class="flex flex-col gap-3 p-4">
			<div class="h-5 w-24 rounded bg-ink/10"></div>
			{#each [1, 2, 3] as i (i)}
				<div class="h-12 rounded-base border-2 border-border/20 bg-bg"></div>
			{/each}
		</Card>
		<Card class="flex flex-col gap-3 p-4">
			<div class="h-5 w-28 rounded bg-ink/10"></div>
			<div class="h-9 w-full rounded bg-ink/5"></div>
			<div class="h-9 w-full rounded bg-ink/5"></div>
			<div class="grid grid-cols-2 gap-2">
				<div class="h-16 rounded-base border-2 border-border/20 bg-bg"></div>
				<div class="h-16 rounded-base border-2 border-border/20 bg-bg"></div>
			</div>
		</Card>
	</div>
{:else}
	<p class="flex flex-1 items-center justify-center font-bold text-ink/60">{t('common.connecting')}</p>
{/if}

<!-- Name dialog for players opening a room link directly (only once the room is confirmed to exist) -->
<Dialog open={needsName && checkedExists === true} dismissable={false}>
	<h2 class="mb-1 text-xl font-extrabold">{t('lobby.nameTitle')}</h2>
	<p class="mb-4 text-sm font-medium text-ink/50">{code}</p>
	<form class="flex items-center gap-3" onsubmit={(e) => (e.preventDefault(), confirmName())}>
		<div class="flex items-center gap-3">
			<button
				type="button"
				onclick={() => profile.cycleAvatar()}
				class="shrink-0 rounded-base border-2 border-border bg-surface shadow-shadow"
			>
				<img src={avatarUrl(profile.avatar, nameInput)} alt="avatar" width="44" height="44" />
			</button>
			<Input bind:value={nameInput} placeholder={t('identity.namePlaceholder')} maxlength={20} />
		</div>
		<Button type="submit" disabled={nameInput.trim().length === 0}>{t('join.title')}</Button>
	</form>
</Dialog>

<!-- Leave confirmation -->
<Dialog open={confirmLeave} onclose={cancelLeave}>
	<h2 class="mb-2 text-xl font-extrabold">{t('leave.title')}</h2>
	<p class="mb-5 text-sm font-medium text-ink/60">{t('leave.text')}</p>
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
