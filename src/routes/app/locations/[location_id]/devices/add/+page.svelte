<script lang="ts">
	import { Button, Icon, NumberStepper, SelectField, TextField, Toggle } from 'svelte-ux';
	import { superForm } from 'sveltekit-superforms';
	import SuperDebug from 'sveltekit-superforms';
	import type { PageData } from '../$types';
	import Leaflet from '$lib/components/ui/Maps/leaflet/Leaflet.svelte';
	import { browser } from '$app/environment';
	import Marker from '$lib/components/ui/Maps/leaflet/Marker.svelte';
	import { mdiCheckCircle, mdiExclamation, mdiMapMarker } from '@mdi/js';
	import { notificationStore } from '$lib/stores/notificationStore';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { appStore } from '$lib/stores/app.store';

	export let data: PageData;

	function handleInput(event) {
		// Filter out invalid characters
		let validCharacters = event.target.value.replace(/[^0-9A-Fa-f]/g, '');

		// Trim to 16 characters if necessary
		if (validCharacters.length > 16) {
			validCharacters = validCharacters.substring(0, 16);
		}

		// Update the form value and the input field value
		$form.deveui = validCharacters;
	}

	// Client API:
	const { form, errors, delayed, enhance } = superForm(data.form, {
		onUpdated({ form }) {
			if (!form.message.status) {
				notificationStore.NotificationTimedOpen({
					title: 'Device Add Success!',
					description: form.message.text,
					icon: mdiCheckCircle,
					timeout: 5000,
					buttonText: 'Close'
				});
				goto(`/app/locations/${form.data.locationId}`);
			}
		}
	});
</script>

<h1>Add a new device to this location</h1>
<form method="POST" use:enhance>
	<section class="flex flex-col gap-2">
		<div class="flex flex-row gap-2">
			<TextField
				label="Device Name *"
				placeholder="xyz"
				name="name"
				class="w-1/2"
				bind:value={$form.name}
				aria-invalid={$errors.name ? 'true' : undefined}
				error={$errors.name}
				autofocus114992869
				required
			/>
			<TextField
				label="Dev EUI *"
				type="text"
				name="deveui"
				class="w-full"
				max={16}
				on:keydown={handleInput}
				bind:value={$form.deveui}
				aria-invalid={$errors.deveui ? 'true' : undefined}
				error={$errors.deveui}
				required
			/>
			<Toggle let:on={open} let:toggle let:toggleOff>
				<Button on:click={toggle}>Advanced</Button>
				{#if open}
					<TextField
						label="Join EUI/App Key *"
						placeholder="xyz"
						name="joinEui"
						bind:value={$form.joinEui}
						aria-invalid={$errors.name ? 'true' : undefined}
						error={$errors.joinEui}
						required
					/>
					<TextField
						label="Secret Key *"
						placeholder="xyz"
						name="secretKey"
						bind:value={$form.secretKey}
						aria-invalid={$errors.secretKey ? 'true' : undefined}
						error={$errors.secretKey}
						required
					/>
				{/if}
			</Toggle>
		</div>

		<TextField
			label="Serial Number"
			type="text"
			name="serialNumber"
			class="w-full"
			bind:value={$form.serialNumber}
			aria-invalid={$errors.serialNumber ? 'true' : undefined}
			error={$errors.serialNumber}
			required
		/>

		<div class="flex flex-row gap-2">
			<SelectField
				name="type"
				placeholder="Select Device Type"
				options={data.deviceTypeOptions}
				bind:value={$form.type}
				on:change={() => {
					if (form.type) {
						const foundItem = ($form.uploadInterval = data.deviceTypeOptions.find(
							(o) => o.value == $form.type
						));
						if (foundItem) {
							$form.uploadInterval = foundItem.uploadInterval;
						}
					}
				}}
				aria-invalid={$errors.type ? 'true' : undefined}
				error={$errors.type}
				required
			/>

			<NumberStepper name="uploadInterval" bind:value={$form.uploadInterval} />

			<hidden name="uploadInterval" value={$form.uploadInterval} />
		</div>

		<div class="flex flex-row gap-2">
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
		</div>

		{#if $form.lat && $form.long}
			<Leaflet
				view={[$form.lat, $form.long]}
				zoom={17}
				height={300}
				on:mapclick={(coords) => {
					$form.lat = coords.detail.lat;
					$form.long = coords.detail.long;
				}}
			>
				<Marker latLng={[$form.lat, $form.long]} width={100} height={100}>
					<Icon data={mdiMapMarker} size={1} color="danger" />
				</Marker>
			</Leaflet>
		{/if}

		<div>
			<Button type="submit" variant="fill" color="primary" loading={$delayed}>Submit</Button>
		</div>

		{#if $appStore.debugMode}
		<SuperDebug data={$form} />
		{/if}
	</section>
</form>
