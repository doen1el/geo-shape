<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
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
		{ id: -1, key: 'category.world', available: false },
		{ id: -2, key: 'category.europe', available: false },
		{ id: -3, key: 'category.continent', available: false }
	] as const;

	let nameInput = $state(profile.name);
	let needsName = $state(!profile.isComplete);

	let confirmLeave = $state(false);
	let pendingUrl: string | null = null;
	let leaving = false;

	const room = $derived(game.room);
	const me = $derived(room?.players.find((p) => p.id === game.playerId) ?? null);
	const isHost = $derived(me?.isHost ?? false);
	const canStart = $derived((room?.players.length ?? 0) >= 2);

	onMount(() => {
		if (!needsName) ensureJoined();
	});

	async function ensureJoined() {
		if (game.room?.code === code) return;
		await game.join(code, profile.toJSON());
	}

	function confirmName() {
		if (nameInput.trim().length === 0) return;
		profile.set(nameInput);
		needsName = false;
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

	function playAgain() {
		if (solo) game.start();
		else game.dismissGameOver();
	}

	onDestroy(() => {
		if (!leaving && game.room?.code === code) game.leave();
	});
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
			<span class="text-xs font-bold tracking-wide text-ink/50 uppercase">{t('settings.rounds')}</span>
			{@render pills(ROUND_OPTIONS, room?.maxRounds ?? 5, (v) => game.setSettings({ maxRounds: v }), '')}
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
	</Card>
{/snippet}

{#if game.error && !room && !needsName}
	<div class="flex flex-1 items-center justify-center">
		<Card class="p-8 text-center">
			<p class="mb-4 text-lg font-extrabold">{t('room.notFound', { code })}</p>
			<Button href="/" variant="neutral">{t('common.back')}</Button>
		</Card>
	</div>
{:else if room}
	<!-- Game Over -->
	{#if game.gameOver}
		<div class="flex flex-1 items-center justify-center">
			<Card class="flex w-full max-w-md flex-col items-center gap-4 p-8 text-center">
				<h2 class="text-2xl font-extrabold">{t('game.gameOver')}</h2>
				<p class="text-xl font-bold">
					{#if game.gameOver.isTie}
						{t('game.tie')}
					{:else if game.gameOver.winnerName}
						{t('game.winner', { name: game.gameOver.winnerName })}
					{/if}
				</p>
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
			<div class="grid min-h-0 flex-1 gap-4 md:grid-cols-[1fr_260px]">
				<div class="flex min-h-0 flex-col gap-3">
					<ShapeCanvas round={game.round} revealed={!!game.roundResult} />
					{#if game.roundResult}
						<p
							class="rounded-base border-2 border-border bg-main px-4 py-2 text-center text-lg font-extrabold shadow-shadow"
						>
							{t('game.theAnswerWas', { answer: game.roundResult.answer })}
						</p>
						{#if game.roundResult.info}
							<StateInfo info={game.roundResult.info} name={game.roundResult.answer} />
						{/if}
					{/if}
					<div class="min-h-0 flex-1">
						<GuessChat />
					</div>
				</div>
				<div class="flex min-h-0 flex-col gap-3 overflow-y-auto">
					<h3 class="font-extrabold">{t('game.scores')}</h3>
					<Scoreboard players={room.players} playerId={game.playerId} showSolved={true} />
				</div>
			</div>
		{:else}
			<p class="flex flex-1 items-center justify-center font-bold text-ink/60">
				{t('game.waitingNextRound')}
			</p>
		{/if}

		<!-- Lobby -->
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

					<Card class="flex min-h-0 flex-1 flex-col p-3">
						<h2 class="mb-2 text-sm font-extrabold tracking-wide text-ink/50 uppercase">
							{t('lobby.chat')}
						</h2>
						<div class="min-h-0 flex-1">
							<LobbyChat />
						</div>
					</Card>
				</div>

				<!-- Settings -->
				{@render settingsPanel()}
			</div>

			<!-- Actions -->
			<div class="flex shrink-0 flex-col gap-1">
				{#if isHost && !canStart}
					<span class="text-center text-xs font-bold text-ink/40">{t('lobby.needPlayers')}</span>
				{/if}
				<div class="flex items-stretch gap-3">
					<Button variant="neutral" class="flex-1" onclick={requestLeave}>{t('lobby.leave')}</Button>
					{#if isHost}
						<Button class="flex-[2]" disabled={!canStart} onclick={() => game.start()}>
							{t('lobby.start')}
						</Button>
					{:else}
						<div
							class="flex flex-[2] items-center justify-center rounded-base border-2 border-dashed border-border/40 font-bold text-ink/50"
						>
							{t('lobby.waitingHost')}
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
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

<!-- Name dialog for players opening a room link directly -->
<Dialog open={needsName} dismissable={false}>
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
