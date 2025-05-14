<script lang="ts">
    import { Icon } from 'svelte-ux';
    import { goto } from '$app/navigation';
    import { mdiAlert, mdiCheck, mdiClose } from '@mdi/js';
    import type { Location } from '$lib/models/Location';
    import type { Snippet } from 'svelte';

    let {
        location,
        href,
        content=undefined,
        activeDevices = [],
        allActive = false,
        allInactive = false
    } = $props<{
        location: Location;
        href: string;
        content?: Snippet;
        activeDevices?: any[];
        allActive?: boolean;
        allInactive?: boolean;
    }>();
</script>

<div class="bg-white dark:bg-zinc-900 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-600 shadow-md dark:shadow-gray-900/20 h-full w-full flex flex-col">
    <div class="relative">
        <div class="pattern-bg">
            <div class="status-indicator absolute top-3 left-3 h-10 w-10 rounded-full flex items-center justify-center {allActive ? 'status-success' : activeDevices.length > 0 && !allInactive ? 'status-warning' : 'status-danger'}">
                {#if allActive}
                    <Icon class="text-white text-2xl status-icon" path={mdiCheck} />
                {:else if activeDevices.length > 0 && !allInactive}
                    <Icon class="text-white text-2xl status-icon" path={mdiAlert} />
                {:else}
                    <Icon class="text-white text-2xl status-icon" path={mdiClose} />
                {/if}
            </div>
        </div>
        <h2 class="flex justify-between items-center text-xl font-semibold py-3 px-2  text-yellow-600 dark:text-yellow-400">
            <span>{location.name}</span>
          <button 
    class="bg-blue-50 dark:bg-gray-700 text-blue-700 dark:text-blue-300 w-9 h-9 rounded-full border border-blue-200 dark:border-gray-600 inline-flex items-center justify-center p-0 ml-2 flex-shrink-0 cursor-pointer transition-colors duration-200 hover:bg-blue-100 dark:hover:bg-gray-600"
    onclick={() => goto(href)}
    aria-label="View details"
>
    <svg viewBox="0 0 24 24" class="w-5 h-5 pointer-events-none">
        <path fill="currentColor" d="M4,11V13H16L10.5,18.5L11.92,19.92L19.84,12L11.92,4.08L10.5,5.5L16,11H4Z" />
    </svg>
</button>
        </h2>
    </div>

    <div class="py-2 px-2">
        <div class="flex flex-col gap-1 w-full items-start">
            {#if content}
                {@render content()}
            {/if}
        </div>
    </div>
</div>

<style>
    /* Keeping complex gradient pattern in CSS */
    .pattern-bg {
        position: relative;
        height: 5rem;
        background-color: #4e7dd6;
        background-image:
            linear-gradient(
                30deg,
                #4676c8 12%,
                transparent 12.5%,
                transparent 87%,
                #4676c8 87.5%,
                #4676c8
            ),
            linear-gradient(
                150deg,
                #4676c8 12%,
                transparent 12.5%,
                transparent 87%,
                #4676c8 87.5%,
                #4676c8
            ),
            linear-gradient(
                30deg,
                #4676c8 12%,
                transparent 12.5%,
                transparent 87%,
                #4676c8 87.5%,
                #4676c8
            ),
            linear-gradient(
                150deg,
                #4676c8 12%,
                transparent 12.5%,
                transparent 87%,
                #4676c8 87.5%,
                #4676c8
            ),
            linear-gradient(60deg, #4d86e8 25%, transparent 25.5%, transparent 75%, #4d86e8 75%, #4d86e8),
            linear-gradient(60deg, #4d86e8 25%, transparent 25.5%, transparent 75%, #4d86e8 75%, #4d86e8);
        background-size: 40px 70px;
        background-position:
            0 0,
            0 0,
            20px 35px,
            20px 35px,
            0 0,
            20px 35px;
        border-radius: 0.5rem 0.5rem 0 0;
    }

    /* Status colors */
    .status-success {
        background-color: var(--color-success);
    }

    .status-warning {
        background-color: var(--color-warning);
    }

    .status-danger {
        background-color: var(--color-danger);
    }
</style>
