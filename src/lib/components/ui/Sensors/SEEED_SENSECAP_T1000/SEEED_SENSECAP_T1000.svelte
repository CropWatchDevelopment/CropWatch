<script lang="ts">
	import { _ } from 'svelte-i18n';
	import highcharts from '$lib/actions/highcharts.action';
	import { getChartConfig } from './chart_tempHumidityConfig';
	import TempHumidityCard from '../../Cards/TempHumidityCard.svelte';
	import DarkCard from '../../Cards/DarkCard.svelte';
	import Leaflet from '../../Maps/leaflet/Leaflet.svelte';
	import Marker from '../../Maps/leaflet/Marker.svelte';
	import { Button, CopyButton, Icon, ListItem } from 'svelte-ux';
	import { mdiAlertCircle, mdiCheckCircle, mdiEye, mdiMapMarker, mdiMapSearch } from '@mdi/js';
	import moment from 'moment';

	export let sensor = null;
	let lat = sensor.data.at(0).lat;
	let long = sensor.data.at(0).long;

	// Prepare data for the chart
	const temperatureData = sensor.data.map((d) => {
		d.temperature ? [new Date(d.created_at).getTime(), d.temperature] : undefined;
	});

	// Get Highcharts configuration
	const tempHumidChartConfig = getChartConfig(temperatureData);
</script>

<div class="grid grid-flow-row grid-cols-1 gap-2">
	<Leaflet view={[lat, long]} zoom={19} height={innerHeight / 3}>
		<Marker latLng={[lat, long]}>
			<Button
				icon={mdiMapMarker}
				variant="none"
				class="h-6 w-6 rounded-full border-4 border-red-600 text-primary hover:border-red-500"
			/>
		</Marker>
	</Leaflet>
</div>

{#if !temperatureData.every((d) => d == undefined)}
	<DarkCard title="Temperature & Humidity">
		<div class="chart-container" use:highcharts={tempHumidChartConfig}></div>
	</DarkCard>
{/if}

<DarkCard title="Location History">
	<ul>
		{#each sensor.data as item}
			<ListItem title="Normal Checkin">
				<div slot="avatar">
					{#if item.sos > 0}
						<Icon data={mdiAlertCircle} class="text-red-500" />
					{:else}
						<Icon data={mdiCheckCircle} class="text-green-500" />
					{/if}
				</div>
				<div slot="subheading">
					<p>Time: {moment(item.created_at).format('YYYY/MM/DD HH:MM A')}</p>
					<p>
						{item.lat},{item.long}
						<CopyButton value={`${item.lat}, ${item.long}`} />
					</p>
				</div>
				<div slot="actions">
					<Button variant="fill" icon={mdiMapSearch} on:click={() => {
						lat = item.lat;
						long = item.long;
					}} />
				</div>
			</ListItem>
		{/each}
	</ul>
</DarkCard>

<style>
	.chart-container {
		width: 100%;
		height: 400px;
	}
</style>
