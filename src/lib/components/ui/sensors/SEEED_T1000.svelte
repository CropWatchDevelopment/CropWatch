<script lang="ts">
	import { Button, DateRangeField, Duration, DurationUnits, Icon, PeriodType } from 'svelte-ux';
	import EditSensorNameDialog from '../EditSensorNameDialog.svelte';
	import { _ } from 'svelte-i18n';
	import Leaflet from '$lib/components/maps/leaflet/Leaflet.svelte';
	import Marker from '$lib/components/maps/leaflet/Marker.svelte';
	import { mdiArrowRight, mdiEye, mdiMapMarker } from '@mdi/js';
	import moment from 'moment';
	import DarkCard from '../DarkCard.svelte';
	import { subDays } from 'date-fns';

	export let data;
	export let sensorName = 'NS';
	export let permissions = 0;
	data.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

	const dev_eui = data.at(-1).dev_eui;
	let temperature = data.at(-1).temperatureC;
	let lastSeen = data.at(-1).created_at;
	let latitude = data.at(-1).latitude;
	let longitude = data.at(-1).longitude;

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
			latitude = filteredData.at(-1).latitude;
			longitude = filteredData.at(-1).longitude;
		}
	}

	// Calculate bounds for Leaflet map
	$: bounds = filteredData.map((d) => [d.latitude, d.longitude]);

	const filterDataByDate = (e) => {
		value = e.detail;
		debugger;
		filteredData = filteredData.filter(
			(d) => new Date(d.created_at) >= value.from && new Date(d.created_at) <= value.to
		);
		filteredData.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
	};

	function getAddress(latitude, longitude) {
		return fetch('/api/v1/geocoding?lat=' + latitude + '&long=' + longitude)
			.then((response) => response.json())
			.then((data) => data.display_name);
	}
</script>

<svelte:window bind:innerWidth bind:innerHeight />

<div class="m-4">
	<div class="flex flex-row">
		<div class="flex flex-col justify-center">
			<div class="flex flex-row text-neutral-content">
				<p class="text-surface-100 text-4xl mr-2">{sensorName}</p>
				<EditSensorNameDialog {dev_eui} bind:currentSensorName={sensorName} />
			</div>
			<p class="text-slate-500">
				{$_('lastSeen')}: <Duration start={lastSeen} totalUnits={1} />
				{$_('ago')}
			</p>
		</div>
	</div>

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
			}}>{disableZoom ? 'Enable Pan/Zoom' : 'Disable Pan/Zoom'}</Button
		>
	</div>

	<Leaflet height={innerHeight / 1.5} zoom={15} {disableZoom} {bounds}>
		{#each filteredData as movementPoint, index}
			<Marker latLng={[movementPoint.latitude, movementPoint.longitude]} width={16} height={16}>
				<Icon
					data={mdiMapMarker}
					size={52}
					class={movementPoint.sos > 0 ? 'text-red-600' : 'text-green-500'}
				/>
			</Marker>
		{/each}
	</Leaflet>
</div>

<div class="text-lg font-medium">
	{#await filteredData}
		<p>Loading...</p>
	{:then data}
		{#if data.length > 0}
			<table class="min-w-full divide-y divide-gray-200">
				<thead class="bg-gray-50">
					<tr>
						<th scope="col" class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
							Timestamp
						</th>
						<th scope="col" class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
							Status
						</th>
						<th scope="col" class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
							Temperature
						</th>
						<th scope="col" class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
							Coordinates
						</th>
						<th scope="col" class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
							Elapsed Time
						</th>
						<!-- <th scope="col" class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
							Actions
						</th> -->
					</tr>
				</thead>
				<tbody class="bg-white divide-y divide-gray-200">
					{#each data as movementPoint, index}
						<tr class="hover:bg-amber-200">
							<td class="px-6 py-4 whitespace-nowrap text-center">
								{moment.utc(movementPoint.created_at).format('YYYY-MM-DD HH:MM:ss')}
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-center">
								{movementPoint.sos && movementPoint.sos > 0 ? 'ALERT' : 'OK'}
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-center">
								{movementPoint.temperatureC.toFixed(2)}°C
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-center">
								{movementPoint.latitude}, {movementPoint.longitude}
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-center">
								<Duration start={movementPoint.created_at} totalUnits={2} minUnits={DurationUnits.Second} /> ago
							</td>
							<!-- <td class="px-6 py-4 whitespace-nowrap text-center">
								<Button size="sm" variant="fill" color="primary">
									<Icon data={mdiEye} size={24} />
								</Button>
							</td> -->
						</tr>
					{/each}
				</tbody>
			</table>
		{:else}
			<p>No data available</p>
		{/if}
	{:catch error}
		<p>{error.message}</p>
	{/await}
</div>

<div>
	<Button variant="fill" color="primary" class="m-4 w-full">Send BEEP Alert</Button>
</div>
