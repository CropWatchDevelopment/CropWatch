<script lang="ts">
	import { goto } from '$app/navigation';
	import { CwDataTable } from '@cropwatchdevelopment/cwui';
	import type { CwColumnDef, CwTableQuery, CwTableResult } from '@cropwatchdevelopment/cwui';
	import { cwDataTableLabels } from '$lib/i18n/cwuiLabels';
	import { ApiService } from '$lib/api/api.service';
	import type { DashboardRow } from '$lib/api/api.dtos';
	import { getAppContext } from '$lib/appContext.svelte';
	import { formatSensorValue, labelFor } from '$lib/sensor-labels';
	import { m } from '$lib/paraglide/messages.js';
	import { onAppForeground } from '$lib/utils/onAppForeground';

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
				name: filters.name || undefined
			},
			{ signal: query.signal }
		);
		return { rows: page.rows, total: page.total };
	}

	// Bumped whenever the user returns to the tab/app, to force a fresh pull so
	// devices that went stale in the background don't show as false offline.
	let refreshToken = $state(0);
	$effect(() => onAppForeground(() => (refreshToken += 1)));

	// Mapped into CwDataTable's `Record<string, string[]>` filter shape so the
	// table re-runs `loadData` whenever the dashboard filters (incl. the search
	// box) or the refresh token change. The actual filter values are read from
	// `filters` inside `loadData`; `_refresh` only exists to trigger a reload.
	const tableFilters = $derived({
		group: filters.group ? [filters.group] : [],
		locationGroup: filters.locationGroup ? [filters.locationGroup] : [],
		location: filters.location ? [filters.location] : [],
		name: filters.name ? [filters.name] : [],
		_refresh: [String(refreshToken)]
	});
</script>

<CwDataTable labels={cwDataTableLabels()}
	{columns}
	{loadData}
	filters={tableFilters}
	rowKey="dev_eui"
	searchable={false}
	fillParent
	pageSize={25}
	pageSizeOptions={[25, 50, 100]}
	onRowClick={(row) => {
		if (row.location?.location_id != null) {
			// Carry the originating page (and active group filter) so the device
			// page's back button can return to the filtered dashboard.
			const params = new URLSearchParams({ backTo: '/' });
			if (filters.locationGroup) params.set('filter', filters.locationGroup);
			goto(`/locations/${row.location.location_id}/devices/${row.dev_eui}?${params.toString()}`);
		}
	}}
/>
