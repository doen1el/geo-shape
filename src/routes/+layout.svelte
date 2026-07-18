<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { scale, fade } from 'svelte/transition';
	import { backOut } from 'svelte/easing';
	import { t } from '$lib/i18n/index.svelte';
	import { game } from '$lib/ws.svelte';
	import { profile } from '$lib/stores/profile.svelte';
	import { DEF_BY_ID } from '$lib/badges';
	import { badgeIcon } from '$lib/badgeIcons';
	import { Trophy, User, Megaphone, TriangleAlert, Check, Settings } from '@lucide/svelte';
	import SettingsMenu from '$lib/components/SettingsMenu.svelte';
	import { preloadAvatarStyle } from '$lib/components/ui/Avatar.svelte';

	let { children }: { children: Snippet } = $props();

	let settingsOpen = $state(false);

	onMount(() => {
		preloadAvatarStyle();
		if (profile.avatar) preloadAvatarStyle(profile.avatar);
	});

	const inRoom = $derived(page.url.pathname.startsWith('/room/'));
	const isSolo = $derived(
		page.url.searchParams.get('solo') === '1' || page.url.searchParams.get('daily') === '1'
	);
	const roomCode = $derived((page.params.code ?? '').toUpperCase());
	const isAdmin = $derived(page.url.pathname.startsWith('/admin'));

	let copied = $state(false);
	async function copyCode() {
		try {
			await navigator.clipboard.writeText(roomCode);
			copied = true;
			setTimeout(() => (copied = false), 1200);
		} catch {
		}
	}
</script>

{#if isAdmin}
	{@render children()}
{:else}
	{#if game.reconnecting}
		<!-- Floats just above the room's action row; the header carries the logo and room code. -->
		<div class="fixed inset-x-0 bottom-20 z-50 flex justify-center px-4" transition:fade>
			<div
				class="flex items-center gap-2 rounded-base border-2 border-border bg-surface px-4 py-2 text-sm font-extrabold shadow-shadow"
			>
				<span class="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500"></span>
				{t('error.reconnecting')}
			</div>
		</div>
	{:else if game.toast}
		<div class="fixed inset-x-0 bottom-20 z-50 flex justify-center px-4" transition:fade>
			<div
				class="flex items-center gap-2 rounded-base border-2 border-border px-4 py-2 text-center text-sm font-extrabold shadow-shadow {game
					.toast.kind === 'error'
					? 'bg-red-400'
					: 'bg-main'}"
			>
				{#if game.toast.kind === 'error'}
					<TriangleAlert size={18} class="shrink-0 text-ink" aria-hidden="true" />
				{:else}
					<Megaphone size={18} class="shrink-0 text-ink" aria-hidden="true" />
				{/if}
				{game.toast.text}
			</div>
		</div>
	{/if}

	{#if game.badgeToasts.length}
		<div
			class="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col-reverse items-center gap-2 px-4"
		>
			{#each game.badgeToasts as badge (badge.id)}
				{@const def = DEF_BY_ID.get(badge.achievement)}
				{@const Icon = badgeIcon(badge.achievement).icon}
				{#if def}
					<div
						class="flex items-center gap-3 rounded-base border-2 border-border bg-main px-4 py-2 shadow-shadow-lg"
						in:scale={{ start: 0.55, duration: 340, easing: backOut }}
						out:fade={{ duration: 150 }}
					>
						<Icon size={28} class="badge-pop text-ink" aria-hidden="true" />
						<span class="text-left">
							<span class="block text-[11px] font-bold tracking-wide uppercase">
								{t('badge.new')}
							</span>
							<span class="block text-sm font-extrabold">
								{t(`achievement.${def.id}.title` as 'achievement.blitz.title')}
							</span>
						</span>
					</div>
				{/if}
			{/each}
		</div>
	{/if}

	<div class="flex min-h-svh flex-col items-center justify-center">
		<div
			class="flex h-svh max-h-[900px] min-h-[38.75rem] w-full max-w-3xl flex-col overflow-x-visible overflow-y-clip px-4 py-4"
		>
			<header class="mb-4 flex shrink-0 items-center justify-between">
				<a href="/" class="flex items-center gap-2">
					<span
						class="flex h-11 items-center rounded-base border-2 border-border bg-main px-3 text-2xl font-extrabold shadow-shadow"
					>
						GeoShape
					</span>
				</a>

				<div class="flex items-center gap-2">
					{#if inRoom && isSolo}
						<span
							class="flex h-11 items-center rounded-base border-2 border-border bg-surface px-3 text-sm font-extrabold tracking-wide uppercase shadow-shadow"
						>
							{t('solo.badge')}
						</span>
					{:else if inRoom}
						<button
							onclick={copyCode}
							title={roomCode}
							class="flex h-11 items-center rounded-base border-2 border-border bg-surface px-3 font-extrabold tracking-[0.25em] shadow-shadow transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
						>
							<span class="mr-1 flex items-center text-ink/40">
								{#if copied}<Check size={16} aria-hidden="true" />{:else}#{/if}
							</span>{roomCode}
						</button>
					{:else}
						<a
							href="/leaderboard"
							title={t('nav.leaderboard')}
							class="flex h-11 items-center gap-1.5 rounded-base border-2 border-border bg-surface px-3 text-sm font-bold shadow-shadow transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
						>
							<Trophy size={18} aria-hidden="true" />
							<span class="hidden sm:inline">{t('nav.leaderboard')}</span>
						</a>
						<a
							href="/profile"
							title={t('nav.profile')}
							class="flex h-11 items-center gap-1.5 rounded-base border-2 border-border bg-surface px-3 text-sm font-bold shadow-shadow transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
						>
							<User size={18} aria-hidden="true" />
							<span class="hidden sm:inline">{t('nav.profile')}</span>
						</a>
					{/if}

					<button
						type="button"
						onclick={() => (settingsOpen = true)}
						title={t('settings.title')}
						aria-label={t('settings.title')}
						class="flex h-11 w-11 items-center justify-center rounded-base border-2 border-border bg-surface shadow-shadow transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
					>
						<Settings size={18} aria-hidden="true" />
					</button>
				</div>
			</header>

			<main class="relative flex min-h-0 flex-1 flex-col">
				{#key page.url.pathname}
					<div
						class="absolute inset-0 flex flex-col"
						in:scale={{ start: 0.97, opacity: 0, duration: 200, easing: backOut }}
						out:fade={{ duration: 110 }}
					>
						{@render children()}
					</div>
				{/key}
			</main>
		</div>
	</div>

	<SettingsMenu bind:open={settingsOpen} />
{/if}
