<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Back from '$lib/components/ui/Back.svelte';
	import DarkCard from '$lib/components/ui/DarkCard.svelte';
	import {
		mdiArrowExpandHorizontal,
		mdiArrowExpandVertical,
		mdiMapMarker,
		mdiMinus,
		mdiPlus
	} from '@mdi/js';
	import { toast } from '@zerodevx/svelte-toast';
	import { onMount } from 'svelte';
	import { Button, Field, Icon, Input, ProgressCircle, SelectField, TextField } from 'svelte-ux';

	let deviceTypes: Array<{ id: number; name: string }>;
	onMount(async () => {
		const response = await fetch('/api/v1/devices/types');
		deviceTypes = await response.json();
	});

	let dev_eui = '';
	let name = '';
	let type = ''; // This will hold the selected device type ID
	let upload_interval: number = 30;
	let lat: number = 0;
	let long: number = 0;
	let location_id: number = +$page.params.location_id;

	const submitForm = async () => {
		const formData = new FormData();
		formData.append('dev_eui', dev_eui);
		formData.append('name', name);
		formData.append('type', type); // Send the selected type ID
		formData.append('upload_interval', upload_interval);
		formData.append('lat', lat);
		formData.append('long', long);
		formData.append('location_id', location_id);

		try {
			const response = await fetch('/api/v1/devices', {
				method: 'POST',
				body: formData
			});

			if (!response.ok) {
				const error = await response.json();
				console.error('Error:', error);
				toast.push(`Failed to create device`, {
					theme: {
						'--toastBackground': 'red',
						'--toastColor': 'black'
					}
				});
			} else {
				const result = await response.json();
				console.log('Device added:', result);
				goto('/devices');
			}
		} catch (error) {
			console.error('Error:', error);
		}
	};
</script>

<div class="flex flex-row">
	<div class="flex flex-col w-full">
		<div class="flex flex-row text-neutral-content items-center">
			<Back>
				<span class="w-full inline-block flex-nowrap text-xl">
					<p class="text-slate-300">Add Device</p>
				</span>
			</Back>
		</div>
	</div>
</div>

<DarkCard title="Add a new Device">
	<form class="grid m-4 gap-4">
		<Field label="DEV EUI" let:id>
			<Input
				bind:value={dev_eui}
				mask="XX:XX:XX:XX:XX:XX:XX:XX"
				replace="X"
				accept="[dA-Fa-f1234567890]"
				required
			/>
		</Field>
		<TextField label="Device Name" bind:value={name} />
		{#if deviceTypes}
			<SelectField
				label="Device Type"
				on:change={(e) => {
					const default_search = deviceTypes.find((d) => d.id == e.detail.value);
					if (default_search) {
						upload_interval = default_search.default_upload_interval;
						type = e.detail.value;
					}
				}}
				options={deviceTypes.map((m) => {
					return { label: m.name, value: m.id };
				})}
			/>
		{:else}
			<ProgressCircle />
		{/if}
		<TextField
			label="Update Interval"
			type="integer"
			bind:value={upload_interval}
			align="center"
			class=""
		>
			<div slot="prepend" class="flex">
				<Button
					icon={mdiMinus}
					on:click={() => {
						upload_interval--;
					}}
					size="sm"
				/>
			</div>
			<div slot="append" class="flex">
				<Button icon={mdiPlus} on:click={() => upload_interval++} size="sm" />
			</div>
		</TextField>
		<TextField label="Device Latitude" bind:value={lat} required>
			<div slot="prepend">
				<Icon data={mdiMapMarker} class="text-surface-content/50 mr-2" />
			</div>
			<div slot="prefix">
				<Icon data={mdiArrowExpandHorizontal} size="1.1em" class="text-surface-content/50 -mt-1" />
			</div>
		</TextField>

		<TextField label="Device Latitude" bind:value={long} required>
			<div slot="prepend">
				<Icon data={mdiMapMarker} class="text-surface-content/50 mr-2" />
			</div>
			<div slot="prefix">
				<Icon data={mdiArrowExpandVertical} size="1.1em" class="text-surface-content/50 -mt-1" />
			</div>
		</TextField>

		<Button type="button" variant="fill-light" color="success" icon={mdiPlus} on:click={submitForm}>
			Add Device
		</Button>
	</form>
</DarkCard>
