<script lang="ts">
	type Props = {
		value?: number;
		min?: number;
		max?: number;
		step?: number;
		disabled?: boolean;
		oncommit?: (value: number) => void;
		class?: string;
		'aria-label'?: string;
	};

	let {
		value = $bindable(0),
		min = 0,
		max = 100,
		step = 1,
		disabled = false,
		oncommit,
		class: className = '',
		'aria-label': ariaLabel
	}: Props = $props();

	const pct = $derived(max > min ? Math.round(((value - min) / (max - min)) * 100) : 0);
</script>

<input
	type="range"
	class="gs-slider {className}"
	{min}
	{max}
	{step}
	{disabled}
	aria-label={ariaLabel}
	bind:value
	onchange={() => oncommit?.(value)}
	style="--gs-pct: {pct}%"
/>
