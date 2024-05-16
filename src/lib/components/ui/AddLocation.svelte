<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		mdiClose,
		mdiFloppy,
		mdiMapMarker,
		mdiMapMarkerPlus,
		mdiPencil,
		mdiPlusCircle
	} from '@mdi/js';
	import { toast } from '@zerodevx/svelte-toast';
	import { Button, Dialog, Icon, TextField } from 'svelte-ux';
	import { _ } from 'svelte-i18n';
	import { browser } from '$app/environment';
	import Leaflet from '../maps/leaflet/Leaflet.svelte';
	import Marker from '../maps/leaflet/Marker.svelte';
	import { goto } from '$app/navigation';

	let latitude: number = 0;
	let longitude: number = 0;
	let name: string = '';

	const handleSubmit = () => {
		fetch(`/api/v1/locations`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ name, latitude, longitude })
		})
			.then((res) => {
				if (res.ok) {
					debugger;
					toast.push(`Location name updated successfully`, {
						theme: {
							'--toastBackground': 'green',
							'--toastColor': 'black'
						}
					});
				} else {
					toast.push(`Location name updated FAILED`, {
						theme: {
							'--toastBackground': 'red',
							'--toastColor': 'black'
						}
					});
				}
				return res.json();
			})
			.catch((err) => {
				console.error(err);
				toast.push(`Location name updated FAILED ${err}`, {
						theme: {
							'--toastBackground': 'red',
							'--toastColor': 'black'
						}
					});
			});
	};

	const getLocation = async () => {
		if (browser && navigator.geolocation) {
			return await navigator.geolocation.getCurrentPosition(
				async (pos) => {
					latitude = pos.coords.latitude;
					longitude = pos.coords.longitude;
					return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
				},
				(error) => {
					console.error(error);
					return { latitude: 0, longitude: 0 };
				}
			);
		}
		return { latitude: 0, longitude: 0 };
	};
	getLocation();
</script>

<div class="flex flex-col gap-2 m-4 flex-grow">
	<TextField name="locationName" label="Location Name" bind:value={name} />

	<TextField name="latitude" label="Location Latitude" type="decimal" bind:value={latitude} />

	<TextField name="longigude" label="Location Latitude" type="decimal" bind:value={longitude} />

	<Leaflet
		view={[latitude, longitude]}
		zoom={19}
		disableZoom={true}
		width={100}
		height={270}
		on:mapclick={(e) => {
			latitude = e.detail.latitude;
			longitude = e.detail.longitude;
		}}
	>
		{#key latitude + longitude}
			<Marker latLng={[latitude, longitude]} width={50} height={50}
				><Icon data={mdiMapMarker} class="text-red-600 w-full h-full" /></Marker
			>
		{/key}
	</Leaflet>
</div>
<div class="flex flex-row mt-1 p-2">
	<span class="flex-grow" />
	<Button
		variant="fill"
		type="button"
		icon={mdiFloppy}
		on:click={() => handleSubmit()}
		color="success">{$_('save')}</Button
	>
</div>
