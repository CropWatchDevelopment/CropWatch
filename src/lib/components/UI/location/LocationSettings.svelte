<script lang="ts">
	import { Button, Card, Tabs, TextField } from 'svelte-ux';
	import LocationPermissions from './LocationPermissions.svelte';
	import LocationGeneralSettings from './LocationGeneralSettings.svelte';
	import { superForm } from 'sveltekit-superforms';

	let {
		data = $bindable(),
		addDeviceForm = $bindable(),
		devices,
		location,
		locationUsers = $bindable(),
		locationGeneralForm = $bindable()
	} = $props();

	const { form, errors, enhance } = superForm(locationGeneralForm);
</script>

<h1>Settings for {location.name}</h1>

<div class="flex flex-col gap-5">
	<Card>
		<!-- <LocationGeneralSettings {location} {devices} /> -->
	</Card>

	<Card>
		<LocationPermissions {data} {locationUsers} />
	</Card>

	<Card class="p-4">
		<form
			method="POST"
			action="?/updateLocationGeneralSettings"
			use:enhance
			class="flex flex-col gap-2"
		>
			<div class="grid grid-flow-col gap-2">
				<TextField
					label="Location Name"
					name="name"
					id="name"
					bind:value={$form.name}
					aria-invalid={$errors.name ? 'true' : undefined}
					error={$errors.name}
				/>
			</div>
			<div class="grid grid-flow-col gap-2">
				<TextField label="Latitude" type="text" name="lat" id="lat" bind:value={$form.lat} />
			</div>
			<div class="grid grid-flow-col gap-2">
				<TextField label="Longitude" type="text" name="long" id="long" bind:value={$form.long} />
			</div>

			<div>
				<Button type="submit" variant="fill" color="primary" class="w-full" disabled={$form.valid}>
					Submit
				</Button>
			</div>
		</form>
	</Card>
</div>
