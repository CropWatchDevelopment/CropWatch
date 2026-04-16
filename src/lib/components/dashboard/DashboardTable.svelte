<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { DevicePrimaryDataDto } from '$lib/api/api.dtos';
	import { ApiService } from '$lib/api/api.service';
	import { AppNotice } from '$lib/components/layout';
	import {
		CwButton,
		CwCard,
		CwDataTable,
		CwDuration,
		CwSpinner,
		CwStatusDot,
		type CwColumnDef,
		type CwTableQuery,
		type CwTableResult
	} from '@cropwatchdevelopment/cwui';

	type DashboardFilters = {
		group: string;
		locationGroup: string;
		location: string;
	};

	type InitialTableState = {
		query: {
			page: number;
			pageSize: number;
			filters: Record<string, string[]>;
		};
		rows: DevicePrimaryDataDto[];
		total: number;
		error: string | null;
	};

	interface Props {
		authToken?: string | null;
		filters: DashboardFilters;
		initialTable: Promise<InitialTableState> | InitialTableState;
		onRefreshAll?: () => Promise<void>;
	}

	let { authToken = null, filters, initialTable, onRefreshAll }: Props = $props();

	const columns: CwColumnDef<DevicePrimaryDataDto>[] = [
		{ key: 'name', header: 'Device', sortable: true, width: '16rem' },
		{ key: 'group', header: 'Group', sortable: true, width: '10rem' },
		{ key: 'temperature_c', header: 'Temperature', sortable: true, width: '10rem' },
		{ key: 'humidity', header: 'Humidity', sortable: true, width: '10rem' },
		{ key: 'co2', header: 'CO₂', sortable: true, width: '9rem' },
		{ key: 'moisture', header: 'Soil Moisture', sortable: true, width: '12rem' },
		{ key: 'location_name', header: 'Location', sortable: true, width: '14rem' },
		{ key: 'created_at', header: 'Last Seen', sortable: true, width: '12rem', hideBelow: 'md' }
	];

	let initialTableConsumed = $state(false);
	let tableFilters = $derived.by(() => {
		const nextFilters: Record<string, string[]> = {};

		if (filters.group) {
			nextFilters.group = [filters.group];
		}

		if (filters.locationGroup) {
			nextFilters.locationGroup = [filters.locationGroup];
		}

		if (filters.location) {
			nextFilters.location = [filters.location];
		}

		return nextFilters;
	});

	function formatMetric(value: unknown): string {
		if (typeof value !== 'number' || !Number.isFinite(value)) {
			return '--';
		}

		const hasFraction = Math.abs(value % 1) > 0;
		return value.toLocaleString('en-US', {
			maximumFractionDigits: hasFraction ? 1 : 0,
			minimumFractionDigits: hasFraction ? 1 : 0
		});
	}

	function compareValues(left: unknown, right: unknown, direction: 'asc' | 'desc'): number {
		const order = direction === 'asc' ? 1 : -1;

		if (typeof left === 'number' && typeof right === 'number') {
			return (left - right) * order;
		}

		return (
			String(left ?? '').localeCompare(String(right ?? ''), undefined, {
				numeric: true,
				sensitivity: 'base'
			}) * order
		);
	}

	function sortRows(
		rows: DevicePrimaryDataDto[],
		sort: CwTableQuery['sort']
	): DevicePrimaryDataDto[] {
		if (!sort) {
			return rows;
		}

		return [...rows].sort((left, right) => {
			const leftValue =
				sort.column === 'created_at'
					? new Date(left.created_at).getTime()
					: (left as Record<string, unknown>)[sort.column];
			const rightValue =
				sort.column === 'created_at'
					? new Date(right.created_at).getTime()
					: (right as Record<string, unknown>)[sort.column];

			return compareValues(leftValue, rightValue, sort.direction);
		});
	}

	function buildQueryKey(query: {
		page: number;
		pageSize: number;
		search: string;
		sort: CwTableQuery['sort'];
		filters: Record<string, string[]>;
	}) {
		return JSON.stringify({
			page: query.page,
			pageSize: query.pageSize,
			search: query.search,
			sort: query.sort,
			filters: query.filters
		});
	}

	function buildInitialQueryKey(initialTableState: InitialTableState) {
		return buildQueryKey({
			page: initialTableState.query.page,
			pageSize: initialTableState.query.pageSize,
			search: '',
			sort: null,
			filters: initialTableState.query.filters
		});
	}

	async function loadData(
		query: CwTableQuery,
		initialTableState: InitialTableState
	): Promise<CwTableResult<DevicePrimaryDataDto>> {
		if (!authToken) {
			return { rows: [], total: 0 };
		}

		if (
			!initialTableConsumed &&
			buildQueryKey({
				page: query.page,
				pageSize: query.pageSize,
				search: query.search.trim(),
				sort: query.sort,
				filters: query.filters
			}) === buildInitialQueryKey(initialTableState)
		) {
			initialTableConsumed = true;
			return {
				rows: sortRows(initialTableState.rows, query.sort),
				total: initialTableState.total
			};
		}

		const api = new ApiService({ authToken });
		const result = await api.getLatestPrimaryDeviceData(
			{
				skip: (query.page - 1) * query.pageSize,
				take: query.pageSize,
				group: filters.group || undefined,
				locationGroup: filters.locationGroup || undefined,
				location: filters.location || undefined,
				name: query.search.trim() || undefined
			},
			{ signal: query.signal }
		);

		return {
			rows: sortRows(result.data ?? [], query.sort),
			total: typeof result.total === 'number' ? result.total : (result.data ?? []).length
		};
	}

	async function handleRefresh() {
		await onRefreshAll?.();
	}

	function openDevice(row: DevicePrimaryDataDto) {
		const locationId = Number(row.location_id);

		if (!row.dev_eui || !Number.isFinite(locationId) || locationId <= 0) {
			return;
		}

		void goto(
			resolve('/locations/[location_id]/devices/[dev_eui]', {
				location_id: String(locationId),
				dev_eui: row.dev_eui
			})
		);
	}
