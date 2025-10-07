<script lang="ts">
	import type { Device } from '$lib/models/Device';
	import { DateTime } from 'luxon';
	import DataRowItem from './DataRowItem.svelte';
	import DeviceDataList from './DeviceDataList.svelte';

	// Match the DeviceWithLatestData interface from DataRowItem
	interface DeviceWithLatestData extends Device {
		latestData: Record<string, any>;
		cw_device_type: {
			name: string;
			default_upload_interval?: number;
			primary_data_notation?: string;
			secondary_data_notation?: string;
			primary_data_v2?: string | undefined;
			secondary_data_v2?: string | undefined;
		};
	}

	let { device, locationId } = $props<{
		device: DeviceWithLatestData;
		locationId: number;
	}>();

	let isActive = $derived(
		Math.abs(
			DateTime.fromJSDate(
				device.last_data_updated_at instanceof Date
					? device.last_data_updated_at
					: new Date(device.last_data_updated_at)
			).diffNow('minutes').minutes
		) <= device.upload_interval
	);
</script>

{device.last_data_updated_at}
<DataRowItem
	{device}
	{isActive}
	detailHref={`/dashboard/location/${locationId}/device/${device.dev_eui}`}
>
	{#snippet children()}
		{#if !device.upload_interval === null && device.upload_interval <= 0}
			<div class="invalid-interval-warning">Device has invalid upload interval</div>
		{/if}
		<DeviceDataList {device} />
	{/snippet}
</DataRowItem>

<style>
	.invalid-interval-warning {
		color: #ff3333;
		font-size: 0.75rem;
		padding: 0 0.5rem;
		margin-bottom: 0.25rem;
	}
</style>
