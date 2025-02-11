<script lang="ts">
    import { goto } from '$app/navigation';
    import Button from '$lib/components/button.svelte';
    import TextField from '$lib/components/text_field.svelte';
    import { show_toast } from '$lib/stores/toast_store';
    import { get_user, create_user } from '$lib/stores/user_store';
    import { APIError } from '$lib/util/api_util';
    import { validator } from '@felte/validator-zod';
    import { createForm } from 'felte';
    import { _ } from 'svelte-i18n';
    import { z } from 'zod';

    const { joinNewUser } = $props();
    let loading = $state(false);
    let usernameInput: any = $state(null);

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
                await create_user(values.username.toLowerCase(), false);

                await joinNewUser();
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

<div class="fixed inset-0 bg-gray-600 opacity-50"></div>
<div class="fixed inset-0 flex items-center justify-center">
    <div class="w-80 px-8 py-4 bg-white border-2 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] grid place-content-center rounded-md">
        <div>
            <h1 class="text-2xl mb-4 ml-2">{$_("enter-name-join-room")}</h1>
            <div class="flex space-x-2 mx-auto">
                <form use:form>
                    <TextField
                        name="username"
                        label={$_("username")}
                        error={$errors.username}
                        placeholder="FOO BAR"
                        oninput={handleUserNameInput}
                        bind:this={usernameInput}
                    />
                    <div class="flex space-x-4">
                        <Button
                        primary={true}
                        onclick={() => {
                            goto('/');
                        }}
                        extraClasses="mr-5"
                        >{$_("home")}
                        </Button>

                        <Button
                        primary={true}
                        type="submit"
                        disabled={!usernameInput?.getValue() || loading}
                        >{$_("join")}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    </div>
</div>