<script lang="ts">
    import { createRoom, type Room } from '$lib/models/room';
    import { update_room } from '$lib/stores/room_store';
    import { endGame, startGame } from '$lib/utils';
    import { _ } from "svelte-i18n";

    const { currentRoomInfo, isAdmin }: {currentRoomInfo: Room, isAdmin: boolean} = $props()

    function updateRoomInfo(updates: Partial<Room>) {
        const updatedRoomInfo = createRoom({
            ...currentRoomInfo,
            ...updates,
        });

        update_room(updatedRoomInfo);
    }

    function changeRounds(amount: number) {
        const newMaxRounds = (currentRoomInfo.maxRounds ?? 0) + amount;
        if (newMaxRounds >= 1) {
            updateRoomInfo({ maxRounds: newMaxRounds });
        }
    }

    function changeTime(amount: number) {
        const newMaxTime = (currentRoomInfo.maxTime ?? 0) + amount;
        if (newMaxTime >= 30) {
            updateRoomInfo({ maxTime: newMaxTime });
        }
    }
</script>

<div class="flex-1 p-4 border-r border-black flex flex-col h-full">
    <div class="overflow-y-auto flex-1">
        <h2>{$_("players-in")} <b>{currentRoomInfo.roomCode}</b>:</h2>
        {#each currentRoomInfo.expand?.players ?? [] as player (player.id)}
            <div style="display: flex; align-items: center; margin-top: 2px;">
                <img
                    class="avatar"
                    src={`https://api.dicebear.com/9.x/identicon/svg?seed=${player.username}`}
                    alt="avatar"
                    width="20px"
                />
                <p class="ml-2 {player.isAdmin ? 'font-bold' : ''}">
                    {player.username.toUpperCase()}: {player.points}
                </p>
            </div>
        {/each}
    </div>
    {#if isAdmin}
        <div class="w-full border-t-2 border-black my-4"></div>
        <div>{$_("admin-panel")}</div>
        <div class="flex items-center mb-6">
            <button
                class="btn-admin-primary"
                disabled={currentRoomInfo.isPlaying}
                onclick={() => changeRounds(-1)}
            >
                -
            </button>
            <div class="mx-4 text-xl">{currentRoomInfo.maxRounds}</div>
            <button
                class="btn-admin-primary"
                disabled={currentRoomInfo.isPlaying}
                onclick={() => changeRounds(1)}
            >
                +
            </button>
        </div>

        <div class="flex items-center mb-6">
            <button
                class="btn-admin-primary"
                disabled={currentRoomInfo.isPlaying}
                onclick={() => changeTime(-30)}
            >
                -
            </button>
            <div class="mx-4 text-xl">{currentRoomInfo.maxTime}</div>
            <button
                class="btn-admin-primary"
                disabled={currentRoomInfo.isPlaying}
                onclick={() => changeTime(30)}
            >
                +
            </button>
        </div>

        <button
            onclick={async () => (currentRoomInfo.isPlaying ? await endGame(currentRoomInfo.roomCode!) : await startGame(currentRoomInfo.roomCode!))}
            class="btn-primary"
        >
            {currentRoomInfo.isPlaying ? 'End Game' : 'Start Game'}
        </button>
    {/if}
</div>