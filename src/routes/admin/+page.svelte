<script lang="ts">
	import { onMount } from 'svelte';
	import { admin } from '$lib/admin.svelte';
	import { t } from '$lib/i18n/index.svelte';
	import type { MessageKey } from '$lib/i18n/en';
	import Button from '$lib/components/ui/Button.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Card from '$lib/components/ui/Card.svelte';

	const category = (id: number) => t(`category.${id}` as MessageKey);

	let token = $state('');
	let announcement = $state('');
	let query = $state('');

	onMount(() => {
		const saved = admin.savedToken;
		if (saved) admin.connect(saved);
	});

	const s = $derived(admin.state);

	function duration(sec: number): string {
		if (sec < 60) return `${sec}s`;
		if (sec < 3600) return `${Math.floor(sec / 60)}m`;
		const h = Math.floor(sec / 3600);
		return h < 24 ? `${h}h ${Math.floor((sec % 3600) / 60)}m` : `${Math.floor(h / 24)}d ${h % 24}h`;
	}

	const ago = (ts: number) => duration(Math.round((Date.now() - ts) / 1000)) + ' ago';

	function announce() {
		const text = announcement.trim();
		if (!text) return;
		admin.announce(text);
		announcement = '';
	}
</script>

<svelte:head>
	<title>GeoShape — Admin</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

