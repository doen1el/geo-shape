<script lang="ts">
	import { createForm } from "felte";
	import { currentUser } from '$lib/stores/user_store';
	import { _ } from "svelte-i18n";
	import { validator } from "@felte/validator-zod";
	import { z } from "zod";
	import { show_toast } from "$lib/stores/toast_store";
	import { APIError } from "$lib/util/api_util";
	import TextField from "$lib/components/text_field.svelte";
	import Button from "$lib/components/button.svelte";
	import { message_create } from "$lib/stores/message_store";
	import type { Message } from "$lib/models/message";
	import { currentRoom, update_room } from "$lib/stores/room_store";


	const { currentRoomInfo } = $props();
	
	let chatContainer: any;
	let messageInput: any;
	let loading = $state(false)

	scrollToBottom();

	// Scroll to the bottom of the chat container
	function scrollToBottom() {
		if (!chatContainer) {
			return;
		}
		console.log("scrolling to bottom");
		chatContainer.scrollTop = chatContainer.scrollHeight;
	}

	// Scroll to the bottom of the chat container after each update
	$effect(() => {
        if (currentRoomInfo) {
            scrollToBottom();
        }
    });

	const { form, errors, data } = createForm({
        initialValues: {
            message: "",
        },
        extend: validator({
            schema: z.object({
                message: z.string().min(1, "required"),
            }),
        }),
        onSubmit: async (values) => {
            loading = true;

            try {
				// Create Message
				if (!$currentUser) {
					throw new Error("User not found");
				}


				const message = await message_create($currentUser, values.message);

				values.message = '';


				const updatedRoomInfo = {
                    ...currentRoomInfo,
                    messages: [...currentRoomInfo.messages, message.id]
                };

                // Update room
                const res = await update_room(updatedRoomInfo);
				
				// Clear the message input field
                messageInput.clear();
				
            } catch (e) {
                if (
                    e instanceof APIError &&
                    e.message == "Failed to authenticate."
                ) {
                    show_toast({
                        icon: "close",
                        type: "error",
                        text: $_("wrong-username-or-password"),
                    });
                } else {
                    show_toast({
                        icon: "close",
                        type: "error",
                        text: $_("error-during-login"),
                    });
                }
            } finally {
                loading = false;
            }
        },
    });
</script>

<div class="flex-1 p-4 border-l border-black flex flex-col">
	<h2>Chat</h2>
	<div
		class="mb-10 border-black border-2 flex-1 overflow-y-auto rounded-md shadow-[2px_2px_0px_rgba(0,0,0,1)]"
		bind:this={chatContainer}
	>
		{#each currentRoomInfo.expand?.messages ?? [] as message (message.id)}
			{#if $currentUser && message.expand?.user.username === $currentUser.username}
				<div class="flex items-center justify-end">
					<p class="mr-2 mt-1">{$_("you")}: {message.text}</p>
				</div>
			{:else}
				<div class="flex items-center justify-start">
					<p class="ml-2 mt-1">{message.expand?.user.username.toUpperCase()}: {message.text}</p>
				</div>
			{/if}
		{/each}
	</div>

	<form use:form class="flex items-center">
		<TextField
			name="message"
			label={$_("message")}
			error={$errors.message}
			placeholder="LOREM IPSUM DOLOR."
			bind:this={messageInput}
		/>
		<Button
			primary={true}
			type="submit"
		>
			{$_("send")}
		</Button>
	</form>
</div>

<!-- class="flex-1 mr-5 w-10 border-black border-2 p-2.5 focus:outline-none shadow-[2px_2px_0px_rgba(0,0,0,1)] focus:bg-[#FFA6F6] active:shadow-[2px_2px_0px_rgba(0,0,0,1)] rounded-md" -->
