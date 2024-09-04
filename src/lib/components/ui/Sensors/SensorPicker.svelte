<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import Back from '$lib/components/ui/Back.svelte';
	import moment from 'moment';
	import CW_AIR_THVD from './CW_AIR_THVD/CW_AIR_THVD.svelte';
	import CW_TRAFFIC from './CW_TRAFFIC/CW_TRAFFIC.svelte';
	import SEEED_SENSECAP_S2103 from './SEEED_SENSECAP_S2103/SEEED_SENSECAP_S2103.svelte'; // CO2 Sensor
	import SEEED_SENSECAP_S2120 from './SEEED_SENSECAP_S2120/SEEED_SENSECAP_S2120.svelte'; // Weather Station
	import SEEED_SENSECAP_T1000 from './SEEED_SENSECAP_T1000/SEEED_SENSECAP_T1000.svelte'; // Tracking Badge
	import SEEED_SENSECAP_S2100_NIMBOL from './SEEED_SENSECAP_S2100_NIMBOL/SEEED_SENSECAP_S2100_NIMBOL.svelte'; // 7-in-1 Soil Sensor
	import SEEED_SENSECAP_S2103_WATER_LEVEL from './SEEED_SENSECAP_S2103_WATER_LEVEL/SEEED_SENSECAP_S2103_WATER_LEVEL.svelte'; // Tracking Badge
	import NetvoxRa02A from './NETVOX_RA02A/NETVOX_RA02A.svelte';

	let sensorName = 'NS';
	let devEui = $page.params.dev_eui;
	let lastSeen = new Date();
	let upload_interval = 0;
	let data_table: string;
	let today: Date = new Date();
	let yesterday: Date = moment(today).subtract(1, 'day').toDate();

	const sensorPromise = browser
		? fetch(`/api/v1/devices/${devEui}/data?firstDataDate=${yesterday}&lastDataDate=${today}`)
				.then((res) => res.json())
				.then((sensor) => {
					let newestData = sensor.data.at(0);
					lastSeen = new Date(newestData.created_at);
					sensorName = sensor.device.name;
					data_table = sensor.deviceType.data_table;
					upload_interval = sensor.deviceType.default_upload_interval;
					return sensor;
				})
		: null;
</script>

{#if sensorPromise !== null}
	{#await sensorPromise}
		loading
	{:then sensor}
		<div class="relative m-1">
			{#if sensor.deviceType.data_table == 'cw_air_thvd'}
				<CW_AIR_THVD {sensor} />
			{:else if sensor.deviceType.data_table == 'seeed_co2_lorawan_uplinks' || sensor.deviceType.data_table == 'cw_co2_uplinks' || sensor.deviceType.data_table == 'cw_air_thvd'}
				<SEEED_SENSECAP_S2103 {sensor} />
			{:else if sensor.deviceType.data_table == 'seeed_sensecap_s2120'}
				<SEEED_SENSECAP_S2120 {sensor} />
			{:else if sensor.deviceType.data_table == 'netvox_ra02a'}
				<NetvoxRa02A {sensor} />
			{:else if sensor.deviceType.data_table == 'seeed_t1000'}
				<SEEED_SENSECAP_T1000 {sensor} />
			{:else if sensor.deviceType.data_table == 'seeed_sensecap_s2103_WaterLevel'}
				<SEEED_SENSECAP_S2103_WATER_LEVEL {sensor} />
			{:else if sensor.deviceType.data_table == 'seeed_sensecap_s2100_nimbol'}
				<SEEED_SENSECAP_S2100_NIMBOL {sensor} />
			{:else if sensor.deviceType.data_table == 'cw_traffic2'}
				<CW_TRAFFIC {sensor} />
			{:else}
				<Back />
				<p>No sensor for type `{sensor.deviceType.data_table}` was specified</p>
			{/if}
		</div>
	{:catch error}
		<p>{error.message}</p>
	{/await}
{/if}