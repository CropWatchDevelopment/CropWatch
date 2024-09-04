<script lang="ts">
	import { Button, Icon, TextField } from 'svelte-ux';
	import { superForm } from 'sveltekit-superforms';
	import SuperDebug from 'sveltekit-superforms';
	import type { PageData } from '../$types';
	import { json } from 'd3';
	import Leaflet from '$lib/components/ui/Maps/leaflet/Leaflet.svelte';
	import { browser } from '$app/environment';
	import Marker from '$lib/components/ui/Maps/leaflet/Marker.svelte';
	import { mdiCheckCircle, mdiExclamation, mdiMapMarker } from '@mdi/js';
	import { notificationStore } from '$lib/stores/notificationStore';

	export let data: PageData;

	// Client API:
	const { form, errors, submitting, delayed, timeout, constraints, message, enhance } = superForm(
		data.form,
		{
			delayMs: 500,
			timeoutMs: 5000,
			onUpdate({ form }) {
				if (form.message) {
					notificationStore.NotificationTimedOpen({
						title: form.message.status == 'success' ? 'Success' : 'Error',
						description: form.message,
						buttonText: 'Close',
						timeout: 5000,
						icon: form.message.status == 'success' ? mdiCheckCircle : mdiExclamation
					});
				}
			}
		}
	);

	function getLocation(): void {
		if (browser && navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(showPosition, showError);
		} else {
			console.error('Geolocation is not supported by this browser.');
		}
	}

	function showPosition(position: GeolocationPosition): void {
		const latitude: number = position.coords.latitude;
		const longitude: number = position.coords.longitude;
		console.log(`Latitude: ${latitude}, Longitude: ${longitude}`);
		$form.lat = latitude;
		$form.long = longitude;
	}

	function showError(error: GeolocationPositionError): void {
		switch (error.code) {
			case error.PERMISSION_DENIED:
				console.error('User denied the request for Geolocation.');
				break;
			case error.POSITION_UNAVAILABLE:
				console.error('Location information is unavailable.');
				break;
			case error.TIMEOUT:
				console.error('The request to get user location timed out.');
				break;
			case error.UNKNOWN_ERROR:
				console.error('An unknown error occurred.');
				break;
		}
	}

	// Call the function to get the location
	getLocation();
</script>

<h1><Icon mdi={mdiMapMarker} /> Create a new Location</h1>
<form method="POST" use:enhance>
	<section class="flex flex-col gap-2">
		<TextField
			label="Location Name *"
			placeholder="xyz"
			name="name"
			bind:value={$form.name}
			aria-invalid={$errors.name ? 'true' : undefined}
			error={$errors.name}
			required
		/>

		<TextField
			label="Description"
			multiline
			placeholder="(Optional) Description"
			name="description"
			bind:value={$form.description}
			classes={{ input: 'h-[100px]' }}
		/>
		<TextField
			label="Latitude *"
			placeholder="31.12345"
			name="lat"
			bind:value={$form.lat}
			aria-invalid={$errors.lat ? 'true' : undefined}
			error={$errors.lat}
			required
		/>
		<TextField
			label="Longitude *"
			placeholder="131.12345"
			name="long"
			bind:value={$form.long}
			aria-invalid={$errors.long ? 'true' : undefined}
			error={$errors.long}
			required
		/>

		{#if $form.lat && $form.long}
			{#if parseFloat($form.lat) && parseFloat($form.long)}
				<Leaflet
					view={[+$form.lat, +$form.long]}
					zoom={17}
					height={500}
					on:mapclick={(coords) => {
						$form.lat = +coords.detail.lat;
						$form.long = +coords.detail.long;
					}}
				>
					<Marker latLng={[$form.lat, $form.long]} width={100} height={100}>
						<Icon data={mdiMapMarker} size={1} color="danger" />
					</Marker>
				</Leaflet>
			{/if}
		{/if}

		<div>
			<Button type="submit" variant="fill" color="primary" loading={$delayed}>Submit</Button>
		</div>

		<SuperDebug data={$form} />
	</section>
</form>
