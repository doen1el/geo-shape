<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Button from '$lib/components/button.svelte';
	import TextField from '$lib/components/text_field.svelte';
	import { join_room } from '$lib/stores/room_store';
	import { show_toast } from '$lib/stores/toast_store';
	import { user_create } from '$lib/stores/user_store';
	import { APIError } from '$lib/util/api_util';
	import { validator } from '@felte/validator-zod';
	import { createForm } from 'felte';
	import { _ } from 'svelte-i18n';
	import { z } from 'zod';

	const {joinNewUser} = $props();
	let loading = $state(false);


	const { form, errors, data } = createForm({
        initialValues: {
            username: "",
        },
        extend: validator({
            schema: z.object({
                username: z.string().min(1, "required"),
            }),
        }),
        onSubmit: async (values) => {
            loading = true;

            try {
				// Create user
				const user = await user_create(values.username, false);

				joinNewUser();
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

<div class="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-50">
	<div
		class="w-80 px-8 py-4 bg-white border-2 p-2.5 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] grid place-content-center rounded-md"
	>
		<div>
			<h1 class="text-2xl mb-4 ml-2">ENTER YOUR NAME TO JOIN THE ROOM</h1>
			<div class="flex space-x-2 mx-auto">
				<form use:form>
					<TextField
						name="username"
						label={$_("username")}
						error={$errors.username}
						placeholder="FOO BAR"
					/>
					<div>
						<Button
						primary={true}
						onclick={() => {
							goto('/');
						}}
						>{$_("home")}
						</Button>

						<Button
						primary={true}
						type="submit"
						
						>{$_("join")}
						</Button>
					</div>
				</form>
			</div>
		</div>
	</div>
</div>
