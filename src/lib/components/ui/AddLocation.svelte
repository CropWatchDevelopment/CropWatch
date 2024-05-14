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
	import { onMount } from 'svelte';

	let Leaflet;
	let Marker;

	onMount(async () => {
		if (browser) {
			Leaflet = await import('../maps/leaflet/Leaflet.svelte');
			Marker = await import('../maps/leaflet/Marker.svelte');
		}
	});

	let open = false;
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
					open = false;
				}
				return res.json();
			})
			.then((data) => {
				console.log(data);
				open = false;
			})
			.catch((err) => {
				console.error(err);
				open = false;
			});
	};

	const closing = () => {
		open = false;
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

<Button on:click={() => (open = true)} icon={mdiPlusCircle} size="sm" />

<Dialog bind:open on:close={() => closing()}>
	<div slot="title">
		<Icon data={mdiMapMarkerPlus} class="text-primary w-8 h-8" />
		{$_('addlocation.title')}
	</div>
	<div class="flex flex-col gap-2 m-4">
		<TextField name="locationName" label="Location Name" bind:value={name} />

		<TextField name="latitude" label="Location Latitude" type="decimal" bind:value={latitude} />

		<TextField name="longigude" label="Location Latitude" type="decimal" bind:value={longitude} />

		{#if browser}
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
		{/if}
	</div>
	<div class="flex flex-row mt-1 p-2">
		<Button variant="fill" icon={mdiClose} on:click={() => (open = false)} color="danger"
			>{$_('close')}</Button
		>
		<span class="flex-grow" />
		<Button
			variant="fill"
			type="button"
			icon={mdiFloppy}
			on:click={() => handleSubmit()}
			color="success">{$_('save')}</Button
		>
	</div>
</Dialog>
