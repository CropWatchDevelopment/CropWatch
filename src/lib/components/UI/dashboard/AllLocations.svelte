<script lang="ts">
	import type { SupabaseClient } from '@supabase/supabase-js';
	import DashboardCard from './DashboardCard.svelte';
	import DeviceCard from './DeviceCard.svelte';
	import { DateTime } from 'luxon';

	let { locations = [], supabase } = $props<{
		locations: any[] | null;
		supabase: SupabaseClient;
	}>();
</script>

<div class="device-cards-grid p-3">
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
				class=""
			>
				{#snippet content()}
					{#each location.cw_devices as device}
						<DeviceCard
							{device}
							isActive={Math.abs(
								DateTime.fromJSDate(
									device.last_data_updated_at instanceof Date
										? device.last_data_updated_at
										: new Date(device.last_data_updated_at)
								).diffNow('minutes').minutes
							) <= device.upload_interval}
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
		width: 100%;
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(4, 1fr); /* always 4 across on large screens */
	}

	/* Make it responsive on smaller screens */
	@media (max-width: 1024px) {
		.device-cards-grid {
			grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		}
	}
</style>
