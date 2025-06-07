<script lang="ts">
	import type { Device } from '$lib/models/Device';
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

	let { device, isActive, locationId } = $props<{
		device: DeviceWithLatestData;
		isActive: boolean;
		locationId: number;
	}>()
</script>

<DataRowItem
	{device}
	{isActive}
	detailHref={`/dashboard/location/${locationId}/device/${device.dev_eui}`}
>
	{#snippet children()}
		<DeviceDataList
			device={{
				...device,
				latestData: device.latestData || {},
				cw_device_type: {
					name: device.cw_device_type?.name || 'Unknown',
					default_upload_interval: device.cw_device_type?.default_upload_interval || 10,
					primary_data_notation: device.cw_device_type?.primary_data_notation,
					secondary_data_notation: device.cw_device_type?.secondary_data_notation || undefined,
					primary_data_v2: device.cw_device_type?.primary_data_v2 || undefined,
					secondary_data_v2: device.cw_device_type?.secondary_data_v2 || undefined
				}
			}}
			{isActive}
		/>
	{/snippet}
</DataRowItem>
