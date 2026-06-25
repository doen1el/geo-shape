<script lang="ts">
	import '../app.css';
	import type { Snippet } from 'svelte';
	import { t } from '$lib/i18n/index.svelte';

	let { children }: { children: Snippet } = $props();
</script>

<div class="mx-auto flex h-svh w-full max-w-3xl flex-col overflow-hidden px-4 py-4">
	<header class="mb-4 flex shrink-0 items-center justify-between">
		<a href="/" class="flex items-center gap-2">
			<span
				class="rounded-base border-2 border-border bg-main px-3 py-1 text-2xl font-extrabold shadow-shadow"
			>
				GeoShape
			</span>
		</a>
		<a
			href="/leaderboard"
			class="rounded-base border-2 border-border bg-surface px-3 py-1.5 text-sm font-bold shadow-shadow transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
		>
			{t('nav.leaderboard')}
		</a>
	</header>

	<main class="flex min-h-0 flex-1 flex-col">
		{@render children()}
	</main>
</div>
