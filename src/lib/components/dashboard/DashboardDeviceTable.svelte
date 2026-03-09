<script lang="ts">
	import {
		CwButton,
		CwDataTable,
		CwDuration,
		CwStatusDot,
		type CwColumnDef,
		type CwTableQuery,
		type CwTableResult
	} from '@cropwatchdevelopment/cwui';
	import { dev } from '$app/environment';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { ApiService } from '$lib/api/api.service';
	import { getAppContext } from '$lib/appContext.svelte';
	import type { IDevice } from '$lib/interfaces/device.interface';
	import {
		buildDashboardTableFilters,
		DASHBOARD_DEVICE_BATCH_SIZE,
		type DashboardDeviceFilters,
		DASHBOARD_DEVICE_OVERSCAN,
		DASHBOARD_DEVICE_PAGE_SIZE_OPTIONS,
		DASHBOARD_DEVICE_ROW_HEIGHT,
		queryDashboardDevices
	} from './device-table';

	interface Props {
		filters: DashboardDeviceFilters;
	}

	let { filters }: Props = $props();

	const app = getAppContext();

	const columns: CwColumnDef<IDevice>[] = [
		{ key: 'name', header: 'Device Name', sortable: true },
		{ key: 'dev_eui', header: 'DevEUI', width: '12rem', hideBelow: 'sm' },
		{ key: 'temperature_c', header: 'Temperature (°C)', width: '12rem', sortable: true },
		{ key: 'co2', header: 'CO₂ (ppm)', width: '10rem', sortable: true },
		{ key: 'humidity', header: 'Humidity (%)', width: '10rem', sortable: true },
		{ key: 'location_name', header: 'Location', sortable: true },
		{
			key: 'created_at',
			header: 'Last Seen',
			sortable: true,
			hideBelow: 'md',
			cell: (row) => new Date(row.created_at).toLocaleString()
		}
	];

	let refreshingByDevEui = $state<Record<string, boolean>>({});
	let tableFilters = $derived(buildDashboardTableFilters(filters));

	function isRefreshing(devEui: string): boolean {
		return refreshingByDevEui[devEui] === true;
	}

	function applyLatestReadings(target: IDevice, source: IDevice) {
		target.temperature_c = source.temperature_c;
		target.co2 = source.co2;
		target.humidity = source.humidity;
		target.created_at =
			source.created_at instanceof Date ? source.created_at : new Date(source.created_at);
	}

	function toDeviceRow(device: Record<string, unknown>): IDevice {
		return {
			dev_eui: String(device.dev_eui ?? ''),
			name: String(device.name ?? device.dev_eui ?? ''),
			location_name: String(device.location_name ?? ''),
			group: String(device.group ?? ''),
			created_at:
				device.created_at instanceof Date
					? device.created_at
					: new Date(String(device.created_at ?? '')),
			co2: Number(device.co2 ?? 0),
			humidity: Number(device.humidity ?? 0),
			temperature_c: Number(device.temperature_c ?? 0),
			location_id: Number(device.location_id ?? 0),
			cwloading: false
		};
	}

	async function loadData(query: CwTableQuery): Promise<CwTableResult<IDevice>> {
		return queryDashboardDevices(app.devices ?? [], app.locations ?? [], filters, query);
	}

	async function loadSingleDevice(row: IDevice) {
		const devEui = row.dev_eui;
		if (!devEui || !app.accessToken || refreshingByDevEui[devEui]) {
			return;
		}

		const contextRowIndex = app.devices.findIndex((device) => device.dev_eui === devEui);

		refreshingByDevEui[devEui] = true;

		try {
			const api = new ApiService({
				authToken: app.accessToken
			});
			const latestDevice = toDeviceRow(
				(await api.getDeviceLatestPrimaryData(devEui)) as Record<string, unknown>
			);
			applyLatestReadings(row, latestDevice);
			if (contextRowIndex !== -1) {
				applyLatestReadings(app.devices[contextRowIndex], latestDevice);
			}
			app.devices = [...app.devices];

			await new Promise((resolveDelay) => setTimeout(resolveDelay, dev ? 500 : 1000));
		} finally {
			refreshingByDevEui[devEui] = false;
		}
	}

	function openDeviceDetails(row: IDevice) {
		goto(
			resolve('/locations/[location_id]/devices/[dev_eui]', {
				location_id: String(row.location_id),
				dev_eui: row.dev_eui
			})
		);
	}
</script>

<div class="dashboard-device-table-host">
	<CwDataTable
		{columns}
		{loadData}
		rowKey="dev_eui"
		filters={tableFilters}
		fillParent
		virtualScroll
		virtualRowHeight={DASHBOARD_DEVICE_ROW_HEIGHT}
		virtualOverscan={DASHBOARD_DEVICE_OVERSCAN}
		pageSize={DASHBOARD_DEVICE_BATCH_SIZE}
		pageSizeOptions={DASHBOARD_DEVICE_PAGE_SIZE_OPTIONS}
		searchable
		actionsHeader="Actions"
	>
		{#snippet cell(row: IDevice, col: CwColumnDef<IDevice>, defaultValue: string)}
			{#if col.key === 'created_at'}
				<div
					class="dashboard-device-table__cell"
					class:dashboard-device-table__cell--refreshing={isRefreshing(row.dev_eui)}
				>
					<CwStatusDot
						status={new Date(row.created_at).getTime() < Date.now() - 11 * 60 * 1000
							? 'offline'
							: 'online'}
					/>
					<CwDuration
						from={row.created_at}
						alarmAfterMinutes={10.3}
						alarmCallback={() => void loadSingleDevice(row)}
					/>
					{#if isRefreshing(row.dev_eui)}
						<span class="dashboard-device-table__refresh-label">Refreshing...</span>
					{/if}
				</div>
			{:else}
				<div
					class="dashboard-device-table__cell"
					class:dashboard-device-table__cell--refreshing={isRefreshing(row.dev_eui)}
				>
					{defaultValue}
				</div>
			{/if}
		{/snippet}

		{#snippet rowActions(row: IDevice)}
			<CwButton
				size="sm"
				variant="info"
				disabled={isRefreshing(row.dev_eui)}
				onclick={() => openDeviceDetails(row)}
			>
				{isRefreshing(row.dev_eui) ? 'Refreshing...' : 'Details'}
			</CwButton>
		{/snippet}
	</CwDataTable>
</div>

<style>
	.dashboard-device-table-host {
		display: flex;
		flex-direction: column;
		flex: 1 1 0%;
		min-height: 0;
		overflow: hidden;
		margin: 0 0.5rem 0.5rem;
	}

	.dashboard-device-table__cell {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-height: 1.5rem;
	}

	.dashboard-device-table__cell--refreshing {
		background-color: var(--cw-warning-700);
		border-radius: 0.375rem;
		color: var(--cw-gray-950);
		font-weight: 600;
		margin: -0.25rem 0;
		padding: 0.25rem 0.5rem;
	}

	.dashboard-device-table__refresh-label {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
</style>
