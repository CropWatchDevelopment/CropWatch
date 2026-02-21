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
	import { goto } from '$app/navigation';
	import NOTIFICATIONS_ICON from '$lib/images/icons/notifications.svg';
	import REFRESH_ICON from '$lib/images/icons/refresh.svg';

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
	$inspect(data);

	const initialPageSize = 10;
	let jwt = $derived(data.locals?.jwtString);
	let serverRows = $derived(data.pagableDevices?.data ?? []);
	let serverTotal = $derived(data.pagableDevices?.total ?? serverRows.length);
	let loading = $state(false);
	let rows = $state<IDevice[]>([]);
	let total = $state(0);
	let servedInitialRows = $state(false);
	let refreshingByDevEui = $state<Record<string, boolean>>({});
	const offlineThresholdMs = 11 * 60 * 1000;
	const alertCo2Threshold = 1200;
	let headerRows = $derived(servedInitialRows ? rows : serverRows);

	let devicesInView = $derived(headerRows.length);
	let offlineCount = $derived(
		headerRows.filter((row) => Date.now() - new Date(row.created_at).getTime() > offlineThresholdMs)
			.length
	);
	let alertCount = $derived(
		headerRows.filter(
			(row) =>
				Date.now() - new Date(row.created_at).getTime() > offlineThresholdMs ||
				Number(row.co2 ?? 0) >= alertCo2Threshold
		).length
	);
	let onlineCount = $derived(Math.max(0, devicesInView - offlineCount));

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
			const isInitialQuery =
				query.page === 1 && query.pageSize === initialPageSize && !query.search && !query.sort;

			if (!servedInitialRows && isInitialQuery) {
				rows = serverRows;
				total = serverTotal;
				servedInitialRows = true;
				return { rows, total };
			}

			const response = await fetch(
				`${PUBLIC_API_BASE_URL}${PUBLIC_DEVICE_LATEST_PRIMARY_DATA_ENDPOINT}?skip=${(query.page - 1) * query.pageSize}&take=${query.pageSize}`,
				{
					headers: jwt ? { Authorization: `Bearer ${jwt}` } : undefined
				}
			);
			if (!response.ok) {
				throw new Error(`Failed to load devices (${response.status})`);
			}

			// const result = (await response.json()) as PagableDevices;
			const result = data.pagableDevices;
			rows = result.data ?? [];
			total = result.total ?? 0;
			return { rows, total };
		} finally {
			loading = false;
		}
	}

	async function loadSingleDevice(devEUI: string) {
		if (refreshingByDevEui[devEUI]) return;
		refreshingByDevEui[devEUI] = true;

		try {
			const response = await fetch(
				`${PUBLIC_API_BASE_URL}${PUBLIC_DEVICE_LATEST_PRIMARY_DATA_BY_DEV_EUI_ENDPOINT.replace('{dev_eui}', devEUI)}`,
				{
					headers: jwt ? { Authorization: `Bearer ${jwt}` } : undefined
				}
			);
			if (!response.ok) {
				if (response.status === 401) {
					document.location.href = '/auth/login';
					return;
				}
				throw new Error(`Failed to load device ${devEUI} (${response.status})`);
			}

			const device = (await response.json()) as IDevice;
			const row = rows.find((d) => d.dev_eui === devEUI);
			if (!row) return;

			row.temperature_c = device.temperature_c;
			row.co2 = device.co2;
			row.humidity = device.humidity;
			row.created_at = device.created_at;
		} finally {
			refreshingByDevEui[devEUI] = false;
		}
	}

	function showDetail(device: IDevice) {
		alert(`Details: ${device.name}`);
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

		<div class="hidden items-center gap-3 text-xs md:flex">
			<CwChip
				label="Online"
				tone="success"
				variant="soft"
				size="sm"
				class="!rounded-full !bg-emerald-500/10 !text-emerald-300 !ring-1 !ring-emerald-500/30"
			/>
			<CwChip
				label="Offline"
				tone="danger"
				variant="soft"
				size="sm"
				class="!rounded-full !bg-rose-500/10 !text-rose-300 !ring-1 !ring-rose-500/30"
			/>
			<CwChip
				label="Alert"
				tone="warning"
				variant="soft"
				size="sm"
				class="!rounded-full !bg-amber-500/10 !text-amber-300 !ring-1 !ring-amber-500/30"
			/>
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
					<span class="font-mono">{alertCount}</span>
					<span>with active alerts</span>
				</span>
			</div>
			<span class="flex items-center gap-1">
				{#await data.statuses}
					Loading device status summary...
				{:then statuses}
				
					<p class="text-emerald-300">Total Online: {statuses.online}</p> | <p class="text-rose-300">Total Offline: {statuses.offline}</p>
				{:catch error}
					Error loading statuses: {error.message}
				{/await}
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

			<CwBadge value={alertCount} position="bottom_left" size="md" tone="danger">
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
			<!--OPTION 1 ICON ONLY-->
			<!-- <CwChip
				label={new Date(row.created_at).getTime() < Date.now() - 11 * 60 * 1000 ? '❌' : '✅'}
				tone={new Date(row.created_at).getTime() < Date.now() - 11 * 60 * 1000 ? 'danger' : 'success'}
			/> -->

			<!-- OPTION 2 ICON + DURATION -->
			{new Date(row.created_at).getTime() < Date.now() - 11 * 60 * 1000 ? '❌' : '✅'}
			<CwDuration
				from={row.created_at}
				alarmAfterMinutes={10.5}
				alarmCallback={() => void loadSingleDevice(row.dev_eui)}
			/>

			<!-- OPTION 3 JUST DURATION WITH ALARM -->
			<!-- {#if new Date(row.created_at).getTime() < Date.now() - 11 * 60 * 1000}
				❌
				<CwDuration
					from={row.created_at}
					alarmAfterMinutes={10.5}
					alarmCallback={() => void loadSingleDevice(row.dev_eui)}
				/>
			{:else}
				✅
			{/if} -->
		{:else}
			{defaultValue}
		{/if}
	{/snippet}

	{#snippet rowActions(row: IDevice)}
		<CwButton size="sm" variant="info" onclick={() => showDetail(row)}>Details</CwButton>
	{/snippet}
</CwDataTable>
