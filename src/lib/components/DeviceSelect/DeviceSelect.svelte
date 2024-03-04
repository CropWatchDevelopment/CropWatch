<script lang="ts">
	import {
		mdiCloseCircleOutline,
		mdiCompare,
		mdiDevices,
		mdiDotsVertical,
		mdiMagnify,
		mdiPlus
	} from '@mdi/js';
	import {
		Avatar,
		Button,
		Card,
		Checkbox,
		Header,
		Icon,
		Menu,
		MenuItem,
		TextField,
		Toggle
	} from 'svelte-ux';
	import AddDevice from '../AddDevice/AddDevice.svelte';
	import { Tooltip } from 'layerchart';

	export let devices = [];
	$: devicesView = devices;
	let value: string = '';
	let group = [];
</script>

<Card class="col-span-12 lg:col-span-4">
	<Header title="Device Quick View" slot="header">
		<div slot="avatar">
			<Avatar class="bg-accent-500 text-white font-bold mr-4">
				<Icon data={mdiDevices} />
			</Avatar>
		</div>
		<div slot="actions">
			<Toggle let:on={open} let:toggle>
				<Button icon={mdiDotsVertical} on:click={toggle}>
					<Menu {open} on:close={toggle}>
						<MenuItem icon={mdiPlus}>Add Device</MenuItem>
					</Menu>
				</Button>
			</Toggle>
		</div>
	</Header>
	<div slot="contents" class="flex flex-col max-h-[360px] overflow-auto">
		<TextField
			label="Search"
			bind:value
			on:change={(e) => {
				e.detail.value == null
					? (devicesView = devices)
					: (devicesView = devices.filter((d) => d.cw_devices.name.includes(e.detail.value)));
			}}
			icon={mdiMagnify}
		>
			<span slot="append">
				<Button
					icon={mdiCloseCircleOutline}
					on:click={() => {
						value = '';
						devicesView = devices;
					}}
					class="text-surface-content/50 p-2"
				/>
			</span>
		</TextField>
		<div class="border-y p-1 my-4">
			<ol class="flex flex-col gap-4 my-4">
				{#each devicesView as device}
					<Checkbox
						bind:group
						value={device.dev_eui}
						disabled={group.length == 0
							? false
							: device.cw_devices.type !=
								devices.find((d) => d.dev_eui == group[0]).cw_devices.type}
					>
						{device.cw_devices.name}
					</Checkbox>
				{/each}
			</ol>
		</div>
		<div class="flex flex-row gap-3">
			<AddDevice />
			<span class="flex flex-1" />
			<Button variant="outline" classes={{ root: 'justify-end' }} on:click={() => (group = [])}
				>clear</Button
			>
            
			<Button
				variant="outline"
				classes={{ root: 'justify-end' }}
				on:click={() => {}}
                disabled={group.length < 2}
				icon={mdiCompare}>Compare</Button
			>
		</div>
	</div>
</Card>
