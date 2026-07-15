<script lang="ts">
	import { onMount } from 'svelte';
	import { admin } from '$lib/admin.svelte';
	import { t } from '$lib/i18n/index.svelte';
	import type { MessageKey } from '$lib/i18n/en';
	import Button from '$lib/components/ui/Button.svelte';
	import { ChevronRight, Crown } from '@lucide/svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';

	let token = $state('');
	let announcement = $state('');
	let query = $state('');

	let confirm = $state<{ title: string; body: string; label: string; run: () => void } | null>(null);

	function ask(title: string, body: string, label: string, run: () => void) {
		confirm = { title, body, label, run };
	}
	function proceed() {
		confirm?.run();
		confirm = null;
	}

	onMount(() => {
		const saved = admin.savedToken;
		if (saved) admin.connect(saved);
	});

	const s = $derived(admin.state);
	const category = (id: number) => t(`category.${id}` as MessageKey);

	function duration(sec: number): string {
		if (sec < 60) return `${sec}s`;
		if (sec < 3600) return `${Math.floor(sec / 60)}m`;
		const h = Math.floor(sec / 3600);
		return h < 24 ? `${h}h ${Math.floor((sec % 3600) / 60)}m` : `${Math.floor(h / 24)}d ${h % 24}h`;
	}
	const ago = (ts: number) => `${duration(Math.round((Date.now() - ts) / 1000))} ago`;

	const tiles = $derived(
		s
			? [
					['Uptime', duration(s.uptimeSec)],
					['Connections', String(s.connections)],
					['Addresses', String(s.addresses)],
					['Rooms', String(s.rooms.length)],
					['Memory', `${s.rssMb} MB`],
					['Games today', String(s.totals.gamesToday)],
					['Players', String(s.totals.players)],
					['Last backup', s.lastBackupAt ? ago(s.lastBackupAt) : '—']
				]
			: []
	);

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

				{#if !admin.connected}
					<span
						class="flex items-center gap-2 rounded-base border-2 border-border bg-surface px-3 py-1 text-sm font-extrabold shadow-shadow"
					>
						<span class="h-2 w-2 animate-pulse rounded-full bg-red-500"></span>
						Reconnecting
					</span>
				{/if}
				<Button size="sm" variant="neutral" onclick={() => admin.signOut()}>Sign out</Button>
			</div>
		</header>

		{#if s}
			<div class="grid grid-cols-2 gap-3 md:grid-cols-4">
				{#each tiles as [label, value] (label)}
					<Card class="p-3">
						<div class="text-xs font-bold tracking-wide text-ink/50 uppercase">{label}</div>
						<div class="truncate text-xl font-extrabold">{value}</div>
					</Card>
				{/each}
			</div>

			<div class="grid gap-4 lg:grid-cols-2">
				<!-- actions -->
				<Card class="flex flex-col gap-3 p-4">
					<h2 class="font-extrabold">Actions</h2>

					<form class="flex gap-2" onsubmit={(e) => (e.preventDefault(), announce())}>
						<Input bind:value={announcement} placeholder="Announce to all players…" />
						<Button type="submit" variant="secondary">Send</Button>
					</form>

					<div class="flex flex-wrap gap-2">
						<Button
							size="sm"
							variant={s.maintenance ? 'default' : 'neutral'}
							onclick={() => admin.setMaintenance(!s.maintenance)}
						>
							{s.maintenance ? 'End maintenance' : 'Maintenance mode'}
						</Button>
						<Button size="sm" variant="neutral" onclick={() => admin.backup()}>Back up now</Button>
					</div>

					{#if admin.log.length}
						<div class="flex flex-col gap-1 border-t-2 border-border/20 pt-2">
							{#each admin.log as entry (entry.id)}
								<div class="flex items-center gap-1 truncate text-xs font-bold text-ink/60">
									<ChevronRight size={12} class="shrink-0" aria-hidden="true" />
									{entry.text}
								</div>
							{/each}
						</div>
					{/if}
				</Card>

				<!-- live rooms -->
				<Card class="flex flex-col gap-2 p-4">
					<h2 class="font-extrabold">Rooms ({s.rooms.length})</h2>
					{#if s.rooms.length === 0}
						<p class="text-sm font-bold text-ink/40">No rooms open.</p>
					{/if}
					{#each s.rooms as room (room.code)}
						<div class="flex flex-col gap-1.5 rounded-base border-2 border-border px-3 py-2">
							<div class="flex items-center gap-2">
								<span class="font-extrabold tracking-[0.15em]">{room.code}</span>
								<span
									class="rounded-base border-2 border-border bg-main px-1.5 py-0.5 text-[11px] font-extrabold"
								>
									{room.status === 'playing' ? `${room.round}/${room.maxRounds}` : room.status}
								</span>
								<span class="flex-1"></span>
								<span class="text-xs font-bold text-ink/40">
									{room.players.length}/{room.maxPlayers} · {duration(room.idleSec)}
								</span>
								<Button
									size="pill"
									variant="neutral"
									onclick={() =>
										ask(
											`Close room ${room.code}?`,
											`${room.players.length} player(s) will be disconnected and the game ends.`,
											'Close room',
											() => admin.closeRoom(room.code)
										)}
								>
									Close
								</Button>
							</div>

							<div class="flex flex-wrap items-center gap-1.5">
								<span class="text-[11px] font-bold text-ink/40">
									{category(room.categoryId)} · {room.difficulty}{room.solo ? ' · solo' : ''}{room.isPublic
										? ' · public'
										: ''}
								</span>
								{#each room.players as p (p.id)}
									<span
										class="flex h-6 items-center gap-1 rounded-base border-2 border-border bg-surface pr-1 pl-1.5 text-[11px] font-bold"
										class:opacity-40={!p.connected}
									>
										{#if p.isHost}
											<Crown size={11} class="text-ink/35" aria-hidden="true" />
										{/if}
										<span class="leading-none">{p.name}</span>
										<span class="leading-none text-ink/35">{p.score}</span>

										<button
											class="grid h-4 w-4 place-items-center rounded-[3px] text-red-600 hover:bg-red-500/15"
											onclick={() => admin.kick(room.code, p.id)}
											aria-label="Kick {p.name}"
										>
											<svg viewBox="0 0 10 10" class="h-2.5 w-2.5" aria-hidden="true">
												<path
													d="M1.5 1.5 L8.5 8.5 M8.5 1.5 L1.5 8.5"
													stroke="currentColor"
													stroke-width="2.2"
													stroke-linecap="round"
													fill="none"
												/>
											</svg>
										</button>
									</span>
								{/each}
							</div>
						</div>
					{/each}
				</Card>
			</div>

			<div class="grid gap-4 lg:grid-cols-2">
				<!-- recent games -->
				<Card class="flex flex-col gap-2 p-4">
					<h2 class="font-extrabold">Recent games ({s.totals.games} total)</h2>
					{#if s.recentGames.length === 0}
						<p class="text-sm font-bold text-ink/40">No games finished yet.</p>
					{:else}
						<div class="-mx-2 overflow-x-auto px-2 pb-1">
							<table class="w-full text-left text-sm">
								<thead>
									<tr class="text-[11px] font-bold tracking-wide text-ink/40 uppercase">
										<th class="py-1 pr-2 font-bold">Room</th>
										<th class="py-1 pr-2 font-bold">Category</th>
										<th class="py-1 pr-2 font-bold">Winner</th>
										<th class="py-1 pr-2 text-right font-bold">Score</th>
										<th class="py-1 text-right font-bold">Finished</th>
									</tr>
								</thead>
								<tbody class="font-bold">
									{#each s.recentGames as g, i (g.finishedAt + '-' + i)}
										<tr class="border-t-2 border-border/15">
											<td class="py-1 pr-2 tracking-widest whitespace-nowrap">{g.code}</td>
											<td class="py-1 pr-2 text-ink/60">
												{category(g.categoryId)}
												<span class="text-ink/35">
													· {g.rounds}r · {g.players}p{g.solo ? ' · solo' : ''}
												</span>
											</td>
											<td class="py-1 pr-2 whitespace-nowrap">{g.winnerName ?? '—'}</td>
											<td class="py-1 pr-2 text-right text-ink/60">{g.topScore}</td>
											<td class="py-1 text-right whitespace-nowrap text-ink/40">
												{ago(g.finishedAt)}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</Card>

				<!-- player records -->
				<Card class="flex flex-col gap-2 p-4">
					<h2 class="font-extrabold">Players ({admin.players.length})</h2>
					<form class="flex gap-2" onsubmit={(e) => (e.preventDefault(), admin.search(query))}>
						<Input
							bind:value={query}
							placeholder="Filter by name or client id…"
							oninput={() => admin.search(query)}
						/>
						<Button type="submit" variant="secondary">Find</Button>
					</form>

					{#if admin.players.length === 0}
						<p class="text-sm font-bold text-ink/40">No player records yet.</p>
					{:else}
						<div class="-mx-2 overflow-x-auto px-2 pb-1">
							<table class="w-full text-left text-sm">
								<thead>
									<tr class="text-[11px] font-bold tracking-wide text-ink/40 uppercase">
										<th class="w-full py-1 pr-3 font-bold">Name</th>
										<th class="py-1 pr-3 text-right font-bold whitespace-nowrap">Won</th>
										<th class="py-1 pr-3 text-right font-bold whitespace-nowrap">Played</th>
										<th class="py-1 pr-3 text-right font-bold whitespace-nowrap">Seen</th>
										<th class="py-1 font-bold"></th>
									</tr>
								</thead>
								<tbody class="font-bold">
									{#each admin.players as p (p.clientId)}
										<tr class="border-t-2 border-border/15">
											<td class="max-w-0 py-1.5 pr-3">
												<div class="truncate">{p.name}</div>
												<div class="truncate text-[11px] font-bold text-ink/35">{p.clientId}</div>
											</td>
											<td class="py-1.5 pr-3 text-right">{p.gamesWon}</td>
											<td class="py-1.5 pr-3 text-right text-ink/60">{p.gamesPlayed}</td>
											<td class="py-1.5 pr-3 text-right whitespace-nowrap text-ink/40">
												{ago(p.lastSeen)}
											</td>
											<td class="py-1.5 text-right">
												<Button
													size="pill"
													variant="danger"
													onclick={() =>
														ask(
															`Delete ${p.name}'s record?`,
															'Their stats and leaderboard entry are erased for good.',
															'Delete record',
															() => admin.deletePlayer(p.clientId)
														)}
												>
													Delete
												</Button>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</Card>
			</div>
		{:else}
			<p class="font-bold text-ink/50">Loading…</p>
		{/if}
	</div>

	<Dialog open={!!confirm} onclose={() => (confirm = null)}>
		{#if confirm}
			<h2 class="text-lg font-extrabold">{confirm.title}</h2>
			<p class="mt-2 text-sm font-bold text-ink/60">{confirm.body}</p>
			<div class="mt-5 flex justify-end gap-2">
				<Button size="sm" variant="neutral" onclick={() => (confirm = null)}>Cancel</Button>
				<Button size="sm" variant="danger" onclick={proceed}>{confirm.label}</Button>
			</div>
		{/if}
	</Dialog>
{/if}
