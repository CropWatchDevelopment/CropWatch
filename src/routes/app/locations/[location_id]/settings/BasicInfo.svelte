<script lang="ts">
	import { notificationStore } from '$lib/stores/notificationStore';
	import { mdiCheckCircle, mdiCloseBox, mdiFloppy } from '@mdi/js';
	import { Button, TextField } from 'svelte-ux';
	import { _ } from 'svelte-i18n';

	export let superform;

	const { form, errors, delayed, enhance } = superform;

	// Get current location using Geolocation API
	function getCurrentLocation() {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				(position) => {
					$form.lat = +position.coords.latitude;
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

<!-- Device Basic Info -->
<div class="grid max-w-7xl grid-cols-1 gap-x-8 gap-y-10 px-4 py-16 sm:px-6 md:grid-cols-3 lg:px-8">
	<div>
		<h2 class="text-base font-semibold leading-7 text-white">
			{$_('location.settings.basicInfo')}
		</h2>
		<p class="mt-1 text-sm leading-6 text-gray-400">
			{$_('location.settings.basicInfoSubtitle')}
		</p>
	</div>

	<form action="?/updateLocationInfo" method="POST" class="md:col-span-2" use:enhance>
		<div class="mb-2 grid grid-cols-1 gap-x-6 gap-y-8 sm:max-w-xl sm:grid-cols-6">
			<!-- Device Name -->
			<div class="col-span-full flex flex-col gap-2">
				<TextField
					id="device-name"
					name="name"
					label={$_('location.settings.locationName')}
					labelPlacement="top"
					bind:value={$form.name}
					required
					aria-invalid={$errors.name ? 'true' : undefined}
					error={$errors.name}
				/>
				<div class="flex flex-row gap-2">
					<TextField
						id="device-name"
						name="lat"
						label={$_('location.settings.locationLatitude')}
						bind:value={$form.lat}
						required
						aria-invalid={$errors.lat ? 'true' : undefined}
						error={$errors.lat}
					/>
					<TextField
						id="device-name"
						name="long"
						label={$_('location.settings.locationLongitude')}
						bind:value={$form.long}
						required
						aria-invalid={$errors.long ? 'true' : undefined}
						error={$errors.long}
					/>
					<Button
						type="button"
						on:click={getCurrentLocation}
						class="rounded bg-blue-500 px-4 py-2 font-semibold text-white hover:bg-blue-400"
					>
						{$_('location.settings.useCurrentLocation')}
					</Button>
				</div>
			</div>
		</div>
		<Button type="submit" loading={$delayed} icon={mdiFloppy} variant="fill" color="success"
			>{$_('location.settings.save')}</Button
		>
	</form>
</div>
