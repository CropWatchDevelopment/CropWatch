<script lang="ts">
	import {
		CwButton,
		CwCard,
		CwDataTable,
		type CwColumnDef,
		type CwTableQuery,
		type CwTableResult
	} from '@cropwatchdevelopment/cwui';
	import type { LocationDto } from '$lib/api/api.service';
	import EYE_ICON from '$lib/images/icons/eye.svg';
	import { goto } from '$app/navigation';

	let { data }: { data: { allLocations: LocationDto[] } } = $props();

	let loading = $state(false);

	const columns: CwColumnDef<LocationDto>[] = [
		{ key: 'location_id', header: 'ID', hideBelow: 'md' },
		{ key: 'name', header: 'Location', sortable: true }
	];

	async function loadData(query: CwTableQuery): Promise<CwTableResult<LocationDto>> {
		loading = true;
		try {
			void query;
			return {
				rows: data.allLocations,
				total: data.allLocations.length
			};
		} finally {
			loading = false;
		}
	}

	function handleViewLocation(row: LocationDto) {
		const query = new URLSearchParams({
			location_id: String(row.location_id),
			location_name: row.name
		});
		window.location.assign(`/locations/${row.location_id}?${query.toString()}`);
	}
</script>

<div class="locations-page overflow-y-scroll">
	<CwCard title="All Locations" subtitle="Aggregated from current device telemetry" elevated>
		<CwDataTable
			{columns}
			{loadData}
			{loading}
			rowKey="location_id"
			searchable
			pageSize={10}
			rowActionsHeader="Actions"
		>
			{#snippet toolbarActions()}
				<CwButton variant="primary" onclick={() => goto('/locations/create')}>Add Location</CwButton>
			{/snippet}

			{#snippet rowActions(row: LocationDto)}
				<CwButton size="md" variant="info" onclick={() => handleViewLocation(row)}>
					<img src={EYE_ICON} alt="View" />
				</CwButton>
			{/snippet}
		</CwDataTable>
	</CwCard>
</div>

<style>
	.locations-page {
		padding: 1rem;
	}
</style>
