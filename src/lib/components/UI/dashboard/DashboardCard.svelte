<script lang="ts">
	import DataRowItem from './DataRowItem.svelte';
	import { Avatar, Button, Icon } from 'svelte-ux';
	import { goto } from '$app/navigation';
	import { mdiAlert, mdiArrowRight, mdiCheck, mdiClose } from '@mdi/js';
	import type { ILocation } from '$lib/interfaces/ILocation.interface';
	import moment from 'moment';

	let {
		location
	}: {
		location: ILocation;
	} = $props();
	let activeDevices = $derived(
		location.cw_devices
			.map((device) => {
				if (device.cw_device_type.default_upload_interval === -1) return true;
				const dev =
					moment().diff(moment(device.latest_data?.created_at), 'minutes', false) <
					device.cw_device_type.default_upload_interval;
				return dev;
			})
			.filter(Boolean).length
	);
</script>

<div>
	<div class="border-[rgb(121 121 121)] rounded-2xl border-[0.1em] bg-slate-500 p-0.5">
		<div
			class="custom-bg rounded-4xl relative h-20 w-full bg-cover bg-bottom bg-no-repeat p-1 bg-blend-overlay"
		>
			<div
				class="absolute right-0 top-0 flex h-full w-1/2 items-center justify-center rounded-2xl"
			></div>
			<Avatar
				size="lg"
				class="absolute top-3 flex flex-row {activeDevices == location.cw_devices.length
					? 'bg-success'
					: 'bg-warning'}{activeDevices === 0 ? ' bg-danger-500' : ''} rounded-full"
			>
				{#if activeDevices === location.cw_devices.length}
					<Icon class="absolute text-3xl text-white" path={mdiCheck} />
				{:else if activeDevices > 0}
					<Icon class="absolute text-3xl text-white" path={mdiAlert} />
				{:else if activeDevices === 0}
					<Icon class="absolute text-3xl text-white" path={mdiClose} />
				{/if}
			</Avatar>
		</div>
	</div>
</div>

<h2
	class="my-3 flex flex-row items-center overflow-hidden text-ellipsis text-xl"
>
	<p>{location.name}</p>
	<span class="flex flex-grow"></span>
	<!-- COMING BACK SOON!!!-->
	<Button
		variant="fill"
		color="primary"
		icon={mdiArrowRight}
		on:click={() => goto(`/app/location/${location.location_id}`)}
	/>
</h2>
<div class="flex flex-col gap-1 px-1 pb-4 text-sm text-primary-text">
	{#if location.cw_devices.length === 0}
		<p>No devices found</p>
	{:else}
		{#each location.cw_devices as device}
			<DataRowItem {device} />
		{/each}
	{/if}
</div>

<style>
	.custom-bg {
		position: relative;
		overflow: hidden;
	}
	.custom-bg::before {
		content: ' ';
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: #4e7dd6;
		background-image:
			linear-gradient(
				30deg,
				#4676c8 12%,
				transparent 12.5%,
				transparent 87%,
				#4676c8 87.5%,
				#4676c8
			),
			linear-gradient(
				150deg,
				#4676c8 12%,
				transparent 12.5%,
				transparent 87%,
				#4676c8 87.5%,
				#4676c8
			),
			linear-gradient(
				30deg,
				#4676c8 12%,
				transparent 12.5%,
				transparent 87%,
				#4676c8 87.5%,
				#4676c8
			),
			linear-gradient(
				150deg,
				#4676c8 12%,
				transparent 12.5%,
				transparent 87%,
				#4676c8 87.5%,
				#4676c8
			),
			linear-gradient(60deg, #4d86e8 25%, transparent 25.5%, transparent 75%, #4d86e8 75%, #4d86e8),
			linear-gradient(60deg, #4d86e8 25%, transparent 25.5%, transparent 75%, #4d86e8 75%, #4d86e8);
		background-size: 40px 70px;
		background-position:
			0 0,
			0 0,
			20px 35px,
			20px 35px,
			0 0,
			20px 35px;
		border-radius: 15px;
		opacity: 0.9; /* Increased from 0.7 to make the pattern more visible */
	}
</style>
