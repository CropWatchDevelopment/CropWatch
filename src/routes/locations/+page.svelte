<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { AppPage } from '$lib/components/layout';
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
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages.js';
	import ADD_ICON from '$lib/images/icons/add.svg';
	import { getAppContext } from '$lib/appContext.svelte';
	import { ApiService } from '$lib/api/api.service';

	let loading = $state(false);
	let app = getAppContext();

	const columns: CwColumnDef<LocationDto>[] = [
		{ key: 'location_id', header: 'ID', hideBelow: 'md' },
		{ key: 'name', header: m.nav_locations(), sortable: true }
	];

	function sortLocations(
		rows: LocationDto[],
		column: string,
		direction: 'asc' | 'desc'
	): LocationDto[] {
		const dir = direction === 'asc' ? 1 : -1;
		return [...rows].sort((a, b) => {
			const aVal = (a as unknown as Record<string, unknown>)[column];
			const bVal = (b as unknown as Record<string, unknown>)[column];
			if (aVal == null && bVal == null) return 0;
			if (aVal == null) return dir;
			if (bVal == null) return -dir;
			if (column === 'location_id') return (Number(aVal) - Number(bVal)) * dir;
			return String(aVal).localeCompare(String(bVal)) * dir;
		});
	}

	async function loadData(query: CwTableQuery): Promise<CwTableResult<LocationDto>> {
		const search = query.search?.trim() || '';
		const api = new ApiService({ authToken: app.accessToken });
		const result = await api.getAllLocations({ name: search || undefined });
		let rows = result.data ?? [];

		if (query.sort) {
			rows = sortLocations(rows, query.sort.column, query.sort.direction);
		}

		const total = rows.length;
		const skip = (query.page - 1) * query.pageSize;
		rows = rows.slice(skip, skip + query.pageSize);

		loading = false;
		return { rows, total };
	}

	function handleViewLocation(row: LocationDto) {
		const query = new URLSearchParams({
			location_id: String(row.location_id),
			location_name: row.name
		});
		window.location.assign(`/locations/${row.location_id}?${query.toString()}`);
	}
</script>

<AppPage>
	<CwButton variant="ghost" size="sm" onclick={() => goto(resolve('/'))}>
		&larr; {m.action_back_to_dashboard()}
	</CwButton>

	<CwCard title={m.locations_all_title()} elevated>
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
				<CwButton variant="primary" onclick={() => goto(resolve('/locations/create'))}>
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
</AppPage>
