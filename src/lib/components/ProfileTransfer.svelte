<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import Input from '$lib/components/ui/Input.svelte';
	import { game } from '$lib/ws.svelte';
	import { profile } from '$lib/stores/profile.svelte';
	import { t } from '$lib/i18n/index.svelte';
	import { cn } from '$lib/utils';
	import { Check, KeyRound, TriangleAlert } from '@lucide/svelte';

	let { class: className = '' }: { class?: string } = $props();

	const CODE_LENGTH = 10;

	let codeOpen = $state(false);
	let enterOpen = $state(false);
	let typed = $state('');
	let busy = $state(false);
	let errorMsg = $state('');
	let rejected = $state(false);
	let copied = $state(false);
	let done = $state('');
	let now = $state(Date.now());

	const hasProfile = $derived(!!profile.clientId);

	const codeComplete = $derived(typed.length === CODE_LENGTH);

	$effect(() => {
		const clean = typed
			.toUpperCase()
			.replace(/[^A-Z0-9]/g, '')
			.slice(0, CODE_LENGTH);
		if (clean !== typed) typed = clean;
	});

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
		done = '';
		errorMsg = '';
		rejected = false;
		enterOpen = true;
	}

	function closeEnter() {
		enterOpen = false;
	}

	function clearError() {
		errorMsg = '';
		rejected = false;
	}

	async function submit() {
		if (busy || !codeComplete) return;
		busy = true;
		clearError();
		try {
			const name = await game.redeemTransfer(typed);
			done = name ? t('transfer.done', { name }) : t('transfer.doneNoName');
		} catch {
			errorMsg =
				game.errorCode === 'bad_code' ? t('transfer.badCode') : (game.error ?? t('error.connect'));
			rejected = true;
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

<Dialog open={enterOpen} onclose={closeEnter}>
	{#if done}
		<div class="flex flex-col gap-4">
			<h2 class="flex items-center gap-2 text-xl font-extrabold">
				<span
					class="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-border bg-main-accent"
				>
					<Check size={16} class="text-ink" aria-hidden="true" />
				</span>
				{t('transfer.doneTitle')}
			</h2>
			<p
				class="rounded-base border-2 border-border bg-main p-3 text-sm font-bold shadow-shadow"
				role="status"
			>
				{done}
			</p>
			<p class="text-xs font-bold text-ink/50">{t('transfer.doneHint')}</p>
			<Button size="sm" class="w-full" onclick={closeEnter}>{t('common.close')}</Button>
		</div>
	{:else}
		<form
			class="flex flex-col gap-4"
			onsubmit={(e) => {
				e.preventDefault();
				submit();
			}}
		>
			<h2 class="text-xl font-extrabold">{t('transfer.enterTitle')}</h2>
			<p class="text-xs font-bold text-ink/50">{t('transfer.enterHint')}</p>

			<div class="flex flex-col gap-1.5">
				<Input
					bind:value={typed}
					placeholder="XXXXXXXXXX"
					maxlength={24}
					autocapitalize="characters"
					autocomplete="off"
					spellcheck={false}
					aria-invalid={rejected || undefined}
					class="text-center font-mono text-lg tracking-[0.15em] uppercase {rejected
						? 'input-invalid'
						: codeComplete
							? 'input-valid'
							: ''}"
					oninput={clearError}
				/>
			</div>

			{#if hasProfile}
				<p class="rounded-base border-2 border-border bg-danger/20 p-2 text-xs font-bold">
					{t('transfer.replaceWarning')}
				</p>
			{/if}

			{#if errorMsg}
				<p
					class="flex items-start gap-2 rounded-base border-2 border-danger bg-danger/15 p-2.5 text-xs font-bold text-ink"
					role="alert"
				>
					<TriangleAlert size={14} class="mt-px shrink-0 text-ink" aria-hidden="true" />
					<span>{errorMsg}</span>
				</p>
			{/if}

			<div class="flex gap-2">
				<Button type="button" variant="neutral" size="sm" class="flex-1" onclick={closeEnter}>
					{t('common.cancel')}
				</Button>
				<Button type="submit" size="sm" class="flex-1" disabled={busy || !codeComplete}>
					{busy ? t('transfer.working') : t('transfer.submit')}
				</Button>
			</div>
		</form>
	{/if}
</Dialog>
