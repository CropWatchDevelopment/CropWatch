<script lang="ts">
	import { mdiDevices, mdiDotsVertical, mdiMagnify, mdiPlus } from '@mdi/js';
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

	export let devices = [];
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
		<TextField label="Search" icon={mdiMagnify} />
		<div class="border-y p-1 my-4">
			<ol class="flex flex-col gap-4 my-4">
				{#each devices as device}
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
		<div class="grid grid-flow-row">
			<AddDevice />
			<Button size="sm" on:click={() => (group = [])}>clear</Button>
		</div>
	</div>
</Card>
