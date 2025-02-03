<script>
	import Button from '$lib/components/button.svelte';
	import { _ } from "svelte-i18n";
</script>

<div class="center">
	<div class="box-small">
		<div class="box-padding-medium">
			<div class="flex-container">
				<a href="/join">
					<Button primary={true}>{$_("join")}</Button>
				</a>

				<p class="text-xl">{$_("or")}</p>

				<a href="/create">
					<Button primary={true}>{$_("create")}</Button>
				</a>
			</div>
		</div>
	</div>
</div>

<style>
	.flex-container {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 20px;
	}
</style>
