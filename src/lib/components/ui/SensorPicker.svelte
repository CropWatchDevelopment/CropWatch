<script lang="ts">
	import Sensor1 from "./sensors/Sensor1.svelte";
    export let sensorName = "NS"
    export let data
</script>
<div class="relative">
    {#if sensorName == "Type 1"}
    <Sensor1 {data}/>
    {:else if sensorName == "Type 2"}
    <p>Displaying sensor 2</p>
    {:else}
    <p>No sensor was specified</p>
    {/if}
</div>