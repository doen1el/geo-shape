<script lang="ts">
	import { onMount } from 'svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import ProfileView from '$lib/components/ProfileView.svelte';
	import { game } from '$lib/ws.svelte';
	import { t } from '$lib/i18n/index.svelte';
	import { MAX_PINNED } from '$lib/badges';
	import { ArrowLeft, Lock, Globe, Check } from '@lucide/svelte';

	let copied = $state(false);

	const profile = $derived(game.myProfile);
	const unlocked = $derived(profile?.achievements ?? []);
	const pinned = $derived(profile?.pinned ?? []);

	onMount(() => {
		game.requestMyProfile();
	});

	function togglePin(id: string) {
		if (!profile) return;
		const next = pinned.includes(id)
			? pinned.filter((p) => p !== id)
			: [...pinned, id].slice(-MAX_PINNED);
		game.saveProfilePrefs(profile.isPrivate, next);
	}

	function togglePrivate() {
		if (!profile) return;
		game.saveProfilePrefs(!profile.isPrivate, pinned);
	}

	async function share() {
		if (!profile) return;
		await navigator.clipboard.writeText(`${location.origin}/p/${profile.publicId}`);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}
</script>

<div class="flex h-full flex-col gap-4 overflow-y-auto pb-4">
	<Button href="/" variant="neutral" class="h-10 self-start gap-2 px-4">
		<ArrowLeft size={18} aria-hidden="true" />
		{t('common.back')}
	</Button>

	{#if profile === null}
		<Card class="p-6 text-center font-bold text-ink/50">{t('profile.needsGame')}</Card>
	{:else if profile}
		<ProfileView {profile} own />

		{#if unlocked.length > 0}
			<Card class="p-4">
				<h2 class="text-sm font-extrabold tracking-wide uppercase">{t('profile.pinned')}</h2>
				<p class="mb-3 text-xs font-bold text-ink/50">{t('profile.pinHint')}</p>
				<div class="grid grid-cols-3 gap-2 sm:grid-cols-4">
					{#each unlocked as a (a.id)}
						{@const def = profile.catalogue?.find((c) => c.id === a.id)}
						{#if def}
							<button type="button" onclick={() => togglePin(a.id)} class="cursor-pointer">
								<Badge
									id={def.id}
									tier={def.tier}
									size="sm"
									class={pinned.includes(a.id)
										? 'ring-2 ring-main-accent'
										: 'opacity-60 shadow-none'}
								/>
							</button>
						{/if}
					{/each}
				</div>
			</Card>
		{/if}

		<Card class="flex flex-col gap-3 p-4">
			<p class="text-xs font-bold text-ink/50">{t('profile.makePrivateHint')}</p>
			<div class="flex gap-2">
				<Button
					variant={profile.isPrivate ? 'neutral' : 'secondary'}
					size="sm"
					class="w-32 shrink-0 justify-center"
					onclick={togglePrivate}
				>
					{#if profile.isPrivate}
						<Lock size={16} aria-hidden="true" />
						{t('visibility.private')}
					{:else}
						<Globe size={16} aria-hidden="true" />
						{t('visibility.public')}
					{/if}
				</Button>
				<Button variant="neutral" size="sm" class="flex-1" onclick={share}>
					{#if copied}<Check size={16} aria-hidden="true" />{/if}
					{copied ? t('profile.shared') : t('profile.share')}
				</Button>
			</div>
		</Card>
	{/if}
</div>
