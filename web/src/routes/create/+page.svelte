<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from "svelte-i18n";
	import Button from '$lib/components/button.svelte';
	import TextField from '$lib/components/text_field.svelte';
	import { z } from "zod";
	import { createForm } from "felte";
	import { validator } from "@felte/validator-zod";
	import { room_create } from '$lib/stores/room_store';
	import { get_user, user_create } from '$lib/stores/user_store';
	import { show_toast } from '$lib/stores/toast_store';
	import { goto } from '$app/navigation';
	import { pb } from '$lib/pocketbase';
	import { generateUniqueRoomCode } from '$lib/util/room_util';


	let loading: boolean = $state(false);
	let roomCode: string = $state("");
	let username_exists: boolean = $state(false);
    let usernameInput: any = $state(null);

	onMount(async () => {
        if (pb.authStore.record?.username){
            usernameInput?.setValue(pb.authStore.record?.username)
            username_exists = await checkIfUserNameExists(pb.authStore.record?.username);
        }
		roomCode = await generateUniqueRoomCode();
	});

	const { form, errors } = createForm({
        initialValues: {
            username: "",
        },
        extend: validator({
            schema: z.object({
                username: z.string().min(1, $_("required")),
            }),
        }),
        onSubmit: async (values) => {
            loading = true;

            try {
				// Create user
				await user_create(values.username.toLowerCase(), true);

                // Create room
                await room_create(roomCode);
               
                goto(`/game/${roomCode}`);
            } catch (e) {
                show_toast({
                        icon: "close",
                        type: "error",
                        text: $_("error-during-create"),
                    });
            } finally {
                loading = false;
            }
        },
    });

	async function handleUserNameInput(event: Event) {
        const input = event.target as HTMLInputElement;
        let username = input.value.replace(/[^A-Za-z0-9]/g, '');
        input.value = username;
        usernameInput.setValue(username);
        username_exists = await checkIfUserNameExists(username);
    }

    async function checkIfUserNameExists(username: string): Promise<boolean> {
        const user = await get_user(username.toLowerCase());
        if (Object.keys(user).length != 0) {
            show_toast({
                icon: "close",
                type: "error",
                text: $_("username-already-exists", {
                    values: { username: username.toUpperCase() },
                }),
            });
            return true;
        }
        return false;
    }
</script>

<div class="center">
	<div
		class="box-small"
	>
		<div class="box-padding-medium">
			<h1 class="text-[32px] mb-4 text-center">{$_("create")}</h1>
			<form use:form>
				<TextField
				name="username"
				label={$_("username")}
				error={$errors.username}
				placeholder="FOO BAR"
				oninput={handleUserNameInput}
				bind:this={usernameInput}
				/>
				<h3 class="mb-2">{$_("room-code")}: 
                    {#if roomCode}
                    <b>{roomCode}</b>
                    {:else}
                    <i>{$_("loading")}...</i>
                    
                    {/if}
                </h3>
				<div class="flex space-x-11 w-full">
                    <Button 
                        primary={true}
                        onclick={() => goto("/")}
                    >{$_("back")}</Button>

                    <Button 
                    primary={true}
                    type="submit"
                

                    disabled={username_exists || !usernameInput?.getValue() || loading}
                >{$_("create")}</Button>
			</form>
		</div>
	</div>
</div>
