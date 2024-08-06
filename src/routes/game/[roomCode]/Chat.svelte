<script lang="ts">
	import { currentUser } from '$lib/pocketbase';
	import { sendMessage, type Message } from '$lib/utils.js';
	import { afterUpdate } from 'svelte';

	export let currentMessages: Array<Message>;
	export let roomId: string;

	let newMessage: string;
	let chatContainer: any;

	// Scroll to the bottom of the chat container
	function scrollToBottom() {
		chatContainer.scrollTop = chatContainer.scrollHeight;
	}

	// Scroll to the bottom of the chat container after each update
	afterUpdate(() => {
		scrollToBottom();
	});
</script>

<div class="flex-1 p-4 border-l border-black flex flex-col">
	<h2>Chat</h2>
	<div
		class="mb-10 border-black border-2 flex-1 overflow-y-auto rounded-md shadow-[2px_2px_0px_rgba(0,0,0,1)]"
		bind:this={chatContainer}
	>
		{#each currentMessages as message (message.id)}
			{#if $currentUser && message.user === $currentUser.username}
				<div class="flex items-center justify-end">
					<p class="mr-2 mt-1">You: {message.text}</p>
				</div>
			{:else}
				<div class="flex items-center justify-start">
					<p class="ml-2 mt-1">{message.user}: {message.text}</p>
				</div>
			{/if}
		{/each}
	</div>

	<form
		class="flex items-center"
		on:submit|preventDefault={async () => {
			await sendMessage(
				newMessage,
				$currentUser ? $currentUser.id : null,
				currentMessages.map((message) => message.id),
				roomId
			);
			newMessage = '';
		}}
	>
		<input
			type="text"
			class="flex-1 mr-5 w-10 border-black border-2 p-2.5 focus:outline-none shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:bg-[#FFA6F6] active:shadow-[2px_2px_0px_rgba(0,0,0,1)] rounded-md"
			bind:value={newMessage}
			placeholder="LOREM IPSUM DOLOR."
		/>
		<button
			class="h-12 border-black border-2 p-2.5 bg-[#A6FAFF] hover:bg-[#79F7FF] shadow-[2px_2px_0px_rgba(0,0,0,1)] active:bg-[#00E1EF] rounded-md"
			>SEND</button
		>
	</form>
</div>
