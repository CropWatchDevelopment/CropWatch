<script lang="ts">
	import type { Tables } from "$lib/types/supabaseSchema";
	import { Duration, DurationUnits } from "svelte-ux";
	import { convertObject } from "./utilities/ConvertSensorDataObject";
	import { nameToNotation } from "./utilities/NameToNotation";
	import { nameToEmoji } from "./utilities/NameToEmoji";

    export let data: Tables<'cw_devices'>;
</script>

<div class="mt-3 flex px-3">
    <h3 class="mb-2 basis-1/3 text-lg font-medium">
        <!-- {$_('dashboardCard.details')} -->
    </h3>
</div>
    {#each Object.keys(convertObject(data)) as dataPointKey, index}
        <div class="py-1">
            <div class="flex">
                <p class="text-base">{nameToEmoji(dataPointKey)}</p>
                <!-- <p class="text-right">{$_(dataPointKey)}</p> -->
                <span class="flex-grow" />
                <p class="flex flex-row align-bottom text-base">
                    {#if dataPointKey === 'created_at'}
                        <Duration
                            start={data[dataPointKey]}
                            totalUnits={2}
                            minUnits={DurationUnits.Second}
                        />
                        <!-- &nbsp {$_('ago')} -->
                    {:else}
                        {data[dataPointKey] ? data[dataPointKey].toLocaleString() : 'N/A'}
                        <small class="text-slate-800"><sup>{nameToNotation(dataPointKey)}</sup></small>
                    {/if}
                </p>
            </div>
            <!-- {#if Object.keys(convertObject(device)).length - 1 !== index}
                <div class="border-b border-[#7d7d81] px-3 pt-2"></div>
            {:else}
                <div class="px-3 pt-2"></div>
            {/if} -->
        </div>
    {/each}