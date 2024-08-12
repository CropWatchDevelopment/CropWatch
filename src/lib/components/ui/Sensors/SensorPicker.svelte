<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import Back from '$lib/components/ui/Back.svelte';
	import moment from 'moment';
	import CW_AIR_THVD from './CW_AIR_THVD/CW_AIR_THVD.svelte';
	import SEEED_SENSECAP_S2103 from './SEEED_SENSECAP_S2103/SEEED_SENSECAP_S2103.svelte'; // CO2 Sensor
	import SEEED_SENSECAP_S2120 from './SEEED_SENSECAP_S2120/SEEED_SENSECAP_S2120.svelte'; // Weather Station
	import SEEED_SENSECAP_T1000 from './SEEED_SENSECAP_T1000/SEEED_SENSECAP_T1000.svelte'; // Tracking Badge
	// import CW_SS_TME from './sensors/CW_SS_TME.svelte';
	// import CW_SS_TMENPK from './sensors/CW_SS_TMEPNPK.svelte';
	// import SeeedS2103 from './sensors/SEEED_S2103.svelte';
	// import Seeed_2120 from './sensors/SEEED_2120.svelte';
	// import SeeedT1000 from './sensors/SEEED_T1000.svelte';
	// import NetvoxRa02A from './sensors/NETVOX_RA02A.svelte';
	// import SensorHeader from './sensors/SensorHeader.svelte';
	// import SensorFooterControls from './SensorFooterControls.svelte';
	// import SeeedS2103WaterLevel from './sensors/SEEED_S2103_WaterLevel.svelte';
	import SensorHeader from './SensorHeader.svelte';
	import { mdiCog } from '@mdi/js';
	import { Button, Icon, Tooltip } from 'svelte-ux';
	import { goto } from '$app/navigation';
	import NetvoxRa02A from './NETVOX_RA02A/NETVOX_RA02A.svelte';

	export let sensorType;
	let sensorName = 'NS';
	let devEui = $page.params.dev_eui;
	let lastSeen = new Date();
	let upload_interval = 0;
	let data_table: string;
	let today: Date = new Date();
	let yesterday: Date = moment(today).subtract(1, 'day').toDate();

	const sensorPromise = browser
		? fetch(`/api/v1/devices/${devEui}?firstDataDate=${yesterday}&lastDataDate=${today}`)
				.then((res) => res.json())
				.then((sensor) => {
					let newestData = sensor.data.at(0);
					lastSeen = new Date(newestData.created_at);
					sensorName = sensor.device.name;
					data_table = sensor.deviceType.data_table;
					upload_interval = sensor.deviceType.upload_interval;
					return sensor;
				})
		: null;
</script>

{#if sensorPromise !== null}
	{#await sensorPromise}
		loading
	{:then sensor}
		<div class="relative m-1">
			<div class="mx-2 flex flex-row">
				<SensorHeader {sensorName} {lastSeen} {upload_interval} />
				<span class="flex-grow" />
				<Tooltip title={`${sensorName}'s Settings`}>
					<Button icon={mdiCog} size="lg" on:click={() => goto(`settings`)} />
				</Tooltip>
			</div>
			{#if sensor.deviceType.data_table == 'cw_air_thvd'}
				<CW_AIR_THVD data />
			{:else if sensor.deviceType.data_table == 'seeed_co2_lorawan_uplinks' || sensorType == 'cw_co2_uplinks'}
				<SEEED_SENSECAP_S2103 {sensor} />
			{:else if sensor.deviceType.data_table == 'seeed_sensecap_s2120'}
				<SEEED_SENSECAP_S2120 {sensor} />
			{:else if sensor.deviceType.data_table == 'netvox_ra02a'}
				<NetvoxRa02A {sensor} />
			{:else if sensor.deviceType.data_table == 'seeed_t1000'}
				<SEEED_SENSECAP_T1000 {sensor} />
				<!-- {:else if sensorType == 'cw_ss_tme'}
		<CW_SS_TME {data} {sensorName} {permissions} />
	{:else if sensorType == 'cw_ss_tmepnpk'}
		<CW_SS_TMENPK {data} {sensorName} {permissions} />
	
	{:else if sensorType == 'seeed_t1000'}
		<SeeedT1000 {data} {sensorName} {permissions} />
	{:else if sensorType == 'seeed_sensecap_s2103_WaterLevel'}
		<SeeedS2103WaterLevel {data} {sensorName} {permissions} /> -->
			{:else}
				<Back />
				<p>No sensor for type `{sensorType}` was specified</p>
			{/if}
		</div>
	{:catch error}
		<p>{error.message}</p>
	{/await}
{/if}
