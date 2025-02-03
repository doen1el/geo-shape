<script lang="ts">
    import { toast } from "$lib/stores/toast_store";
    import { fade } from "svelte/transition";

    function closeToast() {
        toast.set(null);
    }
</script>

{#if $toast}
    <div
        class="fixed px-4 py-3 shadow-[2px_2px_0px_rgba(0,0,0,1)] rounded-md border-2 border-black bottom-4 right-4 bg-white text-gray-500 flex items-center max-w-md hover:bg-[#79F7FF] active:bg-[#00E1EF]"
        style="z-index: 1001;"
        in:fade={{ duration: 250 }}
        out:fade={{ duration: 250 }}
    >
        <i
            class="fa fa-{$toast.icon} p-3 mr-2 rounded-lg"
            class:success-toast={$toast.type == "success"}
            class:error-toast={$toast.type == "error"}
        ></i>
        <p class="mr-4">
            {$toast.text}
        </p>
        <button
            type="button"
            class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white ml-6"
            onclick={closeToast}
        >
            <i class="fa fa-close"></i>
            <span class="sr-only">Close modal</span>
        </button>
    </div>
{/if}

<style>
    .success-toast {
        color: #10b981;
        background-color: #a7f3d0;
    }
    .error-toast {
        color: #ef4444;
        background-color: #fecaca;
    }
</style>