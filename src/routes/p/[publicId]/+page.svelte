<script lang="ts">
	import { page } from '$app/state';
	import Card from '$lib/components/ui/Card.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Avatar from '$lib/components/ui/Avatar.svelte';
	import Loading from '$lib/components/ui/Loading.svelte';
	import ProfileView from '$lib/components/ProfileView.svelte';
	import { game } from '$lib/ws.svelte';
	import { t } from '$lib/i18n/index.svelte';
	import { ArrowLeft, Lock } from '@lucide/svelte';

	const publicId = $derived(page.params.publicId ?? '');

	$effect(() => {
		if (publicId) game.requestProfile(publicId);
	});

	const profile = $derived(game.viewedProfile);
</script>

<div class="-mx-12 flex h-full flex-col gap-4 overflow-x-hidden overflow-y-auto px-12 pb-4">
	<Button href="/" variant="neutral" class="h-10 shrink-0 self-start gap-2 px-4">
		<ArrowLeft size={18} aria-hidden="true" />
		{t('common.back')}
	</Button>

	{#if profile === undefined}
		<Card class="p-6"><Loading /></Card>
	{:else if profile === null}
		<Card class="p-6 text-center font-bold text-ink/50">{t('profile.notFound')}</Card>
	{:else if profile.isPrivate}
		<Card class="flex flex-col items-center gap-3 p-6 text-center">
			<Avatar
				style={profile.avatar}
				seed={profile.name}
				size={64}
				alt={profile.name}
				class="rounded-base border-2 border-border bg-surface shadow-shadow"
			/>
			<h1 class="text-2xl font-extrabold">{profile.name}</h1>
			<p class="flex items-center gap-1.5 font-bold text-ink/50">
				<Lock size={16} aria-hidden="true" />
				{t('profile.private')}
			</p>
		</Card>
	{:else}
		<ProfileView {profile} />
	{/if}
</div>
