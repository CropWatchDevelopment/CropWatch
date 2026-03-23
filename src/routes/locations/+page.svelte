<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
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
	import { m } from '$lib/paraglide/messages.js';
	import ADD_ICON from '$lib/images/icons/add.svg';

	let { data }: { data: { allLocations: LocationDto[] } } = $props();

	let loading = $state(false);

	const columns: CwColumnDef<LocationDto>[] = [
		{ key: 'location_id', header: 'ID', hideBelow: 'md' },
		{ key: 'name', header: m.nav_locations(), sortable: true }
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

<CwButton variant="secondary" class="mt-2" onclick={() => goto('/')}>
	&larr; {m.action_back_to_dashboard()}
</CwButton>
<div class="locations-page overflow-y-scroll">
	<CwCard title={m.locations_all_title()} subtitle={m.locations_all_subtitle()} elevated>
		<CwDataTable
			{columns}
			{loadData}
			{loading}
			rowKey="location_id"
			groupBy="group"
			searchable
			pageSize={10}
			rowActionsHeader={m.common_actions()}
		>
			{#snippet toolbarActions()}
				<CwButton variant="primary" onclick={() => goto('/locations/create')}>
					<Icon src={ADD_ICON} alt={m.locations_create_title()} />
				</CwButton>
			{/snippet}

			{#snippet rowActions(row: LocationDto)}
				<CwButton size="md" variant="info" onclick={() => handleViewLocation(row)}>
					<Icon src={EYE_ICON} alt={m.action_view()} />
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
