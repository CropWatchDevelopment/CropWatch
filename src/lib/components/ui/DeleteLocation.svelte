<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { mdiAlert, mdiTrashCan } from '@mdi/js';
	import { toast } from '@zerodevx/svelte-toast';
	import { Button, Dialog, Icon, TextField, Toggle } from 'svelte-ux';
	let value = '';

	const deleteLocation = (location_id: number) => {
		fetch(`/api/v1/locations/${$page.params.location_id}`, {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ location_id })
		})
			//.then((res) => res.json())
            .then((res) => {
				if (res.ok) {
                    goto('/app');
					toast.push(`Location deleted successfully`, {
						theme: {
							'--toastBackground': 'green',
							'--toastColor': 'black'
						}
					});
				} else {
					toast.push(`Failed to delete location, contact support`, {
						theme: {
							'--toastBackground': 'red',
							'--toastColor': 'black'
						}
					});
				}
				return res.json();
			})
			.catch((err) => {
				console.error(err);
			});
	};
</script>

<Toggle let:on={open} let:toggle>
	<Button
		icon={mdiTrashCan}
		{open}
		on:click={toggle}
		color="danger"
		variant="fill-outline"
		class="w-full">Delete Location</Button
	>
	<Dialog {open} on:close={toggle}>
		<div slot="title">Are you sure?</div>
		<div class="px-6 py-3">
			By deleting this Location (ID: {$page.params.location_id}), it will also delete:
			<ul class="list-disc ml-5">
				<li>The Location</li>
				<li>All Permissions for YOU and the people that you gave permissions to view it as well</li>
				<li>All Devices within the location (Device data will remain)</li>
				<li>Device Locations within this location</li>
			</ul>
			<p class="my-4">To Confirm Deletion, please enter the location ID below:</p>
			<TextField
				bind:value
				id="location_id"
				name="location_id"
				label="Please enter the location ID"
				placeholder={$page.params.location_id}
				error
			/>
		</div>
		<div slot="actions" class="flex flex-row justify-between">
			<Button
				type="button"
				disabled={value != $page.params.location_id}
				on:click={() => {
					console.log('Deleting item...');
					deleteLocation($page.params.location_id);
				}}
				variant="fill"
				color="danger"
			>
				{#if value == $page.params.location_id}<Icon data={mdiAlert} />{/if}
				Yes, delete item
			</Button>
			<Button>Cancel</Button>
		</div>
	</Dialog>
</Toggle>
