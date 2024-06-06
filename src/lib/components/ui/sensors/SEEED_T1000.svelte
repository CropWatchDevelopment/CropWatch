<script lang="ts">
	import { Button, Dialog, Duration, Icon, RangeField } from 'svelte-ux';
	import EditSensorNameDialog from '../EditSensorNameDialog.svelte';
	import { _ } from 'svelte-i18n';
	import Leaflet from '$lib/components/maps/leaflet/Leaflet.svelte';
	import Marker from '$lib/components/maps/leaflet/Marker.svelte';
	import { mdiMapMarker } from '@mdi/js';
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
</script>

<svelte:window bind:innerWidth bind:innerHeight />

<div class="m-4">
	<div class="flex flex-row">
		<!-- <img
			src={isActiveRecently ? ActiveImage : inActiveImage}
			alt={isActiveRecently ? 'Active Image' : 'in-active Image'}
			class="w-14 h-14 mr-4"
		/> -->
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
	<RangeField bind:value max={data.length - 1} min={0} />

	<Leaflet bounds={[dataRange.map(points => [points.latitude, points.longitude])]} height={innerHeight / 1.5} zoom={15} {disableZoom}>
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
	<Button variant="fill" color="primary" class="m-4 w-full">
		Send BEEP Alert
	</Button>
</div>

<Dialog
	classes={{ root: 'Popover' }}
	open={openDialog}
	on:close={() => {
		openDialog = false;
		selectedPoint = null;
	}}
>
	<div slot="title">
		Status at: {moment.utc(selectedPoint.created_at).format('YYYY-MM-DD HH:MM A')}
	</div>
	{#if selectedPoint}
		<div class="flex flex-col justify-center mx-1">
			<div class="w-full">
				{#if selectedPoint.sos === 0}
					<svg
						id="Layer_1"
						style="enable-background:new 0 0 512 512; max-width: 10vw; margin-left: auto; margin-right:auto;"
						version="1.1"
						viewBox="0 0 512 512"
						xml:space="preserve"
						xmlns="http://www.w3.org/2000/svg"
						xmlns:xlink="http://www.w3.org/1999/xlink"
					>
						<style type="text/css">
							.st0 {
								fill: #2bb673;
							}
							.st1 {
								fill: none;
								stroke: #ffffff;
								stroke-width: 30;
								stroke-miterlimit: 10;
							}
						</style>
						<circle class="circle st0" cx="256" cy="256" r="1" />
						<g id="XMLID_1_">
							<line
								class="checkmark st1"
								id="XMLID_2_"
								x1="213.6"
								x2="369.7"
								y1="344.2"
								y2="188.2"
							/>
							<line
								class="checkmark st1"
								id="XMLID_4_"
								x1="233.8"
								x2="154.7"
								y1="345.2"
								y2="266.1"
							/>
						</g>
					</svg>
				{:else}
					<svg
						id="Layer_1"
						style="enable-background:new 0 0 512 512; max-width: 10vw; margin-left: auto; margin-right:auto;"
						version="1.1"
						viewBox="0 0 512 512"
						xml:space="preserve"
						xmlns="http://www.w3.org/2000/svg"
						xmlns:xlink="http://www.w3.org/1999/xlink"
					>
						<style type="text/css">
							.st0 {
								fill: #ff0000;
							}
							.st1 {
								fill: none;
								stroke: #ffffff;
								stroke-width: 30;
								stroke-miterlimit: 10;
							}
						</style>
						<circle class="circle st0" cx="256" cy="256" r="1" />
						<g id="XMLID_1_">
							<line class="exclamation-mark st1" x1="256" x2="256" y1="150" y2="300" />
							<circle cx="256" cy="350" r="15" fill="#FFFFFF" />
						</g>
					</svg>
				{/if}
				<p class="text-center text-slate-500 text-3xl">
					{#if selectedPoint.sos > 0}
						SOS!
					{:else}
						NO SOS!
					{/if}
				</p>
			</div>
			<DarkCard title="Temperature" value={selectedPoint.temperatureC} unit="°C" />
			<DarkCard title="Battery Level" value={selectedPoint.battery_level} unit="%" />
		</div>
	{/if}
	<div slot="actions">
		<Button variant="fill" color="primary">Close</Button>
	</div>
</Dialog>

<style>
	.circle {
		animation: growCircle 2s forwards;
	}

	.checkmark {
		stroke-dasharray: 500;
		stroke-dashoffset: 500;
		animation: drawCheckmark 2s forwards 2s;
	}

	@keyframes growCircle {
		from {
			r: 1;
		}
		to {
			r: 256; /* Half of 512, since viewBox is 512x512 */
		}
	}

	@keyframes drawCheckmark {
		from {
			stroke-dashoffset: 500;
		}
		to {
			stroke-dashoffset: 0;
		}
	}
</style>
