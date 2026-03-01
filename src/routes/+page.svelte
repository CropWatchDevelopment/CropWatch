<script lang="ts">
	import {
		CwBadge,
		CwButton,
		CwChip,
		CwDataTable,
		CwDuration,
		type CwColumnDef,
		type CwTableQuery,
		type CwTableResult
	} from '@cropwatchdevelopment/cwui';
	import type { IDevice } from '$lib/interfaces/device.interface';
	import {
		PUBLIC_API_BASE_URL,
		PUBLIC_DEVICE_LATEST_PRIMARY_DATA_BY_DEV_EUI_ENDPOINT,
		PUBLIC_DEVICE_LATEST_PRIMARY_DATA_ENDPOINT
	} from '$env/static/public';
	import NOTIFICATIONS_ICON from '$lib/images/icons/notifications.svg';
	import REFRESH_ICON from '$lib/images/icons/refresh.svg';
	import { defaultAppContext, getAppContext, updateAppContext } from '$lib/appContext.svelte';
	import { dev } from '$app/environment';
	import { goto } from '$app/navigation';

	type PagableDevices = {
		data: IDevice[];
		total: number;
	};

	interface PageData {
		pagableDevices: PagableDevices;
		locals: App.Locals;
		statuses: Promise<{ online: number; offline: number }>;
	}

	let { data }: { data: PageData } = $props();

	const app = getAppContext();

	const initialPageSize = 10;
	let serverRows = $derived(app.devices ?? []);
	let loading = $state(false);
	let rows = $state<IDevice[]>([]);
	let servedInitialRows = $state(false);
	let refreshingByDevEui = $state<Record<string, boolean>>({});
	let headerRows = $derived(servedInitialRows ? rows : serverRows);

	let devicesInView = $derived(headerRows.length);

	const columns: CwColumnDef<IDevice>[] = [
		{ key: 'name', header: 'Device Name', sortable: true },
		{ key: 'dev_eui', header: 'DevEUI', width: '12rem', hideBelow: 'sm' },
		{ key: 'temperature_c', header: 'Temperature (°C)', width: '12rem' },
		{ key: 'co2', header: 'CO₂ (ppm)', width: '10rem' },
		{ key: 'humidity', header: 'Humidity (%)', width: '10rem' },
		{ key: 'location_name', header: 'Location', sortable: true },
		{
			key: 'lastSeen',
			header: 'Last Seen',
			sortable: true,
			hideBelow: 'md',
			cell: (row) => new Date(row.created_at).toLocaleString()
		}
	];

	async function loadData(query: CwTableQuery): Promise<CwTableResult<IDevice>> {
		loading = true;
		try {
			const CwTableResult = {
				rows: app.devices ?? [],
				total: (app.deviceStatuses?.offline ?? 0) + (app.deviceStatuses?.online ?? 0)
			};
			return CwTableResult;
		} finally {
			loading = false;
		}
	}

	async function loadSingleDevice(devEUI: string) {
		if (refreshingByDevEui[devEUI]) return;
		const rowItem: IDevice | null = app.devices.find((d) => d.dev_eui === devEUI) ?? null;
		if (!rowItem) return;
		rowItem.cwloading = true;
		refreshingByDevEui[devEUI] = true;
		try {
			const response = await fetch(
				`${PUBLIC_API_BASE_URL}${PUBLIC_DEVICE_LATEST_PRIMARY_DATA_BY_DEV_EUI_ENDPOINT.replace('{dev_eui}', devEUI)}`,
				{
					headers: app.accessToken ? { Authorization: `Bearer ${app.accessToken}` } : undefined
				}
			);
			if (!response.ok) {
				if (response.status === 401) {
					document.location.href = `/auth/login?expired=true&redirect=${encodeURIComponent(window.location.pathname)}`;
					return;
				}
				throw new Error(`Failed to load device ${devEUI} (${response.status})`);
			}

			const device = (await response.json()) as IDevice;
			rowItem.temperature_c = device.temperature_c;
			rowItem.co2 = device.co2;
			rowItem.humidity = device.humidity;
			rowItem.created_at = device.created_at;
			
			// implement a small delay here to simulate loading state and make it more visually clear that the row is being refreshed
			await new Promise((resolve) => setTimeout(resolve, dev ? 500 : 1000));
			rowItem.cwloading = false;

			// update the app context here to trigger updates
			app.devices = [...app.devices];
		} finally {
			refreshingByDevEui[devEUI] = false;
		}
	}

	function refreshDashboard() {
		window.location.reload();
	}
</script>

<header style="margin-bottom: 23px;" class="flex-none">
	<div class="flex min-h-12 items-center justify-between px-6 py-3 md:py-4">
		<div class="hidden flex-col gap-1 md:flex">
			<div class="flex items-center gap-2 text-xs text-slate-400">
				<span>Group</span>
				<span class="text-slate-600">/</span>
				<span class="truncate">All groups</span>
			</div>
		</div>
	</div>

	<div
		class="mb-3 flex min-h-[4rem] flex-row items-end justify-between gap-3 border-t border-slate-800 px-6 py-3 text-xs md:py-4"
	>
		<div class="hidden flex-col gap-2 text-slate-400 md:flex">
			<div class="flex flex-wrap items-center gap-3">
				<span class="flex items-center gap-1">
					<span class="font-mono text-slate-100">{devicesInView}</span>
					<span>devices in view</span>
				</span>
				<span class="flex items-center gap-1 text-amber-200">
					<span class="font-mono">{app.triggeredRules?.triggered_count ?? 0}</span>
					<span>with active alerts</span>
				</span>
			</div>
			<span class="flex items-center gap-1">
				<p class="text-emerald-300">Total Online: {app.deviceStatuses?.online ?? 0}</p>
				|
				<p class="text-rose-300">Total Offline: {app.deviceStatuses?.offline ?? 0}</p>
			</span>
		</div>

		<div
			id="Dashboard__Overview__actions"
			class="flex w-full items-center justify-end gap-3 md:w-auto"
		>
			<span class="hidden flex-1 md:flex"></span>

			<CwButton variant="secondary" onclick={refreshDashboard}>
				<img src={REFRESH_ICON} alt="Refresh Icon" class="h-4 w-4" />
				Refresh
			</CwButton>

			<CwBadge value={app.triggeredRulesCount} position="bottom_left" size="md" tone="danger">
				<CwButton variant="secondary">
					<img src={NOTIFICATIONS_ICON} alt="Notifications Icon" class="h-5 w-5" />
				</CwButton>
			</CwBadge>
		</div>
	</div>
</header>

<CwDataTable
	{columns}
	{loadData}
	{loading}
	rowKey="dev_eui"
	searchable
	pageSize={initialPageSize}
	actionsHeader="Actions"
>
	{#snippet cell(row: IDevice, col: CwColumnDef<IDevice>, defaultValue: string)}
		{#if col.key === 'lastSeen'}
			{new Date(row.created_at).getTime() < Date.now() - 11 * 60 * 1000 ? '❌' : '✅'}
			<CwDuration
				from={row.created_at}
				alarmAfterMinutes={10.5}
				alarmCallback={() => void loadSingleDevice(row.dev_eui)}
			/>
		{:else}
			{defaultValue}
		{/if}
	{/snippet}

	{#snippet rowActions(row: IDevice)}
		<CwButton size="sm" variant="info" onclick={() => { goto(`/locations/${row.location_id}/devices/${row.dev_eui}`); loading = true; }}>Details</CwButton>
	{/snippet}
</CwDataTable>
