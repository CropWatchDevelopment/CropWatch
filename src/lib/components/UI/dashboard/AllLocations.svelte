<script lang="ts">
	import DashboardCard from './DashboardCard.svelte';
	import DeviceCard from './DeviceCard.svelte';

	let { data, locations, supabase } = $props();
	let latestData = $state<any>(null);

	const loadLatestData = async (device: any) => {
		console.log(device);
		const dataTable = device.cw_device_type.data_table_v2;
		const { data, error } = await supabase
			.from(dataTable)
			.select('*')
			.eq('dev_eui', device.dev_eui)
			.order('created_at', { ascending: false })
			.limit(1)
			.maybeSingle();
		if (error) {
			console.error('Error loading latest data:', error);
			return null;
		}
		latestData = data || null;
		return data || null;
	};
</script>

<div class="device-cards-grid">
	{#if locations.length === 0}
		<div class="no-results">
			<p>No locations match your search criteria.</p>
		</div>
	{:else}
		{#each locations as location}
			<DashboardCard
				{location}
				href={`/app/dashboard/location/${location.location_id}`}
				activeDevices={[]}
				allActive={true}
				allInactive={false}
				loading={false}
			>
				{#snippet content()}
					{@const locationDevices = location.cw_devices ?? []}
					{#each locationDevices as device}
						{@const formattedDevice = {
							...device,
							latestData: loadLatestData(device) || {},
							cw_device_type: {
								name: device.cw_device_type?.name || 'Unknown',
								default_upload_interval: device.cw_device_type?.default_upload_interval || 15,
								primary_data_notation: device.cw_device_type?.primary_data_notation || '',
								secondary_data_notation:
									device.cw_device_type?.secondary_data_notation || undefined,
								primary_data_v2: device.cw_device_type?.primary_data_v2 || undefined,
								secondary_data_v2: device.cw_device_type?.secondary_data_v2 || undefined,
								data_table_v2: device.cw_device_type?.data_table_v2 || 'device_data'
							}
						}}

						<DeviceCard
							{latestData}
							device={formattedDevice}
							isActive={true}
							locationId={location.location_id}
						/>
					{/each}
				{/snippet}
			</DashboardCard>
		{/each}
	{/if}
</div>

<!-- 
<div class="device-cards-grid {getContainerClass(uiStore.dashboardViewType)}">
	{#if filteredLocations.length === 0}
		<div class="no-results">
			<p>No locations match your search criteria.</p>
		</div>
	{:else}
		{#each filteredLocations as location (location.location_id)}
			{@const hasNullStatus = (location.cw_devices ?? []).some(
				(d: DeviceWithSensorData) => deviceActiveStatus[d.dev_eui] === null
			)}
			{@const activeDevices = (location.cw_devices ?? []).filter((d: DeviceWithSensorData) =>
				isDeviceActive(d, deviceActiveStatus)
			)}
			{@const allActive =
				(location.cw_devices?.length ?? 0) > 0 &&
				activeDevices.length === (location.cw_devices?.length ?? 0)}
			{@const allInactive = (location.cw_devices?.length ?? 0) > 0 && activeDevices.length === 0}
			<DashboardCard
				{location}
				href={`/app/dashboard/location/${location.location_id}`}
				{activeDevices}
				{allActive}
				{allInactive}
				loading={hasNullStatus}
			>
				{#snippet content()}
					{@const locationDevices = location.cw_devices ?? []}
					{@const dragHandlers = createDragHandlers(
						locationDevices,
						(newDevices) => {
							// Save the new order to localStorage
							const deviceOrder = newDevices.map((device) => device.dev_eui);
							saveDeviceOrder(location.location_id, deviceOrder);

							if (onDeviceReorder) {
								onDeviceReorder(location.location_id, newDevices);
							}
						},
						getDragState(location.location_id),
						(newState) => updateDragState(location.location_id, newState)
					)}
					{#each locationDevices as device, index (device.dev_eui)}
						{@const isActive = isDeviceActive(device, deviceActiveStatus)}
						{@const formattedDevice = {
							...device,
							latestData: device.latestData || {},
							cw_device_type: {
								name: device.cw_device_type?.name || 'Unknown',
								default_upload_interval: device.cw_device_type?.default_upload_interval || 10,
								primary_data_notation: device.cw_device_type?.primary_data_notation || '',
								secondary_data_notation:
									device.cw_device_type?.secondary_data_notation || undefined,
								primary_data_v2: device.cw_device_type?.primary_data_v2 || undefined,
								secondary_data_v2: device.cw_device_type?.secondary_data_v2 || undefined
							}
						}}
						<DeviceCard
							device={formattedDevice}
							{isActive}
							locationId={location.location_id}
							dragEnabled={enableDragAndDrop}
							dragIndex={index}
							isDragging={getDragState(location.location_id).draggedIndex === index}
							isDropTarget={getDragState(location.location_id).dropTargetIndex === index}
							onDragStart={dragHandlers.handleDragStart}
							onDragEnd={dragHandlers.handleDragEnd}
							onDragOver={dragHandlers.handleDragOver}
							onDrop={dragHandlers.handleDrop}
						/>
					{/each}
				{/snippet}
			</DashboardCard>
		{/each}
	{/if}
</div> -->

<style>
	.no-results {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 100%;
		padding: 2rem;
		background-color: var(--color-card);
		border-radius: 0.5rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.no-results p {
		color: var(--color-text-secondary);
		font-size: 1rem;
	}

	.device-cards-grid {
		/* Base styles that apply to all view modes */
		width: 100%;
		min-width: 250px;
		margin: 0; /* Remove auto margin to align left */
	}
</style>
