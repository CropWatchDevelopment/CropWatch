<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import {
		CwButton,
		CwDataTable,
		CwDuration,
		type CwColumnDef,
		type CwTableQuery,
		type CwTableResult
	} from '@cropwatchdevelopment/cwui';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { ApiService } from '$lib/api/api.service';
	import { getAppContext } from '$lib/appContext.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import AppStatusDot from '$lib/components/status/AppStatusDot.svelte';
	import type { IDevice } from '$lib/interfaces/device.interface';
	import CHECK_CIRCLE_ICON from '$lib/images/icons/check_circle.svg';
	import ALERT_ICON from '$lib/images/icons/active_alert.svg';
	import { mapDashboardPrimaryDataToDevice } from './dashboard-device-data';
	import {
		DASHBOARD_DEVICE_REFRESH_ALARM_AFTER_MINUTES,
		isDashboardDeviceOffline,
		refreshDashboardDevice
	} from './dashboard-device-refresh';
	import {
		buildDashboardTableFilters,
		DASHBOARD_DEVICE_BATCH_SIZE,
		type DashboardDeviceFilters,
		DASHBOARD_DEVICE_OVERSCAN,
		DASHBOARD_DEVICE_PAGE_SIZE_OPTIONS,
		DASHBOARD_DEVICE_ROW_HEIGHT
	} from './device-table';
	import EYE_ICON from '$lib/images/icons/eye.svg';

	interface Props {
		filters: DashboardDeviceFilters;
	}

	let { filters }: Props = $props();

	const app = getAppContext();

	const columns: CwColumnDef<IDevice>[] = [
		{ key: 'alert_count', header: m.dashboard_column_alerts(), width: '5rem', sortable: true },
		{ key: 'name', header: m.dashboard_column_device_name(), width: '16rem', sortable: true },
		{
			key: 'temperature_c',
			header: m.dashboard_column_temperature(),
			width: '10rem',
			sortable: true
		},
		{ key: 'humidity', header: m.dashboard_column_humidity(), width: '10rem', sortable: true },
		{ key: 'co2', header: m.dashboard_column_co2(), width: '10rem', sortable: true },
		{
			key: 'soil_humidity',
			header: m.dashboard_column_soil_humidity(),
			width: '12rem',
			sortable: true
		},
		{ key: 'location_name', header: m.dashboard_column_location(), sortable: true },
		{
			key: 'created_at',
			header: m.dashboard_column_last_seen(),
			sortable: true,
			hideBelow: 'md',
			width: '10rem',
			cell: (row) =>
				row.has_primary_data === false
					? m.dashboard_no_data_yet()
					: new Date(row.created_at).toLocaleString()
		}
	];

	let refreshingByDevEui = $state<Record<string, boolean>>({});
	let tableFilters = $derived(buildDashboardTableFilters(filters));
	let loading = $state(false);
	let virtualScroll = $state(false);
	let tableSourceKey = $derived.by(() =>
		[
			app.accessToken ? 'auth' : 'anon',
			app.totalDeviceCount ?? app.devices.length,
			app.locations?.length ?? 0
		].join(':')
	);

	function isRefreshing(devEui: string): boolean {
		return refreshingByDevEui[devEui] === true;
	}

	function getMetricDisplayValue(value: number | null | undefined): string {
		return value == null ? '--' : value.toLocaleString('en', { useGrouping: true });
	}

	function isOffline(row: IDevice): boolean {
		return isDashboardDeviceOffline(row);
	}

	async function loadData(query: CwTableQuery): Promise<CwTableResult<IDevice>> {
		if (!app.accessToken) {
			return { rows: [], total: 0 };
		}

		const api = new ApiService({ authToken: app.accessToken });
		const skip = (query.page - 1) * query.pageSize;
		const take = query.pageSize;
		const search = query.search?.trim() || '';
		const filterParams = {
			group: filters.group || undefined,
			locationGroup: filters.locationGroup || undefined,
			location: filters.location || undefined
		};

		const result = await api.getLatestPrimaryDeviceData(
			{ ...filterParams, name: search || undefined, skip, take },
			{ signal: query.signal }
		);

		let devices = (result.data ?? []).map(mapDashboardPrimaryDataToDevice);
		const total = typeof result.total === 'number' ? result.total : devices.length;

		if (query.sort) {
			devices = sortDevices(devices, query.sort.column, query.sort.direction);
		}

		return { rows: devices, total };
	}

	function sortDevices(devices: IDevice[], column: string, direction: 'asc' | 'desc'): IDevice[] {
		const numericColumns = new Set(['co2', 'humidity', 'temperature_c', 'soil_humidity', 'alert_count']);
		const dir = direction === 'asc' ? 1 : -1;

		return [...devices].sort((a, b) => {
			const aVal = column === 'created_at'
				? new Date(a.created_at).getTime()
				: (a as unknown as Record<string, unknown>)[column];
			const bVal = column === 'created_at'
				? new Date(b.created_at).getTime()
				: (b as unknown as Record<string, unknown>)[column];

			if (numericColumns.has(column) || column === 'created_at') {
				const aNum = typeof aVal === 'number' && Number.isFinite(aVal) ? aVal : Number.NEGATIVE_INFINITY;
				const bNum = typeof bVal === 'number' && Number.isFinite(bVal) ? bVal : Number.NEGATIVE_INFINITY;
				return (aNum - bNum) * dir;
			}

			return String(aVal ?? '').localeCompare(String(bVal ?? ''), undefined, { numeric: true, sensitivity: 'base' }) * dir;
		});
	}

	async function loadSingleDevice(row: IDevice) {
		const devEui = row.dev_eui;
		if (!devEui || !app.accessToken || refreshingByDevEui[devEui]) {
			return;
		}

		refreshingByDevEui[devEui] = true;

		try {
			await refreshDashboardDevice({
				app,
				devEui,
				targetDevice: row
			});
		} finally {
			refreshingByDevEui[devEui] = false;
		}
	}

	function openDeviceDetails(row: IDevice) {
		loading = true;
		goto(
			resolve('/locations/[location_id]/devices/[dev_eui]', {
				location_id: String(row.location_id),
				dev_eui: row.dev_eui
			})
		)
			.catch((error) => {
				console.error('Failed to navigate to device details:', error);
			})
			.finally(() => {
				loading = false;
			});
	}