{#if !admin.authed}
	<div class="flex min-h-svh items-center justify-center p-4">
		<Card class="flex w-full max-w-sm flex-col gap-4 p-6">
			<h1 class="text-2xl font-extrabold">Admin</h1>
			<form class="flex flex-col gap-3" onsubmit={(e) => (e.preventDefault(), admin.connect(token))}>
				<Input bind:value={token} type="password" placeholder="Admin token" autocomplete="off" />
				<Button type="submit" class="w-full">Sign in</Button>
			</form>
			{#if admin.error}
				<p class="text-sm font-bold text-red-600">{admin.error}</p>
			{/if}
		</Card>
	</div>
{:else}
	<div class="mx-auto flex min-h-svh max-w-6xl flex-col gap-4 p-4">
		<header class="flex flex-wrap items-center justify-between gap-3">
			<h1 class="text-2xl font-extrabold">GeoShape — Admin</h1>
			<div class="flex items-center gap-2">
				{#if s?.maintenance}
					<span
						class="rounded-base border-2 border-border bg-red-400 px-3 py-1 text-sm font-extrabold"
					>
						MAINTENANCE
					</span>
				{/if}
				<span class="text-sm font-bold text-ink/50">
					{admin.connected ? 'live' : 'reconnecting…'}
				</span>
				<Button size="sm" variant="neutral" onclick={() => admin.signOut()}>Sign out</Button>
			</div>
		</header>

		{#if s}
			<!-- headline numbers -->
			<div class="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
				{#each [['Uptime', duration(s.uptimeSec)], ['Connections', String(s.connections)], ['Addresses', String(s.addresses)], ['Rooms', String(s.rooms.length)], ['Memory', `${s.rssMb} MB`], ['Games today', String(s.totals.gamesToday)], ['Players', String(s.totals.players)]] as [label, value] (label)}
					<Card class="p-3">
						<div class="text-xs font-bold tracking-wide text-ink/50 uppercase">{label}</div>
						<div class="text-xl font-extrabold">{value}</div>
					</Card>
				{/each}
			</div>

			<!-- operator actions -->
			<Card class="flex flex-col gap-3 p-4">
				<h2 class="font-extrabold">Actions</h2>
				<div class="flex flex-wrap items-center gap-2">
					<form class="flex min-w-0 flex-1 gap-2" onsubmit={(e) => (e.preventDefault(), announce())}>
						<Input bind:value={announcement} placeholder="Announce to all players…" />
						<Button type="submit" variant="secondary">Send</Button>
					</form>
					<Button
						variant={s.maintenance ? 'default' : 'neutral'}
						onclick={() => admin.setMaintenance(!s.maintenance)}
					>
						{s.maintenance ? 'End maintenance' : 'Maintenance mode'}
					</Button>
					<Button variant="neutral" onclick={() => admin.backup()}>Back up now</Button>
				</div>
				<p class="text-xs font-bold text-ink/50">
					Maintenance blocks new rooms; running games finish undisturbed. Last backup:
					{s.lastBackupAt ? ago(s.lastBackupAt) : 'not yet this run'}.
				</p>
				{#if admin.log.length}
					<div class="flex flex-col gap-1 border-t-2 border-border/20 pt-2">
						{#each admin.log as entry (entry.id)}
							<div class="text-xs font-bold text-ink/60">→ {entry.text}</div>
						{/each}
					</div>
				{/if}
			</Card>

			<!-- live rooms -->
			<Card class="flex flex-col gap-3 p-4">
				<h2 class="font-extrabold">Rooms ({s.rooms.length})</h2>
				{#if s.rooms.length === 0}
					<p class="text-sm font-bold text-ink/40">No rooms open.</p>
				{/if}
				{#each s.rooms as room (room.code)}
					<div class="flex flex-col gap-2 rounded-base border-2 border-border p-3">
						<div class="flex flex-wrap items-center gap-2">
							<span class="font-extrabold tracking-[0.2em]">{room.code}</span>
							<span class="rounded-base border-2 border-border bg-main px-2 py-0.5 text-xs font-extrabold">
								{room.status === 'playing' ? `Round ${room.round}/${room.maxRounds}` : room.status}
							</span>
							{#if room.solo}<span class="text-xs font-bold text-ink/50">solo</span>{/if}
							{#if room.isPublic}<span class="text-xs font-bold text-ink/50">public</span>{/if}
							<span class="text-xs font-bold text-ink/50">
								{category(room.categoryId)} · {room.difficulty} · {room.players.length}/{room.maxPlayers}
								· idle {duration(room.idleSec)}
							</span>
							<span class="flex-1"></span>
							<Button size="sm" variant="neutral" onclick={() => admin.closeRoom(room.code)}>
								Close
							</Button>
						</div>
						<div class="flex flex-wrap gap-2">
							{#each room.players as p (p.id)}
								<span
									class="flex items-center gap-2 rounded-base border-2 border-border bg-surface px-2 py-1 text-xs font-bold"
									class:opacity-40={!p.connected}
								>
									{p.name}
									{#if p.isHost}<span class="text-ink/40">host</span>{/if}
									<span class="text-ink/40">{p.score}</span>
									<button
										class="font-extrabold text-red-600 hover:underline"
										onclick={() => admin.kick(room.code, p.id)}
										title="Kick"
									>
										×
									</button>
								</span>
							{/each}
						</div>
					</div>
				{/each}
			</Card>

			<div class="grid gap-4 lg:grid-cols-2">
				<!-- recent games -->
				<Card class="flex flex-col gap-2 p-4">
					<h2 class="font-extrabold">Recent games ({s.totals.games} total)</h2>
					{#if s.recentGames.length === 0}
						<p class="text-sm font-bold text-ink/40">No games finished yet.</p>
					{/if}
					{#each s.recentGames as g, i (g.finishedAt + '-' + i)}
						<div class="flex items-center gap-2 text-sm font-bold">
							<span class="tracking-[0.15em]">{g.code}</span>
							<span class="text-ink/50">
								{category(g.categoryId)} · {g.rounds}r · {g.players}p{g.solo ? ' · solo' : ''}
							</span>
							<span class="flex-1"></span>
							<span>{g.winnerName ?? '—'}</span>
							<span class="text-ink/40">{g.topScore}</span>
							<span class="w-20 text-right text-xs text-ink/40">{ago(g.finishedAt)}</span>
						</div>
					{/each}
				</Card>

				<!-- player records -->
				<Card class="flex flex-col gap-2 p-4">
					<h2 class="font-extrabold">Players</h2>
					<form class="flex gap-2" onsubmit={(e) => (e.preventDefault(), admin.search(query))}>
						<Input bind:value={query} placeholder="Search name or client id…" />
						<Button type="submit" variant="secondary">Find</Button>
					</form>
					{#each admin.players as p (p.clientId)}
						<div class="flex items-center gap-2 text-sm font-bold">
							<span class="truncate">{p.name}</span>
							<span class="truncate text-xs text-ink/40">{p.clientId}</span>
							<span class="flex-1"></span>
							<span class="text-ink/50">{p.gamesWon}/{p.gamesPlayed}</span>
							<button
								class="text-xs font-extrabold text-red-600 hover:underline"
								onclick={() => admin.deletePlayer(p.clientId)}
								title="Delete this record"
							>
								delete
							</button>
						</div>
					{/each}
					<p class="text-xs font-bold text-ink/40">
						Deleting erases the stored record — used for deletion requests.
					</p>
				</Card>
			</div>
		{:else}
			<p class="font-bold text-ink/50">Loading…</p>
		{/if}
	</div>
{/if}
