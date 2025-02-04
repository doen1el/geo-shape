<script lang="ts">
	import { createForm } from "felte";
	import { z } from "zod";
	import { validator } from "@felte/validator-zod";
	import { get_user, user_create } from "$lib/stores/user_store";
	import { get_room } from "$lib/stores/room_store";
	import { show_toast } from "$lib/stores/toast_store";
	import { _ } from "svelte-i18n";
	import Button from "$lib/components/button.svelte";
    import TextField from "$lib/components/text_field.svelte";
	import { goto } from "$app/navigation";
	import { pb } from "$lib/pocketbase";
	import { on } from "svelte/events";
	import { onMount } from "svelte";
    
	let loading: boolean = $state(false);
    let room_exists: boolean = $state(false);
    let username_exists: boolean = $state(false);
    let roomCodeInput: any = $state(null);
    let usernameInput: any = $state(null);

    const schema = z.object({
        username: z.string().min(1, $_("required")),
        room_code: z.string()
            .length(5, $_("room-code-length-error"))
    });

    onMount(async () => {
        if (pb.authStore.record?.username){
            usernameInput?.setValue(pb.authStore.record?.username)
            username_exists = await checkIfUserNameExists(pb.authStore.record?.username);
        }
    });

	const { form, errors } = createForm({
        initialValues: {
            username:  "",
            room_code: ""
        },
        extend: validator({schema}),
        onSubmit: async (values) => {
            loading = true;

            try {
                await user_create(values.username.toLowerCase());

                const sanitizedRoomCode = values.room_code.toUpperCase();
                goto(`/game/${sanitizedRoomCode}`);
            } catch (e) {
                show_toast({
                        icon: "close",
                        type: "error",
                        text: $_("error-during-join"),
                    });
            } finally {
                loading = false;
            }
        },
    });

    async function handleRoomCodeInput(event: Event) {
        const input = event.target as HTMLInputElement;
        let roomCode = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        console.log(roomCode)
        input.value = roomCode;
        roomCodeInput.setValue(roomCode);
        if (schema.shape.room_code.safeParse(roomCode).success) {
            room_exists = await checkIfRoomExists(roomCode);
        } else {
            room_exists = false;
        }
    }

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

    async function checkIfRoomExists(roomCode: string): Promise<boolean> {
        const room = await get_room(roomCode);
        if (Object.keys(room).length === 0) {
            show_toast({
                icon: "close",
                type: "error",
                text: $_("room-not-found", {
                values: { roomCode: roomCode },
            }),
            });
            return false;
        }  
        return true;
    }
</script>

<div class="center">
	<div
		class="box-small w-80"
	>
		<div class="box-padding-medium">
			<h1 class="text-[32px] mb-4 text-center">{$_("join")}</h1>
			<form use:form>
				<TextField 
					name="username"
					label={$_("username")}
					error={$errors.username}
					placeholder="FOO BAR"
                    oninput={handleUserNameInput}
                    bind:this={usernameInput}
				/>
				<TextField 
					name="room_code"
					label={$_("room_code")}
					placeholder="ABCDE"
                    error={$errors.room_code}
					oninput={handleRoomCodeInput}
                    bind:this={roomCodeInput}
				/>

                <div class="flex space-x-11 w-full">
                    <Button 
                        primary={true}
                        onclick={() => goto("/")}
                    >{$_("back")}</Button>

                    <Button 
                    primary={true}
                    type="submit"
                

                    disabled={!room_exists || username_exists || !usernameInput?.getValue() || loading}
                >{$_("join")}</Button>
                </div>
			</form>
		</div>
	</div>
</div>
