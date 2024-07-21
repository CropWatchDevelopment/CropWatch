<script lang="ts">
	import { Button, DateRangeField, Icon, PeriodType } from 'svelte-ux';
	import { _ } from 'svelte-i18n';
	import Leaflet from '$lib/components/maps/leaflet/Leaflet.svelte';
	import Marker from '$lib/components/maps/leaflet/Marker.svelte';
	import { mdiMapMarker } from '@mdi/js';
	import moment from 'moment';
	import DarkCard from '../DarkCard.svelte';
	import { subDays } from 'date-fns';
	import ResponsiveTable from '../ResponsiveTable.svelte';
	import { SEEED_T1000 } from '$lib/sensor-dto/convert_seeed_t1000';

	export let data;
	data.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

	let temperature = data.at(-1).temperatureC;
	let lastSeen = data.at(-1).created_at;
	let lat = data.at(-1).lat;
	let long = data.at(-1).long;

	let innerWidth = 0;
	let innerHeight = 0;
	let disableZoom: boolean = true;

	let today = new Date();
	let value = {
		from: subDays(today, 3),
		to: today,
		periodType: PeriodType.Day
	};

	// Reactive statement to filter data based on the selected date range
	$: filteredData = data.filter(
		(d) => new Date(d.created_at) >= value.from && new Date(d.created_at) <= value.to
	);

	// Update variables based on the filtered data
	$: {
		if (filteredData.length > 0) {
			lastSeen = filteredData.at(-1).created_at;
			temperature = filteredData.at(-1).temperatureC;
			lat = filteredData.at(-1).lat;
			long = filteredData.at(-1).long;
		}
	}

	// Calculate bounds for Leaflet map
	$: bounds = filteredData.map((d) => [d.lat, d.long]);

	const filterDataByDate = (e) => {
		value = e.detail;
		debugger;
		filteredData = filteredData.filter(
			(d) => new Date(d.created_at) >= value.from && new Date(d.created_at) <= value.to
		);
		filteredData.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
	};

	function getAddress(lat, long) {
		return fetch('/api/v1/geocoding?lat=' + lat + '&long=' + long)
			.then((response) => response.json())
			.then((data) => data.display_name);
	}
</script>

<svelte:window bind:innerWidth bind:innerHeight />



	<p class="text-white text-4xl">
		Latest: {moment.utc(data[data.length - 1].created_at).format('YYYY-MM-DD HH:MM:ss')}
	</p>

	<DarkCard title="Temperature" value={temperature} unit="°C" />
	<DarkCard title="Battery Level" value={data.at(-1).battery_level} unit="%" />
	<div class="flex flex-row gap-1 w-full mb-4">
		<DateRangeField
			periodTypes={[]}
			label=""
			maxDate={new Date()}
			on:change={(e) => filterDataByDate(e)}
			bind:value
			stepper
			rounded
			center
			class="w-full"
		/>
		<Button
			size="sm"
			on:click={() => {
				disableZoom = !disableZoom;
			}}
		>
			{disableZoom ? 'Enable Pan/Zoom' : 'Disable Pan/Zoom'}
		</Button>
	</div>

	<Leaflet height={innerHeight / 1.5} zoom={15} {disableZoom} {bounds}>
		{#each filteredData as movementPoint, index}
			<Marker latLng={[movementPoint.lat, movementPoint.long]} width={16} height={16}>
				<Icon
					data={mdiMapMarker}
					size={40}
					class={movementPoint.sos > 0 ? 'text-red-600' : 'text-green-500'}
				/>
			</Marker>
		{/each}
	</Leaflet>


<div class="overflow-x-auto">
	<ResponsiveTable
		data={data.map((d) => {
			let resp = SEEED_T1000(d);
			if (resp) resp.created_at = moment.utc(d.created_at).format('YYYY-MM-DD HH:MM:ss');
			return resp;
		})}
	/>
</div>

