<script>
	import { goto } from '$app/navigation';
</script>

<div
	class="flex-container w-80 border-black border-2 rounded-md shadow-[8px_8px_0px_rgba(0,0,0,1)] bg-white"
>
	<div class="flex flex-col items-center justify-center px-6 py-5 h-full">
		<h1 class="text-[32px] mb-4 text-center">ROOM NOT FOUND</h1>

		<button
			on:click={() => goto('/join')}
			class="h-12 border-black border-2 p-2.5 bg-[#A6FAFF] hover:bg-[#79F7FF] shadow-[2px_2px_0px_rgba(0,0,0,1)] active:bg-[#00E1EF] disabled:opacity-40 rounded-md"
		>
			JOIN
		</button>
	</div>
</div>
