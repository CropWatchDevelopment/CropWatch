<script lang="ts">
	import { subSeconds } from 'date-fns';
	import RadarChart from '$lib/components/charts/highcharts/highcharts-radarchart/RadarChart.svelte';
	import CWStatCard from '$lib/components/stat-card/CWStatCard.svelte';
	import LineChart from '$lib/components/charts/highcharts/lineChart/LineChart.svelte';
	import { Card, Duration, Header } from 'svelte-ux';
	import { sensorDataState } from '$lib/stores/CW-SS-TMEPNPK';
	import { mdiBeaker, mdiShaker, mdiThermometer, mdiWater } from '@mdi/js';

	$: console.log('sensor data', $sensorDataState.map(vals => [new Date(vals.created_at), vals.soil_moisture]));
	$: latest = $sensorDataState.at(0);
	$: latestCollected_Time = latest?.created_at;
</script>

<div class="grid grid-cols-2 mt-10 gap-4 mb-2">
	<CWStatCard icon={mdiThermometer} title="Temperature" value={$sensorDataState.at(0)?.soil_temperatureC} optimal={24.33} notation="°c" counterStartTime={latestCollected_Time} />
	<CWStatCard icon={mdiWater} title="Moisture" value={$sensorDataState.at(0)?.soil_moisture} optimal={25} notation="%" counterStartTime={latestCollected_Time} />
</div>

<div class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
	<Card>
		<Header title={'Soil Temperature'} slot="header" class="gap-0">
			<div slot="subheading">
				Last Update <Duration start={subSeconds(latestCollected_Time, 0)} totalUnits={1} /> ago
			</div>
		</Header>
		<LineChart seriesData={$sensorDataState.map(vals => { return {x: Math.floor(new Date(vals.created_at).getTime()/1000.0), y: vals.soil_temperatureC}})} />
	</Card>
	<Card>
		<Header title={'Soil Moisture'} slot="header" class="gap-0">
			<div slot="subheading">
				Last Update <Duration start={subSeconds(latestCollected_Time, 0)} totalUnits={1} /> ago
			</div>
		</Header>
		<div class="flex flex-row">
			<LineChart seriesData={$sensorDataState.map(vals => { return {x: Math.floor(new Date(vals.created_at).getTime()/1000.0), y: vals.soil_moisture}})}  />
		</div>
	</Card>
</div>

<div class="grid grid-cols-1 md:grid-cols-3 mt-2 gap-4 mb-2">
	<CWStatCard title="Soil N" value={$sensorDataState.at(0)?.soil_N} optimal={25} notation="mg/kg" counterStartTime={latestCollected_Time} />
	<CWStatCard title="Soil P" value={$sensorDataState.at(0)?.soil_P} optimal={25} notation="mg/kg" counterStartTime={latestCollected_Time} />
	<CWStatCard title="Soil K" value={$sensorDataState.at(0)?.soil_K} optimal={25} notation="mg/kg" counterStartTime={latestCollected_Time} />
</div>

<div class="grid grid-cols-2 mt-2 gap-4 mb-2">
	<CWStatCard icon={mdiBeaker} title="Soil pH" value={$sensorDataState.at(0)?.soil_PH} optimal={5.6} notation="pH" counterStartTime={latestCollected_Time} />
	<CWStatCard icon={mdiShaker} title="Soil EC" value={$sensorDataState.at(0)?.soil_EC} optimal={1300} notation="µs/cm" counterStartTime={latestCollected_Time} />
</div>

<Card>
	<Header title={'Soil Temperature'} slot="header" class="gap-0">
		<div slot="subheading">
			Last Update <Duration start={subSeconds(latestCollected_Time, 0)} totalUnits={1} /> ago
		</div>
	</Header>
	<RadarChart N={$sensorDataState.at(0)?.soil_N} P={$sensorDataState.at(0)?.soil_P} K={$sensorDataState.at(0)?.soil_K} />
</Card>