<script lang="ts">
	import '../app.css';
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { scale, fade } from 'svelte/transition';
	import { backOut } from 'svelte/easing';
	import { t } from '$lib/i18n/index.svelte';
	import SettingsMenu from '$lib/components/SettingsMenu.svelte';

	let { children }: { children: Snippet } = $props();

	const inRoom = $derived(page.url.pathname.startsWith('/room/'));
	const isSolo = $derived(page.url.searchParams.get('solo') === '1');
	const roomCode = $derived((page.params.code ?? '').toUpperCase());

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

<div class="flex h-svh flex-col items-center justify-center">
	<div class="flex h-full max-h-[900px] w-full max-w-3xl flex-col overflow-hidden px-4 py-4">
		<header class="mb-4 flex shrink-0 items-center justify-between">
			<a href="/" class="flex items-center gap-2">
				<span
					class="flex h-11 items-center rounded-base border-2 border-border bg-main px-3 text-2xl font-extrabold shadow-shadow"
				>
					GeoShape
				</span>
			</a>

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
					<span class="mr-1 text-ink/40">{copied ? '✓' : '#'}</span>{roomCode}
				</button>
			{:else}
				<a
					href="/leaderboard"
					class="flex h-11 items-center rounded-base border-2 border-border bg-surface px-3 text-sm font-bold shadow-shadow transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
				>
					{t('nav.leaderboard')}
				</a>
			{/if}
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

<SettingsMenu />
