<script lang="ts">
	import { enhance } from '$app/forms';
	import { mdiClose, mdiFloppy, mdiPencil, mdiPlusCircle } from '@mdi/js';
	import { toast } from '@zerodevx/svelte-toast';
	import { Button, Dialog, TextField } from 'svelte-ux';
	import { _ } from 'svelte-i18n';

	let open = false;
	let latitude: number = 0;
	let longitude: number = 0;
	let name: string = '';

	const handleSubmit = () => {
		fetch(`/api/v1/locations`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ name, latitude, longitude })
		})
			.then((res) => {
				if (res.ok) {
					toast.push(`Location name updated successfully`, {
						theme: {
							'--toastBackground': 'green',
							'--toastColor': 'black'
						}
					});
				} else {
					toast.push(`Location name updated FAILED`, {
						theme: {
							'--toastBackground': 'red',
							'--toastColor': 'black'
						}
					});
					open = false;
				}
				return res.json();
			})
			.then((data) => {
				console.log(data);
				open = false;
			})
			.catch((err) => {
				console.error(err);
				open = false;
			});
	};

	const closing = () => {
		open = false;
	};
</script>

<Button on:click={() => (open = true)} icon={mdiPlusCircle} size="sm" />

<Dialog bind:open on:close={() => closing()}>
	<div slot="title">Create a new Location</div>
	<div class="flex flex-col gap-2 m-4">
		<TextField name="locationName" label="Location Name" bind:value={name} />

		<TextField name="latitude" label="Location Latitude" type="decimal" bind:value={latitude} />

		<TextField name="longigude" label="Location Latitude" type="decimal" bind:value={longitude} />
	</div>
	<div class="flex flex-row mt-1 p-2">
		<Button variant="fill" icon={mdiClose} on:click={() => (open = false)} color="danger"
			>{$_('close')}</Button
		>
		<span class="flex-grow" />
		<Button
			variant="fill"
			type="button"
			icon={mdiFloppy}
			on:click={() => handleSubmit()}
			color="success">{$_('save')}</Button
		>
	</div>
</Dialog>
