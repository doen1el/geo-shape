<script lang="ts"> 
	import { goto } from '$app/navigation';
	import Button from '$lib/components/button.svelte';
	import { _ } from 'svelte-i18n';
</script>

<div class="flex justify-center items-center h-screen">
	<div
		class="flex-container w-80 border-black border-2 rounded-md shadow-[8px_8px_0px_rgba(0,0,0,1)] bg-white"
	>
		<div class="flex flex-col items-center justify-center px-6 py-5 h-full">
			<h1 class="text-[32px] mb-4 text-center">404</h1>
				<Button
					primary={true}
					onclick={() => {
						goto('/');
					}}
					>{$_('home')}
				</Button>
		</div>
	</div>
</div>
