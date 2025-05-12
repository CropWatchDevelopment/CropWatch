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

<div class="dashboard-card ">
    <div class="card-header ">
        <div class="pattern-bg">
            <div class="status-indicator {allActive ? 'status-success' : activeDevices.length > 0 && !allInactive ? 'status-warning' : 'status-danger'}">
                {#if allActive}
                    <Icon class="status-icon" path={mdiCheck} />
                {:else if activeDevices.length > 0 && !allInactive}
                    <Icon class="status-icon" path={mdiAlert} />
                {:else}
                    <Icon class="status-icon" path={mdiClose} />
                {/if}
            </div>
        </div>
        <h2 class="location-title py-3 px-1 mb-1">
            <span>{location.name}</span>
          <button 
    class="details-button"
    onclick={() => goto(href)}
    aria-label="View details"
>
    <svg viewBox="0 0 24 24" class="icon">
        <path fill="currentColor" d="M4,11V13H16L10.5,18.5L11.92,19.92L19.84,12L11.92,4.08L10.5,5.5L16,11H4Z" />
    </svg>
</button>
        </h2>
    </div>

    <div class="py-3 px-2">
        <div class="device-list">
            {#if content}
                {@render content()}
            {/if}
        </div>
    </div>
</div>

<style>
    .dashboard-card {
        background-color: var(--color-card);
        border-radius: 0.5rem;
        overflow: hidden;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        height: 100%;
        width: 100%; /* Ensure card takes full width of its container */
        display: flex;
        flex-direction: column;
    }

    .card-header {
        position: relative;
    }

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

    .status-indicator {
        position: absolute;
        top: 0.75rem;
        left: 0.75rem;
        height: 2.5rem;
        width: 2.5rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .status-success {
        background-color: var(--color-success);
    }

    .status-warning {
        background-color: var(--color-warning);
    }

    .status-danger {
        background-color: var(--color-danger);
    }

    .status-icon {
        color: white;
        font-size: 1.5rem;
    }

    .location-title {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 1.25rem;
        font-weight: 500;
    }

.details-button {
    background-color: var(--color-primary);
    color: white;
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 50%;
    border: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    margin-left: 0.5rem; /* Add spacing from text */
    flex-shrink: 0;
    cursor: pointer;
    transition: background-color 0.2s ease-in-out;
}

.details-button:hover {
    background-color: var(--color-primary-hover, #005bbb);
}

.details-button .icon {
    width: 1.25rem;
    height: 1.25rem;
    pointer-events: none;
}


    .device-list {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        width: 100%; /* Ensure the device list takes full width of the card */
        align-items: flex-start; /* Left align items */
    }
</style>
