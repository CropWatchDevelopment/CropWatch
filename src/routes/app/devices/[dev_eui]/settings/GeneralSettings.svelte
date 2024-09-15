<script lang="ts">
	import { onMount } from 'svelte';
	import {
		Button,
		DatePickerField,
		NumberStepper,
		TextField,
		SelectField,
		Icon,
		type MenuOption
	} from 'svelte-ux';
	import { mdiCalendar, mdiFloppy, mdiLock, mdiMapMarker } from '@mdi/js';
	import { _ } from 'svelte-i18n';
	import { appStore } from '$lib/stores/app.store';
	import SuperDebug from 'sveltekit-superforms';

	export let deviceForm;
	export let locationForm;
	export let locationOptions: MenuOption<any>[] = [];
	export let deviceLocationEnhance;

	// Get current location using Geolocation API
	function getCurrentLocation() {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					deviceForm.lat = position.coords.latitude;
					deviceForm.long = position.coords.longitude;
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

		<form action="?/updateDeviceInfo" method="POST" class="md:col-span-2">
			<div class="grid grid-cols-1 gap-x-6 gap-y-8 sm:max-w-xl sm:grid-cols-6">
				<div class="col-span-full">
					<TextField
						id="device-name"
						name="name"
						label={$_('devices.settings.deviceName')}
						labelPlacement="top"
						bind:value={$deviceForm.name}
					/>
				</div>

				<div class="sm:col-span-3">
					<TextField
						id="lat"
						name="lat"
						label={$_('devices.settings.latitude')}
						type="text"
						labelPlacement="top"
						bind:value={$deviceForm.lat}
					/>
				</div>

				<div class="sm:col-span-3">
					<TextField
						id="long"
						name="long"
						label={$_('devices.settings.longitude')}
						type="text"
						labelPlacement="top"
						bind:value={$deviceForm.long}
						aria-invalid={$deviceForm.long ? 'true' : undefined}
					/>
				</div>

				<div class="sm:col-span-3">
					<NumberStepper
						id="upload_interval"
						name="upload_interval"
						label={$_('devices.settings.uplinkInterval')}
						bind:value={$deviceForm.upload_interval}
						aria-invalid={$deviceForm.upload_interval ? 'true' : undefined}
						class="w-full"
					/>
				</div>

				<div class="sm:col-span-3">
					<DatePickerField
						id="battery"
						name="battery"
						label={$_('devices.settings.batteryChangedAt')}
						icon={mdiCalendar}
						bind:value={$deviceForm.battery_changed_at}
						aria-invalid={$deviceForm.battery_changed_at ? 'true' : undefined}
					/>
				</div>

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
					loading={$deviceForm.$delayed}
					value="updateDeviceInfo"
					class="text-surface-900 rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
					>{$_('devices.settings.save')}</Button
				>
			</div>
		</form>
	</div>

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

		<form action="?/updateLocation" method="post" use:deviceLocationEnhance>
			<SelectField
				id="location_id"
				name="location_id"
				label="Select Location"
				options={locationOptions}
				bind:value={$locationForm.location_id}
			/>

			<div class="mt-8 flex">
				<input type="hidden" name="dev_eui" value={$locationForm.dev_eui} />
				<Button
					type="submit"
					name="action"
					value="updateLocation"
					class="text-surface-900 rounded-md bg-indigo-500 px-3 py-2 text-sm font-semibold shadow-sm hover:bg-indigo-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
					>{$_('devices.settings.save')}</Button
				>
			</div>
		</form>
	</div>

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

<!-- {#if $appStore.debugMode} -->
<SuperDebug data={$deviceForm} />
<SuperDebug data={$locationForm} />
<!-- {/if} -->
