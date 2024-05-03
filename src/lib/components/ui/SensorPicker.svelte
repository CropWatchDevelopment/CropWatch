<script lang="ts">
	import Back from '$lib/components/ui/Back.svelte';
import Sensor1 from "./sensors/Sensor1.svelte";
    export let sensorType = "NS";
    export let sensorName = "NS";
    export let data;
</script>
<div class="relative">
    {#if sensorType == "cw_air_thvd"}
    <Sensor1 {data} {sensorName}/>
    {:else if sensorType == "Type 2"}
    <p>Displaying sensor 2</p>
    {:else}
    <Back />
    <p>No sensor was specified</p>
    {/if}
</div>