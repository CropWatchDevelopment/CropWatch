<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { CwDataTable } from '@cropwatchdevelopment/cwui';
	import type { CwColumnDef, CwTableQuery, CwTableResult } from '@cropwatchdevelopment/cwui';
	import { ApiService } from '$lib/api/api.service';
	import type { DashboardRow } from '$lib/api/api.dtos';
	import { getAppContext } from '$lib/appContext.svelte';
	import { formatSensorValue, labelFor } from '$lib/sensor-labels';
	import { m } from '$lib/paraglide/messages.js';

	interface Filters {
		group: string;
		locationGroup: string;
		location: string;
		name: string;
	}

	let { filters }: { filters: Filters } = $props();

	const app = getAppContext();

	function renderPrimary(row: DashboardRow): string {
		const col = row.device_type.primary_data_v2;
		if (!col || col === '-') return '—';
		const def = labelFor(col);
		const v = formatSensorValue(row.latest?.primary, def.format);
		return `${def.label()}: ${v.display}${def.unit ? ` ${def.unit}` : ''}`;
	}

	function renderSecondary(row: DashboardRow): string {
		const col = row.device_type.secondary_data_v2;
		if (!col || col === '' || col === '-') return '—';
		const def = labelFor(col);
		const v = formatSensorValue(row.latest?.secondary, def.format);
		return `${def.label()}: ${v.display}${def.unit ? ` ${def.unit}` : ''}`;
	}

	const columns: CwColumnDef<DashboardRow>[] = [
		{ key: 'name', header: m.dashboard_column_name(), cell: (row) => row.name },
		{
			key: 'location',
			header: m.dashboard_column_location(),
			cell: (row) => row.location?.name ?? '—'
		},
		{
			key: 'group',
			header: m.dashboard_column_group(),
			cell: (row) => row.group ?? '—',
			hideBelow: 'md'
		},
		{ key: 'primary', header: m.dashboard_column_primary(), cell: renderPrimary },
		{
			key: 'secondary',
			header: m.dashboard_column_secondary(),
			cell: renderSecondary,
			hideBelow: 'sm'
		},
		{
			key: 'last_updated',
			header: m.dashboard_column_last_updated(),
			cell: (row) =>
				row.last_data_updated_at ? new Date(row.last_data_updated_at).toLocaleString() : '—',
			hideBelow: 'lg'
		}
	];

	async function loadData(query: CwTableQuery): Promise<CwTableResult<DashboardRow>> {
		const api = new ApiService({ authToken: app.accessToken });
		const skip = (query.page - 1) * query.pageSize;
		const page = await api.getDashboardDevices(
			{
				skip,
				take: query.pageSize,
				group: filters.group || undefined,
				locationGroup: filters.locationGroup || undefined,
				location: filters.location || undefined,
				name: query.search?.trim() || filters.name || undefined
			},
			{ signal: query.signal }
		);
		return { rows: page.rows, total: page.total };
	}
</script>

<CwDataTable
	{columns}
	{loadData}
	rowKey="dev_eui"
	fillParent
	pageSize={25}
	pageSizeOptions={[25, 50, 100]}
	searchable
	onRowClick={(row) => {
		if (row.location?.location_id != null) {
			goto(resolve(`/locations/${row.location.location_id}/devices/${row.dev_eui}`));
		}
	}}
/>
