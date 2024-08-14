<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { notificationStore } from '$lib/stores/notificationStore';
	import type { Tables } from '$lib/types/supabaseSchema';
	import { mdiFloppy, mdiMapMarker } from '@mdi/js';
	import { onMount } from 'svelte';
	import { Button, Icon, TextField } from 'svelte-ux';
	type locationType = Tables<'cw_locations'>;

	let location: locationType = {
		created_at: new Date().toDateString(),
		description: '',
		lat: -1,
		location_id: -1,
		long: -1,
		name: '',
		owner_id: ''
	};

	onMount(async () => {
		const locationPromise = await fetch(`/api/v1/locations/${$page.params.location_id}`);
		const locationData = await locationPromise.json();
		location = locationData;
	});

	// Get current location using Geolocation API
	function getCurrentLocation() {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					location.lat = position.coords.latitude.toString();
					location.long = position.coords.longitude.toString();
				},
				(error) => {
					console.error('Error getting location:', error);
					alert('Failed to get current location.');
				}
			);
		} else {
			alert('Geolocation is not supported by this browser.');
		}
	}
</script>

<div class="my-3 flex flex-row">
	<!-- TITLE -->
	<h2 class="text-surface ml-1 mt-4 text-2xl font-light">
		<Icon data={mdiMapMarker} class="h-6 w-6" />
		Location: {location?.name}
	</h2>
</div>

<div class="divide-y divide-white/5">
	<!-- Device Basic Info -->
	<div
		class="grid max-w-7xl grid-cols-1 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8"
	>
		<div>
			<h2 class="text-base font-semibold leading-7 text-white">Device Basic Info</h2>
			<p class="mt-1 text-sm leading-6 text-gray-400">Setup basic device data</p>
		</div>

		<form
			action="?/updateLocationInfo"
			method="POST"
			class="md:col-span-2"
			use:enhance={({ formElement, formData, action, cancel, submitter }) => {
				return async ({ result, update }) => {
					if (result.type === 'success') {
						notificationStore.NotificationTimedOpen({
							title: 'Location Updated',
							description: 'Location Updated Successfully.',
							timeout: 2000,
							icon: '✅',
							buttonText: 'OK'
						});
					} else {
						notificationStore.NotificationTimedOpen({
							title: 'Location Update Failed',
							description: 'Contact Support',
							timeout: 2000,
							icon: '❌',
							buttonText: 'OK'
						});
					}
				};
			}}
		>
			<div class="mb-2 grid grid-cols-1 gap-x-6 gap-y-8 sm:max-w-xl sm:grid-cols-6">
				<!-- Device Name -->
				<div class="col-span-full flex flex-col gap-2">
					<TextField
						id="device-name"
						name="name"
						label="Device Name"
						labelPlacement="top"
						bind:value={location.name}
					/>
					<div class="flex flex-row gap-2">
						<TextField
							id="device-name"
							name="lat"
							label="Location Latitude"
							bind:value={location.lat}
						/>
						<TextField
							id="device-name"
							name="long"
							label="Location Longitude"
							bind:value={location.long}
						/>
						<Button
							type="button"
							on:click={getCurrentLocation}
							class="rounded bg-blue-500 px-4 py-2 font-semibold text-white hover:bg-blue-400"
						>
							Use Current Location
						</Button>
					</div>
				</div>
			</div>
			<Button type="submit" icon={mdiFloppy} variant="fill" color="success">Save</Button>
		</form>
	</div>



    <div
		class="grid max-w-7xl grid-cols-1 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8"
	>
		<div>
			<h2 class="text-base font-semibold leading-7 text-white">Location Permissions</h2>
			<p class="mt-1 text-sm leading-6 text-gray-400">
                Control what users have view access to this location,
            </p>
            <p class="mt-1 text-sm leading-6 text-gray-400">
                Granting users access to this location does not grant them access to devices by default.
            </p>
		</div>

		<form
			action="?/updateLocationInfo"
			method="POST"
			class="md:col-span-2"
			use:enhance={({ formElement, formData, action, cancel, submitter }) => {
				return async ({ result, update }) => {
					if (result.type === 'success') {
						notificationStore.NotificationTimedOpen({
							title: 'Location Updated',
							description: 'Location Updated Successfully.',
							timeout: 2000,
							icon: '✅',
							buttonText: 'OK'
						});
					} else {
						notificationStore.NotificationTimedOpen({
							title: 'Location Update Failed',
							description: 'Contact Support',
							timeout: 2000,
							icon: '❌',
							buttonText: 'OK'
						});
					}
				};
			}}
		>
			<div class="mb-2 grid grid-cols-1 gap-x-6 gap-y-8 sm:max-w-xl sm:grid-cols-6">
				
			</div>
		</form>
	</div>
</div>
