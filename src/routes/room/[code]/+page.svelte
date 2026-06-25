<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import ShapeCanvas from '$lib/components/game/ShapeCanvas.svelte';
	import GuessChat from '$lib/components/game/GuessChat.svelte';
	import Scoreboard from '$lib/components/game/Scoreboard.svelte';
	import StateInfo from '$lib/components/game/StateInfo.svelte';
	import { profile, avatarUrl } from '$lib/stores/profile.svelte';
	import { game } from '$lib/ws.svelte';
	import { t } from '$lib/i18n/index.svelte';

	const ALL_CATEGORIES = [0, 1, 2];
	const PLAYABLE = [0];

	const code = (page.params.code ?? '').toUpperCase();
	const solo = page.url.searchParams.get('solo') === '1';

	let nameInput = $state(profile.name);
	let needsName = $state(!profile.isComplete);
	let copied = $state(false);

	const room = $derived(game.room);
	const me = $derived(room?.players.find((p) => p.id === game.playerId) ?? null);
	const isHost = $derived(me?.isHost ?? false);

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

	async function copyCode() {
		try {
			await navigator.clipboard.writeText(code);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {
		}
	}

	function leave() {
		game.leave();
		goto('/');
	}

	function playAgain() {
		if (solo) game.start();
		else game.dismissGameOver();
	}

	onDestroy(() => {
		if (game.room?.code === code) game.leave();
	});
</script>

{#if needsName}
	<Card class="p-6">
		<h2 class="mb-4 text-xl font-extrabold">{t('lobby.nameTitle')}</h2>
		<form class="flex gap-3" onsubmit={(e) => (e.preventDefault(), confirmName())}>
			<Input bind:value={nameInput} placeholder={t('identity.namePlaceholder')} maxlength={20} />
			<Button type="submit" disabled={nameInput.trim().length === 0}>{t('join.title')}</Button>
		</form>
	</Card>
{:else if game.error && !room}
	<Card class="p-8 text-center">
		<p class="mb-4 text-lg font-extrabold">{t('room.notFound', { code })}</p>
		<Button href="/" variant="neutral">{t('common.back')}</Button>
	</Card>
{:else if !room}
	<p class="text-center font-bold text-ink/60">{t('common.connecting')}</p>
{:else}
	<!-- Game Over Overlay  -->
	{#if game.gameOver}
		<Card class="flex flex-col items-center gap-4 p-8 text-center">
			<h2 class="text-2xl font-extrabold">{t('game.gameOver')}</h2>
			<p class="text-xl font-bold">
				{#if game.gameOver.isTie}
					{t('game.tie')}
				{:else if game.gameOver.winnerName}
					{t('game.winner', { name: game.gameOver.winnerName })}
				{/if}
			</p>
			<div class="w-full max-w-sm">
				<Scoreboard players={game.gameOver.players} playerId={game.playerId} />
			</div>
			<div class="flex gap-3">
				<Button variant="neutral" onclick={leave}>{t('lobby.leave')}</Button>
				<Button onclick={playAgain}>{solo ? t('solo.again') : t('game.playAgain')}</Button>
			</div>
		</Card>

		<!-- Playing -->
	{:else if room.status === 'playing'}
		{#if game.round}
			<div class="grid gap-4 md:grid-cols-[1fr_260px]">
				<div class="flex flex-col gap-4">
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
					<div class="h-56">
						<GuessChat />
					</div>
				</div>
				<div class="flex flex-col gap-3">
					<h3 class="font-extrabold">{t('game.scores')}</h3>
					<Scoreboard players={room.players} playerId={game.playerId} showSolved={true} />
				</div>
			</div>
		{:else}
			<p class="text-center font-bold text-ink/60">{t('game.waitingNextRound')}</p>
		{/if}

		<!-- Lobby -->
	{:else}
		<div class="flex flex-col gap-6">
			<Card class="flex flex-col items-center gap-2 p-6">
				<span class="text-sm font-bold tracking-wide text-ink/60 uppercase">
					{t('room.codeLabel')}
				</span>
				<button
					class="rounded-base border-2 border-border bg-main px-6 py-2 text-4xl font-extrabold tracking-[0.3em] shadow-shadow transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
					onclick={copyCode}
					title="Copy code"
				>
					{code}
				</button>
				<span class="h-4 text-sm font-bold text-main-accent">{copied ? t('room.copied') : ''}</span>
			</Card>

			<!-- Host settings -->
			{#if isHost}
				<Card class="flex flex-col gap-4 p-6">
					<div>
						<h3 class="mb-2 font-extrabold">{t('settings.category')}</h3>
						<div class="flex flex-wrap gap-2">
							{#each ALL_CATEGORIES as catId (catId)}
								<button
									class="rounded-base border-2 border-border px-3 py-1.5 text-sm font-bold transition-all disabled:opacity-40 {room.categoryId ===
									catId
										? 'bg-main shadow-shadow'
										: 'bg-surface hover:bg-bg'}"
									disabled={!PLAYABLE.includes(catId)}
									onclick={() => game.setSettings({ categoryId: catId })}
								>
									{t(`category.${catId}` as 'category.0')}
								</button>
							{/each}
						</div>
					</div>
					<div class="flex items-center gap-3">
						<h3 class="font-extrabold">{t('settings.rounds')}</h3>
						<div class="flex items-center gap-2">
							<Button
								size="icon"
								variant="neutral"
								onclick={() => game.setSettings({ maxRounds: Math.max(1, room.maxRounds - 1) })}
							>
								−
							</Button>
							<span class="w-6 text-center text-lg font-extrabold tabular-nums">
								{room.maxRounds}
							</span>
							<Button
								size="icon"
								variant="neutral"
								onclick={() => game.setSettings({ maxRounds: Math.min(15, room.maxRounds + 1) })}
							>
								+
							</Button>
						</div>
					</div>
				</Card>
			{/if}

			<!-- Players -->
			<Card class="p-6">
				<h2 class="mb-4 text-xl font-extrabold">
					{t('lobby.players')} <span class="text-ink/40">({room.players.length})</span>
				</h2>
				<ul class="flex flex-col gap-3">
					{#each room.players as p (p.id)}
						<li
							class="flex items-center gap-3 rounded-base border-2 border-border bg-bg px-3 py-2 {p.connected
								? ''
								: 'opacity-50'}"
						>
							<img
								src={avatarUrl(p.avatar)}
								alt={p.name}
								width="40"
								height="40"
								class="rounded-base border-2 border-border bg-surface"
							/>
							<span class="font-bold">{p.name}</span>
							{#if p.isHost}
								<span
									class="rounded-base border-2 border-border bg-secondary px-2 py-0.5 text-xs font-extrabold"
								>
									{t('lobby.host')}
								</span>
							{/if}
							{#if p.id === game.playerId}
								<span class="text-xs font-bold text-ink/50">{t('lobby.you')}</span>
							{/if}
						</li>
					{/each}
				</ul>
			</Card>

			<!-- Actions -->
			<div class="flex gap-3">
				<Button variant="neutral" class="flex-1" onclick={leave}>{t('lobby.leave')}</Button>
				{#if isHost}
					<Button class="flex-[2]" onclick={() => game.start()}>{t('lobby.start')}</Button>
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
{/if}
