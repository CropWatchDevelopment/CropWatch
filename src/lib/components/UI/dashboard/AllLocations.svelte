<script lang="ts">
	import type { SupabaseClient } from '@supabase/supabase-js';
	import DashboardCard from './DashboardCard.svelte';
	import DeviceCard from './DeviceCard.svelte';
	import { DateTime } from 'luxon';

	let { locations = [], supabase } = $props<{
		locations: any[] | null;
		supabase: SupabaseClient;
	}>();

	// const loadLatestData = async (device: any) => {
	// 	const dataTable = device.cw_device_type.data_table_v2;
	// 	const { data, error } = await supabase
	// 		.from(dataTable)
	// 		.select('*')
	// 		.eq('dev_eui', device.dev_eui)
	// 		.order('created_at', { ascending: false })
	// 		.limit(1)
	// 		.maybeSingle();
	// 	if (error) {
	// 		console.error('Error loading latest data:', error);
	// 		return null;
	// 	}
	// 	device.latestData = data || null;
	// 	return data || null;
	// };
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
					{#each location.cw_devices as device}
						<DeviceCard
							{device}
							isActive={device.latestData !== null &&
								DateTime.fromISO(device.latestData.created_at).diffNow('minutes').minutes <=
									((device.upload_interval && device.upload_interval > 0
										? device.upload_interval
										: device.cw_device_type?.default_upload_interval) || 15)}
							locationId={location.location_id}
						/>
					{/each}
				{/snippet}
			</DashboardCard>
		{/each}
	{/if}
</div>

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
