<script lang="ts">
	import Back from '$lib/components/ui/Back.svelte';
	import Sensor1 from './sensors/Sensor1.svelte';
    import CW_SS_TME from './sensors/CW_SS_TME.svelte';
    import CW_SS_TMENPK from './sensors/CW_SS_TMEPNPK.svelte';
	export let sensorType = 'NS';
	export let sensorName = 'NS';
	export let data;
</script>

<div class="relative">
	{#if sensorType == 'cw_air_thvd'}
		<Sensor1 {data} {sensorName} />
	{:else if sensorType == 'cw_ss_tme'}
		<CW_SS_TME {data} {sensorName} />
	{:else if sensorType == 'cw_ss_tmepnpk'}
		<CW_SS_TMENPK {data} {sensorName} />
	{:else}
		<Back />
		<p>No sensor was specified</p>
	{/if}
</div>
