<script lang="ts">
	import { onMount } from 'svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ProfileView from '$lib/components/ProfileView.svelte';
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
</script>

<div class="flex h-full flex-col gap-4 overflow-x-hidden overflow-y-auto pr-2 pb-4">
	<Button href="/" variant="neutral" class="h-10 shrink-0 self-start gap-2 px-4">
		<ArrowLeft size={18} aria-hidden="true" />
		{t('common.back')}
	</Button>

	{#if profile === null}
		<Card class="p-6 text-center font-bold text-ink/50">{t('profile.needsGame')}</Card>
	{:else if profile}
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

		<ProfileView {profile} own />
	{/if}
</div>