</script>

<div class="dashboard-device-table-host">
	{#key tableSourceKey}
		<CwDataTable
			{columns}
			{loadData}
			{loading}
			rowKey="dev_eui"
			filters={tableFilters}
			fillParent
			groupBy={app.privacyModeEnabled ? undefined : 'location_name'}
			{virtualScroll}
			virtualRowHeight={DASHBOARD_DEVICE_ROW_HEIGHT}
			virtualOverscan={DASHBOARD_DEVICE_OVERSCAN}
			pageSize={DASHBOARD_DEVICE_BATCH_SIZE}
			pageSizeOptions={DASHBOARD_DEVICE_PAGE_SIZE_OPTIONS}
			searchable
			rowActionsHeader="Actions"
		>
			{#snippet cell(row: IDevice, col: CwColumnDef<IDevice>, defaultValue: string)}
				<div class="text-xl">
					{#if col.key === 'created_at'}
						<div
							class="dashboard-device-table__cell"
							class:dashboard-device-table__cell--refreshing={isRefreshing(row.dev_eui)}
						>
							<AppStatusDot
								class="dashboard-device-table__status-dot"
								size={isOffline(row) ? 'lg' : 'md'}
								status={isOffline(row) ? 'offline' : 'online'}
							/>
							{#if row.has_primary_data === false}
								<span>{m.dashboard_no_data_yet()}</span>
							{:else}
								<CwDuration
									from={row.created_at}
									alarmAfterMinutes={DASHBOARD_DEVICE_REFRESH_ALARM_AFTER_MINUTES}
									alarmCallback={() => void loadSingleDevice(row)}
								/>
							{/if}
						</div>
					{:else if (col.key === 'name' || col.key === 'location_name') && app.privacyModeEnabled}
						<div class="dashboard-device-table__cell">
							<span class="text-2xl">• • • • • • • •</span>
						</div>
					{:else}
						<div
							class="dashboard-device-table__cell"
							class:dashboard-device-table__cell--refreshing={isRefreshing(row.dev_eui)}
						>
							{#if col.key === 'temperature_c'}
								{getMetricDisplayValue(row.temperature_c)}
							{:else if col.key === 'humidity'}
								{getMetricDisplayValue(row.humidity)}
							{:else if col.key === 'soil_humidity'}
								{getMetricDisplayValue(row.soil_humidity)}
							{:else if col.key === 'co2'}
								{getMetricDisplayValue(row.co2)}
							{:else if col.key === 'alert_count'}
								<span class="text-2xl">
									{#if row.alert_count == null || row.alert_count === 0}
										<Icon src={CHECK_CIRCLE_ICON} alt={m.dashboard_no_alerts_alt()} preserveColor />
									{:else}
										<Icon src={ALERT_ICON} alt={m.dashboard_active_alert_alt()} preserveColor />
									{/if}
								</span>
							{:else}
								{defaultValue}
							{/if}
						</div>
					{/if}
				</div>
			{/snippet}

			{#snippet rowActions(row: IDevice)}
				<CwButton
					size="md"
					variant="info"
					disabled={isRefreshing(row.dev_eui)}
					onclick={() => openDeviceDetails(row)}
				>
					<Icon src={EYE_ICON} alt={m.action_view()} />
				</CwButton>
			{/snippet}

			{#snippet actionsHeader()}
				<CwButton
					size="sm"
					variant="secondary"
					onclick={() => {
						virtualScroll = !virtualScroll;
					}}
				>
					{m.dashboard_virtual_scroll()}
					{#if virtualScroll}
						<AppStatusDot status="online" />
					{:else}
						<AppStatusDot status="warning" />
					{/if}
				</CwButton>
			{/snippet}
		</CwDataTable>
	{/key}
</div>

<style>
	.dashboard-device-table-host {
		display: flex;
		flex-direction: column;
		flex: 1 1 0%;
		min-height: 0;
		overflow: hidden;
		margin: 0 0 var(--cw-space-4);
	}

	/* .dashboard-device-table__cell {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-height: 1.5rem;
		font-size: 1.4rem;
	} */

	:global(.dashboard-device-table__status-dot) {
		display: inline-flex;
		flex: none;
	}

	.dashboard-device-table__cell--refreshing {
		background-color: rgba(255, 255, 255, 0.3);
		/* Apply the blur effect to the background behind the table */
		backdrop-filter: blur(10px);
		/* Vendor prefix for Safari support */
		-webkit-backdrop-filter: blur(10px);
	}
</style>
