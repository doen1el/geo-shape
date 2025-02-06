<script lang="ts">
	import { createForm } from "felte";
	import { currentUser } from '$lib/stores/user_store';
	import { _ } from "svelte-i18n";
	import { validator } from "@felte/validator-zod";
	import { z } from "zod";
	import { show_toast } from "$lib/stores/toast_store";
	import TextField from "$lib/components/text_field.svelte";
	import Button from "$lib/components/button.svelte";
	import { checkIfMessageIsRightAnswer, message_create } from "$lib/stores/message_store";
	import { update_room } from "$lib/stores/room_store";
	import { createRoom, type Room } from "$lib/models/room";

	const { currentRoomInfo }: {currentRoomInfo : Room} = $props();
	
	let chatContainer: any;
	let messageInput: any = $state(null);
	let loading = $state(false)
	let isRightAnswer = $state(false);
	let previousRound = $state(currentRoomInfo.currentRound);

	scrollToBottom();

	// Scroll to the bottom of the chat container
	function scrollToBottom() {
		if (!chatContainer) {
			return;
		}
		chatContainer.scrollTop = chatContainer.scrollHeight;
	}

	// Scroll to the bottom of the chat container after each update
	$effect(() => {
		console.log(currentRoomInfo.currentSvgCode)
        if (currentRoomInfo) {
            scrollToBottom();
        }
		if (currentRoomInfo.currentRound !== previousRound) {
            isRightAnswer = false;
            previousRound = currentRoomInfo.currentRound;
        }
    });

	const { form, errors, data } = createForm({
        initialValues: {
            message: "",
        },
        extend: validator({
            schema: z.object({
                message: z.string(),
            }),
        }),
        onSubmit: async (values) => {
            loading = true;

            try {
				// Create Message
				if (!$currentUser) {
					throw new Error("User not found");
				}

				isRightAnswer = await checkIfMessageIsRightAnswer(currentRoomInfo, values.message, $currentUser);

				if (isRightAnswer) {
						show_toast({
							icon: "check",
							type: "success",
							text: $_("right-answer", {
						values: { answer: values.message.toUpperCase() },
						}),
					});
				} else {
					const message = await message_create($currentUser, values.message);

					const updatedRoomInfo = createRoom({
						...currentRoomInfo,
						messages: [...currentRoomInfo.messages!, message.id]
					});

					// Update room
					await update_room(updatedRoomInfo);
				}
				
				// Clear the message input field
                messageInput.clear();
                values.message = "";
                data.set(values);
            } catch (e) {
                
                show_toast({
                    icon: "close",
                    type: "error",
                    text: $_("error-sending-message"),
                });
                
            } finally {
                loading = false;
            }
        },
    });
</script>

<div class="flex-1 p-4 border-l border-black flex flex-col ">
	<h2 class=""><b>CHAT</b></h2>
	<div
		class="mb-5 border-black border-2 flex-1 overflow-y-auto rounded-md shadow-[2px_2px_0px_rgba(0,0,0,1)]"
		bind:this={chatContainer}
	>
		{#each currentRoomInfo.expand?.messages ?? [] as message (message.id)}
			{#if $currentUser && message.expand?.user.username === $currentUser.username}
				<div class="flex items-center justify-end">
					<p class="mr-2 mt-1"><b>{$_("you")}</b>: {message.text}</p>
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
            extraClasses="mt-2 ml-5"
            disabled={!messageInput?.getValue() || loading || isRightAnswer}
		>
			{$_("send")}
		</Button>
	</form>
</div>