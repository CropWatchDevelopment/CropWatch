<script lang="ts">
	import { Button, Dialog, Duration, Icon, RangeField } from 'svelte-ux';
	import EditSensorNameDialog from '../EditSensorNameDialog.svelte';
	import { _ } from 'svelte-i18n';
	import Leaflet from '$lib/components/maps/leaflet/Leaflet.svelte';
	import Marker from '$lib/components/maps/leaflet/Marker.svelte';
	import { mdiArrowRight, mdiEye, mdiMapMarker } from '@mdi/js';
	import Line from '$lib/components/maps/leaflet/Line.svelte';
	import moment from 'moment';
	import DarkCard2 from '../DarkCard2.svelte';
	import DarkCard from '../DarkCard.svelte';

	export let data;
	export let sensorName = 'NS';
	export let permissions = 0;
	data.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

	const dev_eui = data.at(0).dev_eui;
	const temperature = data.at(0).temperatureC;
	let lastSeen = data.at(0).created_at;
	let latitude = data.at(0).latitude;
	let longitude = data.at(0).longitude;

	let innerWidth = 0;
	let innerHeight = 0;
	let value = data.length - 1;
	let disableZoom: boolean = true;

	$: lastDatapointAsOf = data.length > 0 ? data.at(value)?.created_at : '';
	$: dataRange = data.slice(0, Math.min(value + 1, data.length));
	let openDialog = false;
	let selectedPoint = null;

	function handleClick(point) {
		openDialog = true;
		selectedPoint = point;
	}

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

	<p class="text-white text-4xl">{moment.utc(lastDatapointAsOf).format('YYYY-MM-DD HH:MM:ss')}</p>

	<DarkCard title="Temperature" value={temperature} unit="°C" />
	<DarkCard title="Battery Level" value={dataRange.at(value).battery_level} unit="%" />
	<div class="flex flex-row gap-1 w-full mb-4">
		<RangeField bind:value max={data.length - 1} min={0} class="w-full" />
		<Button
			size="sm"
			on:click={() => {
				disableZoom = !disableZoom;
			}}>{disableZoom ? 'Enable Pan/Zoom' : 'Disable Pan/Zoom'}</Button
		>
	</div>

	<Leaflet
		bounds={[dataRange.map((points) => [points.latitude, points.longitude])]}
		height={innerHeight / 1.5}
		zoom={15}
		{disableZoom}
	>
		<Marker latLng={[latitude, longitude]} width={32} height={32}>
			<Icon data={mdiMapMarker} size={52} class="text-red-600" />
		</Marker>
		{#each dataRange as movementPoint, index}
			<Marker latLng={[movementPoint.latitude, movementPoint.longitude]} width={32} height={32}>
				<Icon
					data={mdiMapMarker}
					size={52}
					class={movementPoint.sos > 0 ? 'text-red-600' : 'text-green-500'}
					on:click={() => handleClick(movementPoint)}
				/>
				{#if index > 0 && data[index - 1]}
					<Line
						startlatLng={[data[index - 1].latitude, data[index - 1].longitude]}
						endlatLng={[movementPoint.latitude, movementPoint.longitude]}
					/>
				{/if}
			</Marker>
		{/each}
	</Leaflet>
</div>

<div>
	<Button variant="fill" color="primary" class="m-4 w-full">Send BEEP Alert</Button>
</div>