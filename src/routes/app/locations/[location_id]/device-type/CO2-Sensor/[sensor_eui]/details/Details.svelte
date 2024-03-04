<script lang="ts">
	import { subSeconds } from 'date-fns';
	import CWStatCard from '$lib/components/stat-card/CWStatCard.svelte';
	import LineChart from '$lib/components/charts/highcharts/lineChart/LineChart.svelte';
	import { Card, Duration, Header } from 'svelte-ux';
	import { sensorDataState } from '$lib/stores/CW-SS-TMEPNPK';
	import {
		mdiBeaker,
		mdiGauge,
		mdiMoleculeCo2,
		mdiShaker,
		mdiThermometer,
		mdiWater
	} from '@mdi/js';

	export let sensor;

	let latestData = sensor.sensor.data.at(-1);
</script>

<div class="grid grid-cols-{latestData.pressure !== null ? 4 : 3} mt-10 gap-4 mb-2">
	<CWStatCard
		icon={mdiMoleculeCo2}
		title="CO²"
		value={latestData.co2_level}
		optimal={24.33}
		notation=" PPM"
		counterStartTime={subSeconds(sensor.sensor.data?.at(0).created_at, 0)}
	/>
	<CWStatCard
		icon={mdiThermometer}
		title="Temperature"
		value={latestData.temperature}
		optimal={24.33}
		notation="°c"
		counterStartTime={subSeconds(sensor.sensor.data?.at(0).created_at, 0)}
	/>
	<CWStatCard
		icon={mdiWater}
		title="Humidity"
		value={latestData.humidity}
		optimal={25}
		notation="%"
		counterStartTime={subSeconds(sensor.sensor.data?.at(0).created_at, 0)}
	/>
	{#if latestData.pressure !== null}
		<CWStatCard
			icon={mdiGauge}
			title="Pressure"
			value={latestData.pressure}
			optimal={25}
			notation="hPa"
			counterStartTime={subSeconds(sensor.sensor.data?.at(0).created_at, 0)}
		/>
	{/if}
</div>
