<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabaseClient';
	import { mdiMinus, mdiPlus } from '@mdi/js';
	import { Button, Dialog, Icon, Input, SelectField, TextField } from 'svelte-ux';

	$: getAllDeviceTypes = async () => {
		const { data, error } = await supabase.from('cw_device_type').select('*');
		if (error) {
			return [];
		}
		const response = data.map((t) => {
			return { label: t.name, value: t.id };
		});
		return response;
	};

	$: allDeviceTypes = getAllDeviceTypes();

	let open: boolean = false;
	let numberValue: number = 0;

	async function handleSubmit(event: Event) {
		const data = new FormData(event.currentTarget);

		const response = await fetch(event.currentTarget.action, {
			method: 'POST',
			body: data
		});
		if (response.status === 200) {
			// TOAST!
			console.log('SUCCESS!', await response.json());
		}
	}
</script>

<Button variant="fill" icon={mdiPlus} on:click={() => (open = true)}>Add Device</Button>
<Dialog bind:open persistent={true}>
	<div slot="title" class="p-4">
		<Icon data={mdiPlus} />
		Add a new Device
	</div>
	<form
		class="grid gap-2 p-4"
		method="post"
		action="/api/add-device"
		on:submit|preventDefault={handleSubmit}
	>
		<h2>Device Details</h2>
		<input type="hidden" id="location_id" name="location_id" value={$page.params.location_id} />
		<TextField name="name" label="Device Name" />
		<TextField name="dev_eui" label="Device EUI (dev_eui)" />

		{#await allDeviceTypes}
			loading...
		{:then devices}
			<SelectField
				name="type"
				label="Device Type"
				options={devices}
				on:change={(e) => console.log('on:change', e.detail)}
			/>
		{/await}
		<TextField
			name="intraval"
			label="Device Send Frequency (-1 = unknown)"
			type="integer"
			bind:value={numberValue}
			align="center"
			class="w-full"
		>
			<div slot="prepend" class="flex">
				<Button
					variant="fill-light"
					icon={mdiMinus}
					on:click={() => (numberValue -= 1)}
					size="sm"
				/>
			</div>
			<div slot="append" class="flex">
				<Button variant="fill-light" icon={mdiPlus} on:click={() => (numberValue += 1)} size="sm" />
			</div>
		</TextField>
		<div class="grid grid-flow-col gap-2">
			<TextField name="lat" label="Latitude" />
			<TextField name="long" label="Longitude" />
		</div>
		<Button variant="fill" color="primary" type="submit">Save</Button>
	</form>
	<div slot="actions">
		<Button variant="fill" color="primary" type="button">Close</Button>
	</div>
</Dialog>
