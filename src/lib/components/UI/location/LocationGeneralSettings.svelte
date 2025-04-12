<script lang="ts">
	import { Circle, Map, Marker, Popup, TileLayer } from 'sveaflet';
	import type { LatLngTuple, MapOptions } from 'leaflet';
	import { error } from 'highcharts';
	import { superForm } from 'sveltekit-superforms';
	import { Avatar, Button, Card, Header, Icon, TextField } from 'svelte-ux';
	import { mdiFloppy, mdiMapMarker } from '@mdi/js';

	let { location, locationGeneralForm } = $props();
	let { form, errors, enhance } = superForm(locationGeneralForm);
</script>

<Card>
	<Header title="Location's General Settings" subheading="Update location details" slot="header">
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
		class="flex flex-col gap-3 p-2 sm:p-4"
	>
		<div class="w-full">
			<TextField
				label="Location Name"
				name="name"
				id="name"
				bind:value={$form.name}
				aria-invalid={$errors.name ? 'true' : undefined}
				error={$errors.name}
				class="w-full"
			/>
		</div>
		<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
			<TextField
				label="Latitude"
				type="text"
				name="lat"
				id="lat"
				bind:value={$form.lat}
				class="w-full"
			/>
			<TextField
				label="Longitude"
				type="text"
				name="long"
				id="long"
				bind:value={$form.long}
				class="w-full"
			/>
		</div>

		<div class="mt-2">
			<Button
				type="submit"
				icon={mdiFloppy}
				variant="fill"
				color="primary"
				class="w-full"
				disabled={$form.valid}
			>
				Save Changes
			</Button>
		</div>
	</form>
</Card>
