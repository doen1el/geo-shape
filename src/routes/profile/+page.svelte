<script lang="ts">
	import { onMount } from 'svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ProfileView from '$lib/components/ProfileView.svelte';
	import ProfileTransfer from '$lib/components/ProfileTransfer.svelte';
	import { game } from '$lib/ws.svelte';
	import { t } from '$lib/i18n/index.svelte';
	import { ArrowLeft, Lock, Globe, Check } from '@lucide/svelte';

	let copied = $state(false);

	const profile = $derived(game.myProfile);

	onMount(() => {
		game.requestMyProfile();
	});

	function togglePrivate() {
		if (!profile) return;
		game.saveProfilePrefs(!profile.isPrivate);
	}

	async function share() {
		if (!profile) return;
		await navigator.clipboard.writeText(`${location.origin}/p/${profile.publicId}`);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	const row = 'flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6';
</script>

<div class="-mx-12 flex h-full flex-col gap-4 overflow-x-hidden overflow-y-auto px-12 pb-4">
	<Button href="/" variant="neutral" class="h-10 shrink-0 self-start gap-2 px-4">
		<ArrowLeft size={18} aria-hidden="true" />
		{t('common.back')}
	</Button>

	{#if profile === null}
		<Card class="p-6 text-center font-bold text-ink/50">{t('profile.needsGame')}</Card>
	{/if}

	<Card class="flex flex-col">
		<h2 class="px-4 pt-4 pb-3 text-sm font-extrabold tracking-wide text-ink/50 uppercase">
			{t('account.title')}
		</h2>

		{#if profile}
			<div class="{row} border-t-2 border-border">
				<div class="min-w-0">
					<h3 class="font-extrabold">{t('settings.visibility')}</h3>
					<p class="mt-0.5 text-xs font-bold text-ink/50">{t('profile.makePrivateHint')}</p>
				</div>
				<Button
					variant={profile.isPrivate ? 'neutral' : 'secondary'}
					size="sm"
					class="shrink-0 justify-center sm:w-32"
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
			</div>

			<div class="{row} border-t-2 border-border">
				<div class="min-w-0">
					<h3 class="font-extrabold">{t('account.link')}</h3>
					<p class="mt-0.5 text-xs font-bold text-ink/50">{t('account.linkHint')}</p>
				</div>
				<Button variant="neutral" size="sm" class="shrink-0 sm:w-40" onclick={share}>
					{#if copied}<Check size={16} aria-hidden="true" />{/if}
					{copied ? t('profile.shared') : t('profile.share')}
				</Button>
			</div>
		{/if}

		<ProfileTransfer class="border-t-2 border-border" />
	</Card>

	{#if profile}
		<ProfileView {profile} own />
	{/if}
</div>
