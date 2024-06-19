<script lang="ts">
	import Back from '$lib/components/ui/Back.svelte';
	import Sensor1 from './sensors/Sensor1.svelte';
	import CW_SS_TME from './sensors/CW_SS_TME.svelte';
	import CW_SS_TMENPK from './sensors/CW_SS_TMEPNPK.svelte';
	import SeeedS2103 from './sensors/SEEED_S2103.svelte';
	import Seeed_2120 from './sensors/SEEED_2120.svelte';
	import SeeedT1000 from './sensors/SEEED_T1000.svelte';
	import NetvoxRa02A from './sensors/NETVOX_RA02A.svelte';
	import SensorHeader from './sensors/SensorHeader.svelte';
	import SensorFooterControls from './SensorFooterControls.svelte';

	export let sensorType = 'NS';
	export let sensorName = 'NS';
	export let permissions = 0;
	export let data;

	const dev_eui = data.at(0).dev_eui;
	const lastSeen = data.at(0).created_at;
</script>

<div class="relative m-1">
	<SensorHeader {sensorName} {dev_eui} {lastSeen} />
	{#if sensorType == 'cw_air_thvd'}
		<Sensor1 {data} {sensorName} {permissions} />
	{:else if sensorType == 'cw_ss_tme'}
		<CW_SS_TME {data} {sensorName} {permissions} />
	{:else if sensorType == 'cw_ss_tmepnpk'}
		<CW_SS_TMENPK {data} {sensorName} {permissions} />
	{:else if sensorType == 'seeed_co2_lorawan_uplinks' || sensorType == 'cw_co2_uplinks'}
		<SeeedS2103 {data} {sensorName} {permissions} />
	{:else if sensorType == 'seeed_sensecap_s2120'}
		<Seeed_2120 {data} {sensorName} {permissions} />
	{:else if sensorType == 'seeed_t1000'}
		<SeeedT1000 {data} {sensorName} {permissions} />
	{:else if sensorType == 'netvox_ra02a'}
		<NetvoxRa02A {data} {sensorName} {permissions} />
	{:else}
		<Back />
		<p>No sensor for type `{sensorType}` was specified</p>
	{/if}
	<SensorFooterControls {permissions} />
</div>
