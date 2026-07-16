<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { game } from '$lib/ws.svelte';
	import { profile } from '$lib/stores/profile.svelte';
	import { t } from '$lib/i18n/index.svelte';
	import { cn } from '$lib/utils';
	import { Check, KeyRound } from '@lucide/svelte';

	let { class: className = '' }: { class?: string } = $props();

	let codeOpen = $state(false);
	let enterOpen = $state(false);
	let typed = $state('');
	let busy = $state(false);
	let errorMsg = $state('');
	let copied = $state(false);
	let done = $state('');
	let now = $state(Date.now());

	const hasProfile = $derived(!!profile.clientId);

	const remainingMs = $derived(Math.max(0, (game.transferCode?.expiresAt ?? 0) - now));
	const expired = $derived(!!game.transferCode && remainingMs === 0);
	const countdown = $derived(
		`${Math.floor(remainingMs / 60000)}:${String(Math.floor(remainingMs / 1000) % 60).padStart(2, '0')}`
	);

	$effect(() => {
		if (!codeOpen) return;
		const id = setInterval(() => (now = Date.now()), 500);
		return () => clearInterval(id);
	});

	async function showCode() {
		codeOpen = true;
		now = Date.now();
		await game.createTransfer();
	}

	async function copy() {
		if (!game.transferCode) return;
		await navigator.clipboard.writeText(game.transferCode.code);
		copied = true;
		setTimeout(() => (copied = false), 2000);
	}

	function openEnter() {
		typed = '';
		errorMsg = '';
		enterOpen = true;
	}

	async function submit() {
		if (busy || typed.trim().length === 0) return;
		busy = true;
		errorMsg = '';
		try {
			const name = await game.redeemTransfer(typed);
			enterOpen = false;
			done = t('transfer.done', { name });
			setTimeout(() => (done = ''), 6000);
		} catch {
			// A refused code and a hammered one read very differently to whoever is typing.
			errorMsg = game.errorCode === 'bad_code' ? t('transfer.badCode') : (game.error ?? '');
		} finally {
			busy = false;
		}
	}
</script>

<div
	class={cn(
		'flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6',
		className
	)}
>
	<div class="min-w-0">
		<h3 class="font-extrabold">{t('transfer.title')}</h3>
		<p class="mt-0.5 text-xs font-bold text-ink/50">{t('transfer.hint')}</p>
		{#if done}
			<p class="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-ink">
				<Check size={14} aria-hidden="true" />
				{done}
			</p>
		{/if}
	</div>

	<div class="flex shrink-0 gap-2">
		{#if hasProfile}
			<Button size="sm" class="flex-1 sm:flex-none" onclick={showCode}>{t('transfer.get')}</Button>
		{/if}
		<Button variant="neutral" size="sm" class="flex-1 gap-2 sm:flex-none" onclick={openEnter}>
			<KeyRound size={16} aria-hidden="true" />
			{t('transfer.enter')}
		</Button>
	</div>
</div>

<Dialog open={codeOpen} onclose={() => (codeOpen = false)}>
	<div class="flex flex-col gap-4">
		<h2 class="text-xl font-extrabold">{t('transfer.codeTitle')}</h2>
		<p class="text-xs font-bold text-ink/50">{t('transfer.codeHint')}</p>

		{#if game.transferCode}
			<div
				class="rounded-base border-2 border-border bg-main px-3 py-5 text-center font-mono text-2xl font-extrabold tracking-[0.15em] shadow-shadow
					{expired ? 'opacity-40' : ''}"
			>
				{game.transferCode.code}
			</div>

			{#if expired}
				<p class="text-sm font-bold text-ink/60">{t('transfer.expired')}</p>
				<Button size="sm" onclick={showCode}>{t('transfer.newCode')}</Button>
			{:else}
				<div class="flex items-center justify-between gap-2">
					<span class="text-xs font-bold text-ink/50 tabular-nums">
						{t('transfer.expiresIn', { time: countdown })}
					</span>
					<Button variant="neutral" size="sm" onclick={copy}>
						{#if copied}<Check size={16} aria-hidden="true" />{/if}
						{copied ? t('transfer.copied') : t('transfer.copy')}
					</Button>
				</div>
				<p class="text-xs font-bold text-ink/50">{t('transfer.oneTime')}</p>
			{/if}
		{:else}
			<p class="text-sm font-bold text-ink/50">{t('common.connecting')}</p>
		{/if}
	</div>
</Dialog>

<Dialog open={enterOpen} onclose={() => (enterOpen = false)}>
	<form
		class="flex flex-col gap-4"
		onsubmit={(e) => {
			e.preventDefault();
			submit();
		}}
	>
		<h2 class="text-xl font-extrabold">{t('transfer.enterTitle')}</h2>
		<p class="text-xs font-bold text-ink/50">{t('transfer.enterHint')}</p>

		<Input
			bind:value={typed}
			placeholder="XXXXXXXXXX"
			maxlength={16}
			autocapitalize="characters"
			autocomplete="off"
			spellcheck={false}
			class="text-center font-mono text-lg tracking-[0.15em] uppercase"
			oninput={() => (errorMsg = '')}
		/>

		{#if hasProfile}
			<p class="rounded-base border-2 border-border bg-danger/20 p-2 text-xs font-bold">
				{t('transfer.replaceWarning')}
			</p>
		{/if}

		{#if errorMsg}
			<p class="text-sm font-bold text-danger">{errorMsg}</p>
		{/if}

		<div class="flex gap-2">
			<Button
				type="button"
				variant="neutral"
				size="sm"
				class="flex-1"
				onclick={() => (enterOpen = false)}
			>
				{t('common.cancel')}
			</Button>
			<Button type="submit" size="sm" class="flex-1" disabled={busy || !typed.trim()}>
				{busy ? t('transfer.working') : t('transfer.submit')}
			</Button>
		</div>
	</form>
</Dialog>
