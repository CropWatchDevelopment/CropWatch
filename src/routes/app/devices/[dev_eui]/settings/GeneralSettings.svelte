<script lang="ts">
	import { onMount } from 'svelte';
	import { Button, DatePickerField, NumberStepper, TextField, SelectField, Icon } from 'svelte-ux';
	import { mdiCalendar, mdiFloppy, mdiLock, mdiMapMarker } from '@mdi/js';
	import { _ } from 'svelte-i18n';
	import { appStore } from '$lib/stores/app.store';
	import SuperDebug from 'sveltekit-superforms';

	export let superform;

	let { form, errors, enhance, delayed } = superform;

	let locationOptions: { label: string; value: number }[];

	// Fetch device data when component is mounted
	onMount(async () => {
		const locationsRes = await fetch('/api/v1/locations');
		const locationJson = await locationsRes.json();

		locationOptions = locationJson
			.filter(
				(obj1, i, arr) => arr.findIndex((obj2) => obj2.location_id === obj1.location_id) === i
			)
			.map((m) => {
				return { label: m.name, value: m.location_id };
			});
	});

	// Get current location using Geolocation API
	function getCurrentLocation() {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					$form.lat = position.coords.latitude;
					$form.long = position.coords.longitude;
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

<div class="divide-y divide-white/5">
	<!-- Device Basic Info -->
	<div
		class="grid max-w-7xl grid-cols-1 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8"
	>
		<div>
			<h2 class="text-surface-900 text-base font-semibold leading-7">
				{$_('devices.settings.deviceBasicInfo')}
			</h2>
			<p class="text-surface-600 mt-1 text-sm leading-6">
				{$_('devices.settings.setupBasicDeviceSettings')}
			</p>
		</div>

		<form action="?/updateDeviceInfo" method="POST" class="md:col-span-2" use:enhance>
			<div class="grid grid-cols-1 gap-x-6 gap-y-8 sm:max-w-xl sm:grid-cols-6">
				<!-- Device Name -->
				<div class="col-span-full">
					<TextField
						id="device-name"
						name="name"
						label={$_('devices.settings.deviceName')}
						labelPlacement="top"
						bind:value={$form.name}
						error={$errors.name}
						aria-invalid={$errors.name ? 'true' : undefined}
					/>
				</div>

				<!-- Latitude -->
				<div class="sm:col-span-3">
					<TextField
						id="lat"
						name="lat"
						label={$_('devices.settings.latitude')}
						type="text"
						labelPlacement="top"
						bind:value={$form.lat}
						error={$errors.lat}
						aria-invalid={$errors.lat ? 'true' : undefined}
					/>
				</div>

				<!-- Longitude -->
				<div class="sm:col-span-3">
					<TextField
						id="long"
						name="long"
						label={$_('devices.settings.longitude')}
						type="text"
						labelPlacement="top"
						bind:value={$form.long}
						error={$errors.long}
						aria-invalid={$errors.long ? 'true' : undefined}
					/>
				</div>

				<!-- Uplink Interval -->
				<div class="sm:col-span-3">
					<NumberStepper
						id="upload_interval"
						name="upload_interval"
						label={$_('devices.settings.uplinkInterval')}
						bind:value={$form.upload_interval}
						error={$errors.upload_interval}
						aria-invalid={$errors.upload_interval ? 'true' : undefined}
						class="w-full"
					/>
				</div>

				<!-- Battery Changed Date -->
				<div class="sm:col-span-3">
					<DatePickerField
						id="battery"
						name="battery"
						label={$_('devices.settings.batteryChangedAt')}
						icon={mdiCalendar}
						bind:value={$form.battery_changed_at}
						error={$errors.battery_changed_at}
						aria-invalid={$errors.battery_changed_at ? 'true' : undefined}
					/>
				</div>

				<!-- Load Location Button -->
				<div class="col-span-full">
					<Button
						type="button"
						icon={mdiMapMarker}
						on:click={getCurrentLocation}
						class="text-surface-900 rounded bg-blue-500 px-4 py-2 font-semibold hover:bg-blue-400"
					>
						{$_('devices.settings.useCurrentLocation')}
					</Button>
				</div>
			</div>

			<div class="mt-8 flex">
				<Button
					type="submit"
					name="action"
					icon={mdiFloppy}
					loading={$delayed}
					value="updateDeviceInfo"
					class="text-surface-900 rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
					>{$_('devices.settings.save')}</Button
				>
			</div>
		</form>
	</div>

	<!-- Device Location Section -->
	<div
		class="grid max-w-7xl grid-cols-1 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8"
	>
		<div>
			<h2 class="text-surface-900 text-base font-semibold leading-7">
				{$_('devices.settings.deviceLocationTitle')}
			</h2>
			<p class="text-surface-600 mt-1 text-sm leading-6">
				{$_('devices.settings.deviceLocationSubtitle')}
			</p>
		</div>

		<form action="?/updateLocation" method="POST" class="md:col-span-2">
			<SelectField
				id="location-select"
				name="location_id"
				label="Select Location"
				options={locationOptions}
				bind:value={$form.location_id}
				error={$errors.location_id}
				aria-invalid={$errors.location_id ? 'true' : undefined}
			/>
			<div class="mt-8 flex">
				<Button
					type="submit"
					name="action"
					value="updateLocation"
					class="text-surface-900 rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
					disable={$errors}>{$_('devices.settings.save')}</Button
				>
			</div>
		</form>
	</div>

	<!-- Device Danger Zone Section -->
	<div
		class="grid max-w-7xl grid-cols-1 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8"
	>
		<div>
			<h2 class="text-surface-900 text-base font-semibold leading-7">
				{$_('devices.settings.deviceConfigurationTitle')}
			</h2>
			<p class="text-surface-600 mt-1 text-sm leading-6">
				{$_('devices.settings.deviceConfigurationSubtitle')}
			</p>
		</div>

		<p class="w-full text-center">
			<Icon data={mdiLock} />
			{$_('devices.settings.comingSoon')}
		</p>
	</div>
</div>

{#if $appStore.debugMode}
	<SuperDebug data={$form} />
{/if}