</script>

<div class="dashboard-table-card">
	<CwCard elevated>
		{#await initialTable}
			<CwSpinner
				size="md"
				showLabel
				label="Loading dashboard data..."
				class="dashboard-table-card__loading"
			/>
		{:then initialTableState}
			<CwDataTable
				{columns}
				loadData={(query) => loadData(query, initialTableState)}
				filters={tableFilters}
				rowKey="dev_eui"
				pageSize={initialTableState.query.pageSize}
				pageSizeOptions={[25, 50, 100]}
				searchable
				groupBy="location_name"
				fillParent
				onRefresh={handleRefresh}
				rowActionsHeader="Actions"
			>
				{#snippet cell(
					row: DevicePrimaryDataDto,
					col: CwColumnDef<DevicePrimaryDataDto>,
					defaultValue: string
				)}
					{#if col.key === 'name'}
						{row.name?.trim() || row.dev_eui}
					{:else if col.key === 'temperature_c'}
						{formatMetric(row.temperature_c)}
					{:else if col.key === 'humidity'}
						{formatMetric(row.humidity)}
					{:else if col.key === 'co2'}
						{formatMetric(row.co2)}
					{:else if col.key === 'moisture'}
						{formatMetric(row.moisture)}
					{:else if col.key === 'created_at'}
						<span class="flex items-center">
							<CwStatusDot
								size="sm"
								class="mr-4"
								status={Date.now() - new Date(row.created_at).getTime() < (Number(row.default_upload_interval) ?? 10) * 60 * 1000 ? 'online' : 'offline'}
							/>
							<CwDuration from={row.created_at} />
						</span>
					{:else}
						{defaultValue}
					{/if}
				{/snippet}

				{#snippet actionsHeader()}
					<CwButton variant="secondary" size="sm" onclick={() => void handleRefresh()}>
						Refresh all
					</CwButton>
				{/snippet}

				{#snippet rowActions(row: DevicePrimaryDataDto)}
					<CwButton size="sm" variant="info" onclick={() => openDevice(row)}>View</CwButton>
				{/snippet}

				{#snippet emptyState()}
					<AppNotice tone="neutral" title="No devices match the current filters">
						<p>Try clearing one or more filters or refreshing the dashboard data.</p>
					</AppNotice>
				{/snippet}

				{#snippet errorState(message: string)}
					<AppNotice tone="danger" title="The table could not load device readings">
						<p>{message}</p>
					</AppNotice>
				{/snippet}
			</CwDataTable>
		{/await}
	</CwCard>
</div>

<style>
	.dashboard-table-card {
		display: flex;
		flex: 1 1 auto;
		min-height: 24rem;
	}

	.dashboard-table-card :global(.cw-card) {
		display: flex;
		flex: 1 1 auto;
		min-height: 24rem;
	}

	.dashboard-table-card :global(.cw-card__body) {
		display: flex;
		flex: 1 1 auto;
		min-height: 0;
	}

	.dashboard-table-card__loading {
		display: flex;
		flex: 1 1 auto;
		align-items: center;
		justify-content: center;
		padding: var(--cw-space-6);
	}

	.dashboard-table-card__notice {
		padding-bottom: var(--cw-space-3);
	}
</style>
