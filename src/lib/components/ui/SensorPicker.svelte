<script lang="ts">
	import Back from '$lib/components/ui/Back.svelte';
	import Sensor1 from './sensors/Sensor1.svelte';
	import CW_SS_TME from './sensors/CW_SS_TME.svelte';
	import CW_SS_TMENPK from './sensors/CW_SS_TMEPNPK.svelte';
	import SeeedS2103 from './sensors/SEEED_S2103.svelte';

	export let sensorType = 'NS';
	export let sensorName = 'NS';
	export let permissions = 0;
	export let data;
</script>

<div class="relative">
	{#if sensorType == 'cw_air_thvd'}
		<Sensor1 {data} {sensorName} {permissions} />
	{:else if sensorType == 'cw_ss_tme'}
		<CW_SS_TME {data} {sensorName} {permissions} />
	{:else if sensorType == 'cw_ss_tmepnpk'}
		<CW_SS_TMENPK {data} {sensorName} {permissions} />
	{:else if sensorType == 'seeed_co2_lorawan_uplinks'}
		<SeeedS2103 {data} {sensorName} {permissions} />
	{:else}
		<Back />
		<p>No sensor was specified</p>
	{/if}
</div>
