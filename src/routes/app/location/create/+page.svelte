<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import type { PageData } from './$types';
	import { AddLocationForm } from '$lib/form-schemas/AddLocation.schema';
	import { Avatar, Button, Card, Header, Icon, Input, TextField } from 'svelte-ux';
	import { mdiMapMarkerPlus, mdiPlus } from '@mdi/js';

	export let data: PageData;

	const { form, errors, enhance, constraints, allErrors } = superForm(data.form, {
		validators: zodClient(AddLocationForm),
		// Optional: custom error handling
		onError: ({ result }) => {
			console.error('Form submission error', result);
		},
		// Optional: success handling
		onUpdate: ({ form }) => {
			if (form.message) {
				// Handle success message or redirect
				console.log(form.message);
			}
		}
	});
</script>

<Card class="m-5 p-5">
	<Header title="Add new location" subheading="Subheading" slot="header">
		<div slot="avatar">
			<Avatar class="bg-primary font-bold text-primary-content">
				<Icon data={mdiMapMarkerPlus} />
			</Avatar>
		</div>
	</Header>
	<form method="POST" use:enhance class="flex flex-col gap-4">
		<div>
			<TextField
				type="text"
				name="name"
				bind:value={$form.name}
				label="Name"
				error={$errors.name}
			/>
		</div>

		<div>
			<TextField
				type="text"
				name="lat"
				bind:value={$form.lat}
				label="Latitude"
				error={$errors.lat}
			/>
		</div>

		<div>
			<TextField
				type="text"
				name="long"
				bind:value={$form.long}
				label="Longitude"
				errors={$errors.long}
			/>
		</div>

		<div>
			<TextField
				name="description"
				bind:value={$form.description}
				label="Description"
				errors={$errors.description}
			/>
		</div>

		<Button type="submit" variant="fill" icon={mdiPlus} disabled={$allErrors.length > 0}>Create Location</Button>
	</form>
</Card>

<style>
	.error {
		color: red;
	}
</style>
