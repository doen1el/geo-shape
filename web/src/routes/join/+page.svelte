<script lang="ts">
	import { createForm } from "felte";
	import { z } from "zod";
	import { validator } from "@felte/validator-zod";
	import { create_user } from "$lib/stores/user_store";
	import { get_room } from "$lib/stores/room_store";
	import { show_toast } from "$lib/stores/toast_store";
	import { _ } from "svelte-i18n";
	import Button from "$lib/components/button.svelte";
    import TextField from "$lib/components/text_field.svelte";
	import { goto } from "$app/navigation";
	import { pb } from "$lib/pocketbase";
	import { onMount } from "svelte";
    
	let loading: boolean = $state(false);
    let room_exists: boolean = $state(false);
    let roomCodeInput: any = $state(null);
    let usernameInput: any = $state(null);

    const schema = z.object({
        username: z.string().min(1, $_("required")),
        room_code: z.string()
            .length(5, $_("room-code-length-error"))
    });

    onMount(async () => {
        if (pb.authStore.record?.username){
            handleUserNameInput(undefined, pb.authStore.record?.username)
        }
    });

	const { form, errors, setFields } = createForm({
        initialValues: {
            username:  "",
            room_code: ""
        },
        extend: validator({schema}),
        onSubmit: async (values) => {
            loading = true;

            try {
                await create_user(values.username.toLowerCase());

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
        input.value = roomCode;
        roomCodeInput.setValue(roomCode);
        setFields('room_code', roomCode);
        if (schema.shape.room_code.safeParse(roomCode).success) {
            room_exists = await checkIfRoomExists(roomCode);
        } else {
            room_exists = false;
        }
    }

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
                

                    disabled={!room_exists || !usernameInput?.getValue() || loading}
                >{$_("join")}</Button>
                </div>
			</form>
		</div>
	</div>
</div>
