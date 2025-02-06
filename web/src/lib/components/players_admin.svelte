<script lang="ts">
    import { createRoom, type Room } from '$lib/models/room';
    import { update_room, end_game, start_game } from '$lib/stores/room_store';
    import { _ } from "svelte-i18n";
	import Button from './button.svelte';
	import { goto } from '$app/navigation';

    const { currentRoomInfo, isAdmin }: {currentRoomInfo: Room, isAdmin: boolean} = $props()

    let svgCategories = [$_("german-states"), $_("european-countries"), $_("world-countries")];
    let selectedCategory: string = $state(svgCategories[0]);

    function updateRoomInfo(updates: Partial<Room>) {
        const updatedRoomInfo = createRoom({
            ...currentRoomInfo,
            ...updates,
        });

        update_room(updatedRoomInfo);
    }

    function changeRounds(amount: number) {
        const newMaxRounds = (currentRoomInfo.maxRounds ?? 0) + amount;
        if (1 <= newMaxRounds && newMaxRounds <= 100) {
            updateRoomInfo({ maxRounds: newMaxRounds });
        }
    }

    function changeTime(amount: number) {
        const newMaxTime = (currentRoomInfo.maxTime ?? 0) + amount;
        if (30 <= newMaxTime && newMaxTime <= 3000) {
            updateRoomInfo({ maxTime: newMaxTime });
        }
    }

    function updateSvgCategory(category: string) {
        selectedCategory = category;
        updateRoomInfo({ category: svgCategories.indexOf(category) });
    }

    function toggleGameState() {
        currentRoomInfo.isPlaying ? end_game(currentRoomInfo.roomCode!) : start_game(currentRoomInfo.roomCode!);
    }

</script>

<div class="flex-1 p-4 border-r border-black flex flex-col h-full">
    <h2>{$_("players-in")} <b>{currentRoomInfo.roomCode}</b>:</h2>

    <div class="overflow-y-auto flex-1">
        {#each currentRoomInfo.expand?.players ?? [] as player (player.id)}
        <div class="flex items-center mt-2">
            <img
                class="avatar"
                src={`https://api.dicebear.com/9.x/croodles/svg?seed=${player.username}&backgroundColor=ffdfbf,ffd5dc,d1d4f9,c0aede,b6e3f4&scale=110&radius=10`}
                alt="avatar"
                width="30px"
            />
            <p class="ml-2 {player.isAdmin ? 'font-bold' : ''}">
                {player.username.toUpperCase()}: {player.points} <u>{player.gamesWon > 0 ? player.gamesWon : ''}</u>
            </p>
        </div>
    {/each}
    </div>
    {#if isAdmin}
        <div class="w-full border-t-2 border-black my-2"></div>
        <div class="mb-3">
            <div class="text-left text-sm font-semibold mb-1">{$_("rounds")}</div>
            <div class="grid grid-cols-3 gap-2 items-center">
                <button
                    class="btn-admin-primary"
                    disabled={currentRoomInfo.isPlaying}
                    onclick={() => changeRounds(-1)}
                >
                    - 1
                </button>
                <div class="text-xl text-center">{currentRoomInfo.maxRounds}</div>
                <button
                    class="btn-admin-primary"
                    disabled={currentRoomInfo.isPlaying}
                    onclick={() => changeRounds(1)}
                >
                    + 1
                </button>
            </div>
        </div>

        <div class="mb-3">
            <div class="text-left text-sm font-semibold mb-1">{$_("time")}</div>
            <div class="grid grid-cols-3 gap-2 items-center">
                <button
                    class="btn-admin-primary"
                    disabled={currentRoomInfo.isPlaying}
                    onclick={() => changeTime(-30)}
                >
                    - 30
                </button>
                <div class="text-xl text-center">{currentRoomInfo.maxTime}s</div>
                <button
                    class="btn-admin-primary"
                    disabled={currentRoomInfo.isPlaying}
                    onclick={() => changeTime(30)}
                >
                    + 30
                </button>
            </div>
        </div>

        <div class="mb-3">
            <div class="text-left text-sm font-semibold mb-1">{$_("svg-category")}</div>
            <div class="grid grid-cols-1 gap-2 items-center">
                <select
                    class="input-primary w-full disabled:opacity-40"
                    bind:value={selectedCategory}
                    disabled={currentRoomInfo.isPlaying}
                    onchange={(e) => updateSvgCategory((e.target as HTMLSelectElement).value ?? '')}
                >
                    {#each svgCategories as category}
                        <option value={category}>{category}</option>
                    {/each}
                </select>
            </div>
        </div>

        <div class="flex space-x-4">
            <Button
                onclick={() => goto("/")}
                primary={true}
            >
                {$_("leave-game")}
            </Button>
            <Button
                onclick={toggleGameState}
                primary={true}
            >
                {currentRoomInfo.isPlaying ? $_("end-game") : $_("start-game")}
            </Button>
        </div>
    {:else}
        <Button
        onclick={() => goto("/")}
        primary={true}
        >
            {$_("leave-game")}
        </Button>
    {/if}
</div>