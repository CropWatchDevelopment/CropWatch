<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { Button, DatePickerField, NumberStepper, TextField, SelectField, Icon } from 'svelte-ux';
	import { mdiCalendar, mdiLock } from '@mdi/js';
	import type { Tables } from '$lib/types/supabaseSchema';
	import { _ } from 'svelte-i18n';

	let initialDeviceData: Tables<'cw_devices'>;
	let deviceData = {
		name: '',
		lat: '',
		long: '',
		upload_interval: 65,
		battery_changed_at: new Date(),
		location_id: -1 // New field for location ID
	};
	let errors = {
		name: '',
		lat: '',
		long: '',
		upload_interval: '',
		battery_changed_at: '',
		location_id: '' // New field for location ID
	};
	let isDirty = false;
	let locations: Tables<'cw_locations'>[] = []; // Array to store fetched locations
	let locationOptions: { label: string; value: number }[];

	// Fetch device data when component is mounted
	onMount(async () => {
		const devEui = $page.params.dev_eui; // Assuming device EUI is in the route parameters
		try {
			const res = await fetch(`/api/v1/devices/${devEui}`);
			const data = await res.json();
			initialDeviceData = {
				name: data.name || '',
				lat: data.lat || '',
				location_id: data.location_id,
				long: data.long || '',
				upload_interval: data.upload_interval || 65,
				battery_changed_at: data.battery_changed_at ? new Date(data.battery_changed_at) : new Date()
			};

			// Fetch available locations
			const locationsRes = await fetch('/api/v1/locations');
			const locationJson = await locationsRes.json();
			locationOptions = locationJson.map((l) => ({ label: l.name, value: l.location_id }));

			deviceData = { ...initialDeviceData };
		} catch (error) {
			console.error('Error loading device data:', error);
		}
		validate(); // Run validation after loading data
	});

	// Get current location using Geolocation API
	function getCurrentLocation() {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					deviceData.lat = position.coords.latitude.toString();
					deviceData.long = position.coords.longitude.toString();
					validate(); // Re-validate after setting new values
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

	function validate() {
		errors.name = deviceData.name ? '' : 'This is a required field';
		errors.lat =
			!isNaN(deviceData.lat) && deviceData.lat >= -90 && deviceData.lat <= 90
				? ''
				: 'Latitude must be a valid number between -90 and 90';
		errors.long =
			!isNaN(deviceData.long) && deviceData.long >= -180 && deviceData.long <= 180
				? ''
				: 'Longitude must be a valid number between -180 and 180';
		errors.upload_interval =
			deviceData.upload_interval > 0 ? '' : 'Interval must be greater than 0';
		errors.battery_changed_at = deviceData.battery_changed_at
			? ''
			: 'Battery changed date is required';
		errors.location_id = deviceData.location_id !== -1 ? '' : 'You must select a location';
		isDirty = JSON.stringify(initialDeviceData) !== JSON.stringify(deviceData);
	}
</script>

<div class="divide-y divide-white/5">
	<!-- Device Basic Info -->
	<div
		class="grid max-w-7xl grid-cols-1 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8"
	>
		<div>
			<h2 class="text-base font-semibold leading-7 text-surface-900">{$_('devices.settings.deviceBasicInfo')}</h2>
			<p class="mt-1 text-sm leading-6 text-surface-600">{$_('devices.settings.setupBasicDeviceSettings')}</p>
		</div>

		<form action="?/updateDeviceInfo" method="POST" class="md:col-span-2">
			<div class="grid grid-cols-1 gap-x-6 gap-y-8 sm:max-w-xl sm:grid-cols-6">
				<!-- Device Name -->
				<div class="col-span-full">
					<TextField
						id="device-name"
						name="name"
						label={$_('devices.settings.deviceName')}
						labelPlacement="top"
						bind:value={deviceData.name}
						error={errors.name}
						on:input={validate}
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
						bind:value={deviceData.lat}
						error={errors.lat}
						on:input={validate}
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
						bind:value={deviceData.long}
						error={errors.long}
						on:input={validate}
					/>
				</div>

				<!-- Uplink Interval -->
				<div class="sm:col-span-3">
					<NumberStepper
						id="upload_interval"
						name="upload_interval"
						label="{$_('devices.settings.uplinkInterval')}"
						bind:value={deviceData.upload_interval}
						error={errors.upload_interval}
						on:input={validate}
					/>
				</div>

				<!-- Battery Changed Date -->
				<div class="sm:col-span-3">
					<DatePickerField
						id="battery"
						name="battery"
						label="{$_('devices.settings.batteryChangedAt')}"
						icon={mdiCalendar}
						bind:value={deviceData.battery_changed_at}
						error={errors.battery_changed_at}
						on:input={validate}
					/>
				</div>

				<!-- Load Location Button -->
				<div class="col-span-full">
					<Button
						type="button"
						on:click={getCurrentLocation}
						class="rounded bg-blue-500 px-4 py-2 font-semibold text-surface-900 hover:bg-blue-400"
					>
					{$_('devices.settings.useCurrentLocation')}
					</Button>
				</div>
			</div>

			<div class="mt-8 flex">
				<Button
					type="submit"
					name="action"
					value="updateDeviceInfo"
					class="rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-surface-900 shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
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
			<h2 class="text-base font-semibold leading-7 text-surface-900">{$_('devices.settings.deviceLocationTitle')}</h2>
			<p class="mt-1 text-sm leading-6 text-surface-600">{$_('devices.settings.deviceLocationSubtitle')}</p>
		</div>

		<form action="?/updateLocation" method="POST" class="md:col-span-2">
			<SelectField
				id="location-select"
				name="location_id"
				label="Select Location"
				options={locationOptions}
				bind:value={deviceData.location_id}
				error={errors.location_id}
				on:change={validate}
			/>
			<div class="mt-8 flex">
				<Button
					type="submit"
					name="action"
					value="updateLocation"
					class="rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold text-surface-900 shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
					disabled={errors.location_id !== ''}>{$_('devices.settings.save')}</Button
				>
			</div>
		</form>
	</div>

	<!-- Device Danger Zone Section -->
	<div
		class="grid max-w-7xl grid-cols-1 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8"
	>
		<div>
			<h2 class="text-base font-semibold leading-7 text-surface-900">{$_('devices.settings.deviceConfigurationTitle')}</h2>
			<p class="mt-1 text-sm leading-6 text-surface-600">{$_('devices.settings.deviceConfigurationSubtitle')}</p>
		</div>

		<p class="w-full text-center">
			<Icon data={mdiLock} />
			{$_('devices.settings.comingSoon')}
		</p>
	</div>
</div>
