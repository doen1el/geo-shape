<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from "svelte-i18n";
	import Button from '$lib/components/button.svelte';
	import TextField from '$lib/components/text_field.svelte';
	import { z } from "zod";
	import { createForm } from "felte";
	import { validator } from "@felte/validator-zod";
	import { create_room } from '$lib/stores/room_store';
	import { create_user } from '$lib/stores/user_store';
	import { show_toast } from '$lib/stores/toast_store';
	import { goto } from '$app/navigation';
	import { pb } from '$lib/pocketbase';
	import { generateUniqueRoomCode } from '$lib/util/room_util';


	let loading: boolean = $state(false);
	let roomCode: string = $state("");
    let usernameInput: any = $state(null);

	onMount(async () => {
        if (pb.authStore.record?.username){
            handleUserNameInput(undefined, pb.authStore.record?.username)
        }
		roomCode = await generateUniqueRoomCode();
	});

	const { form, errors, setFields } = createForm({
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
			    await create_user(values.username.toLowerCase(), true);

                await create_room(roomCode);
               
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

	async function handleUserNameInput(event?: Event, username?: string) {
        let name;
        if (event) {
            const input = event.target as HTMLInputElement;
            name = input.value.replace(/[^A-Za-z0-9]/g, '');
            input.value = name;
        } else {
            name = username;
        }

        usernameInput?.setValue(name?.toUpperCase());
        setFields('username', name?.toLocaleUpperCase() || '');
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
                

                    disabled={!usernameInput?.getValue() || loading}
                >{$_("create")}</Button>
			</form>
		</div>
	</div>
</div>
