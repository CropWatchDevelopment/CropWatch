<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import DarkCard from '$lib/components/ui/DarkCard.svelte';
	import DarkCard2 from '$lib/components/ui/DarkCard2.svelte';
	import { deviceDataStore } from '$lib/stores/deviceData.store';
	import { dataTableToDeviceImage } from '$lib/utilities/dataTableToDeviceImage';
	import { mdiCog, mdiEye, mdiLock, mdiMagnify, mdiMapMarker, mdiSort } from '@mdi/js';
	import { Avatar, Button, Icon, ListItem, SelectField, TextField, Tooltip } from 'svelte-ux';
	import { writable } from 'svelte/store';

	let allDevices = [];
	let allLocations = [];
	let searchQuery = writable('');
	let sortBy = writable('');

	if (browser) {
		fetch(`/api/v1/devices`)
			.then((res) => res.json())
			.then((data) => {
				allDevices = data;
			})
			.catch((err) => {
				console.error(err);
			});
	}

	function sortDevices(criteria) {
		sortBy.set(criteria);
	}

	// Reactive filtered and sorted devices array
	$: filteredDevices = allDevices
		.filter((device) => {
			const query = ($searchQuery || '').toLowerCase();
			return (
				device.cw_devices?.name.toLowerCase().includes(query) ||
				device.dev_eui.toLowerCase().includes(query)
			);
		})
		.sort((a, b) => {
			const criteria = $sortBy;
			if (!criteria) return 0;
			if (criteria === 'type') {
				return a.cw_devices.cw_device_type.name.localeCompare(b.cw_devices.cw_device_type.name);
			} else if (criteria === 'name') {
				return a.cw_devices.name.localeCompare(b.cw_devices.name);
			} else if (criteria === 'location') {
				const locA = a.cw_devices.cw_device_locations?.cw_locations?.name || '';
				const locB = b.cw_devices.cw_device_locations?.cw_locations?.name || '';
				return locA.localeCompare(locB);
			}
			return 0;
		});
</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="CropWatch" />
</svelte:head>

<DarkCard title="All Devices">
	<DarkCard2>
		<div class="grid lg:grid-flow-col gap-2">
			<TextField placeholder="Device name Search (optional)" bind:value={$searchQuery}>
				<div slot="prepend">
					<Icon data={mdiMagnify} class="text-surface-content/50 mr-2" />
				</div>
			</TextField>
			<SelectField
				placeholder="Device Location (optional)"
				options={allLocations}
				on:change={(e) => console.log('on:change', e.detail)}
				icon={mdiMapMarker}
			/>
		</div>
		<div>
			<Button on:click={() => sortDevices('type')} variant="default" icon={mdiSort}>
				Sort By Type
			</Button>
			<Button on:click={() => sortDevices('name')} variant="default" icon={mdiSort}>
				Sort By Name
			</Button>
			<Button on:click={() => sortDevices('location')} variant="default" icon={mdiSort}>
				Sort By Location
			</Button>
		</div>
	</DarkCard2>
	<ul class="grid gap-2 mx-2">
		{#each filteredDevices as device}
			{#if device.cw_devices}
				<ListItem
					title={device.cw_devices.name}
					subheading={`${device.cw_devices.cw_device_locations?.cw_locations?.name ? ` ${device.cw_devices.cw_device_locations.cw_locations.name}` : 'No Location'}`}
					avatar={{ class: 'bg-surface-content/50 text-surface-100/90' }}
				>
					<div slot="avatar">
						<Tooltip title="DEV EUI: {device.dev_eui}" placement="bottom">
							<Avatar>
								<img class="w-1/2" alt="DEV Img" src={dataTableToDeviceImage(device.cw_devices.cw_device_type.data_table)} />
							</Avatar>
						</Tooltip>
					</div>
					<div slot="actions" class="grid grid-flow-col gap-4 border-l-2 border-b-slate-800 pl-4">
						<Button on:click={() => goto(`/app/devices/${device.dev_eui}/data`)} variant="none" icon={mdiEye} />
						<Button on:click={() => goto(`/app/devices/${device.dev_eui}/permissions`)} variant="none" icon={mdiLock} />
						<Button on:click={() => goto(`/app/devices/${device.dev_eui}/settings`)} variant="none" icon={mdiCog} />
					</div>
				</ListItem>
			{/if}
		{/each}
	</ul>
</DarkCard>
