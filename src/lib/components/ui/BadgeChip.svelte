<script lang="ts">
	import { cn } from '$lib/utils';
	import { t } from '$lib/i18n/index.svelte';
	import { badgeIcon } from '$lib/badgeIcons';

	type Props = { id: string; size?: number; class?: string };
	let { id, size = 12, class: className }: Props = $props();

	const Icon = $derived(badgeIcon(id).icon);
	const title = $derived(t(`achievement.${id}.title` as 'achievement.blitz.title'));
</script>

<span
	class={cn(
		'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-border bg-main',
		className
	)}
	title={title}
	aria-label={title}
>
	<Icon {size} class="text-ink" aria-hidden="true" />
</span>
