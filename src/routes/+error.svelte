<script lang="ts">
	import { page } from '$app/state';
	import { t } from '$lib/i18n/index.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import ErrorState from '$lib/components/ui/ErrorState.svelte';
	import { MapPinOff, ServerCrash, TriangleAlert, House, RotateCw } from '@lucide/svelte';

	const status = $derived(page.status);
	const isNotFound = $derived(status === 404);
	const isServer = $derived(status >= 500);

	const icon = $derived(isNotFound ? MapPinOff : isServer ? ServerCrash : TriangleAlert);
	const title = $derived(
		isNotFound ? t('error.404.title') : isServer ? t('error.500.title') : t('error.generic.title')
	);
	const desc = $derived(
		isNotFound ? t('error.404.desc') : isServer ? t('error.500.desc') : t('error.generic.desc')
	);

	const detail = $derived(page.error?.message ?? '');
	const showDetail = $derived(detail && detail.toLowerCase() !== 'not found' ? detail : undefined);
</script>

<ErrorState {icon} {status} {title} {desc} detail={showDetail} class="flex-1">
	{#snippet actions()}
		<Button href="/" class="gap-2">
			<House size={18} aria-hidden="true" />
			{t('error.home')}
		</Button>
		{#if isServer}
			<Button variant="neutral" class="gap-2" onclick={() => location.reload()}>
				<RotateCw size={18} aria-hidden="true" />
				{t('error.retry')}
			</Button>
		{/if}
	{/snippet}
</ErrorState>
