<script lang="ts">
	import {
		CwButton,
		CwCard,
		CwDataTable,
		useCwToast,
		type CwColumnDef,
		type CwTableQuery,
		type CwTableResult
	} from '@cropwatchdevelopment/cwui';
	import type { LocationDto } from '$lib/api/api.service';
	import EYE_ICON from '$lib/images/icons/eye.svg';

	let { data }: { data: { allLocations: LocationDto[] } } = $props();

	const toast = useCwToast();
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

	function handleAddLocation() {
		toast.add({
			tone: 'info',
			message: 'Add Location clicked. Wire this to your create-location flow.'
		});
	}

	function handleViewLocation(row: LocationDto) {
		const query = new URLSearchParams({
			location_id: String(row.location_id),
			location_name: row.name
		});
		window.location.assign(`/locations/${row.location_id}`);
	}
</script>

<div class="locations-page">
	<CwCard title="All Locations" subtitle="Aggregated from current device telemetry" elevated>
		<CwDataTable
				{columns}
				{loadData}
				{loading}
				rowKey="location_id"
				searchable
				pageSize={10}
			>
				{#snippet toolbarActions()}
					<CwButton variant="primary" onclick={handleAddLocation}>Add Location</CwButton>
				{/snippet}

					{#snippet rowActions(row: LocationDto)}
						<CwButton size="sm" variant="info" onclick={() => handleViewLocation(row)}>
							<img src={EYE_ICON} />
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
