<script lang="ts">
	import { Circle, Map, Marker, Popup, TileLayer } from 'sveaflet';
	import type { LatLngTuple, MapOptions } from 'leaflet';
	import { error } from 'highcharts';
	import { superForm } from 'sveltekit-superforms';
	import { Avatar, Button, Card, Header, Icon, TextField } from 'svelte-ux';
	import { mdiMapMarker } from '@mdi/js';

	let { location, locationGeneralForm } = $props();
	let { form, errors, enhance } = superForm(locationGeneralForm);
</script>

<Card>
	<Header title="Location's User Permissions" subheading="Subheading" slot="header">
		<div slot="avatar">
			<Avatar class="bg-primary text-primary-content font-bold">
				<Icon data={mdiMapMarker} class="text-2xl" />
			</Avatar>
		</div>
	</Header>
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
