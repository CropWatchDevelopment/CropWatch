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
	import { page } from '$app/state';

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

	// ── Reactive filter state from URL search params ────────────
	let activeGroup = $derived(page.url.searchParams.get('group') ?? '');
	let activeLocationGroup = $derived(page.url.searchParams.get('locationGroup') ?? '');

	// Look up the human-readable location name for the breadcrumb
	let activeLocationGroupName = $derived.by(() => {
		if (!activeLocationGroup) return '';
		const loc = app.locationGroups?.find((l) => String(l) === activeLocationGroup);
		return loc ?? activeLocationGroup;
	});

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

	// ── loadData factory: returns a new function when filters change ──
	// CwDataTable's internal $effect reads loadData, so a new reference
	// triggers an automatic refetch.
	function createLoadData(group: string, locationGroup: string) {
		return async (query: CwTableQuery): Promise<CwTableResult<IDevice>> => {
			loading = true;
			try {
				const skip = (query.page - 1) * query.pageSize;
				const take = query.pageSize;

				const url = new URL(`${PUBLIC_API_BASE_URL}${PUBLIC_DEVICE_LATEST_PRIMARY_DATA_ENDPOINT}`);
				url.searchParams.set('skip', String(skip));
				url.searchParams.set('take', String(take));

				// Forward sidebar filters to the API as server-side query params
				if (group) url.searchParams.set('group', group);
				if (locationGroup) url.searchParams.set('locationGroup', locationGroup);

				const response = await fetch(url.toString(), {
					headers: app.accessToken ? { Authorization: `Bearer ${app.accessToken}` } : undefined,
					signal: query.signal
				});

				if (!response.ok) {
					if (response.status === 401) {
						document.location.href = `/auth/login?expired=true&redirect=${encodeURIComponent(window.location.pathname)}`;
						return { rows: [], total: 0 };
					}
					throw new Error(`Failed to load devices (${response.status})`);
				}

				const result: { data: Record<string, unknown>[]; total: number } = await response.json();

				let devices: IDevice[] = result.data.map((device) => ({
					dev_eui: String(device.dev_eui ?? ''),
					name: String(device.name ?? device.dev_eui ?? ''),
					location_name: String(device.location_name ?? ''),
					group: String(device.group ?? ''),
					created_at: new Date(device.created_at as string),
					co2: Number(device.co2 ?? 0),
					humidity: Number(device.humidity ?? 0),
					temperature_c: Number(device.temperature_c ?? 0),
					location_id: Number(device.location_id ?? 0),
					cwloading: false
				}));

				let total = result.total;

				// Client-side search filtering (API does not support search)
				if (query.search) {
					const term = query.search.toLowerCase();
					devices = devices.filter(
						(d) =>
							d.name.toLowerCase().includes(term) ||
							d.dev_eui.toLowerCase().includes(term) ||
							d.location_name.toLowerCase().includes(term)
					);
					total = devices.length;
				}

				// Client-side sort (API does not support sort)
				if (query.sort) {
					const { column, direction } = query.sort;
					devices.sort((a, b) => {
						const aVal = (a as unknown as Record<string, unknown>)[column];
						const bVal = (b as unknown as Record<string, unknown>)[column];
						const aStr = aVal != null ? String(aVal) : '';
						const bStr = bVal != null ? String(bVal) : '';
						const cmp = aStr.localeCompare(bStr, undefined, { numeric: true });
						return direction === 'asc' ? cmp : -cmp;
					});
				}

				// Update app context with current page of devices
				app.devices = devices;

				return { rows: devices, total };
			} finally {
				loading = false;
			}
		};
	}

	const loadData = $derived(createLoadData(activeGroup, activeLocationGroup));

	function applyLatestReadings(target: IDevice, source: IDevice) {
		target.temperature_c = source.temperature_c;
		target.co2 = source.co2;
		target.humidity = source.humidity;
		target.created_at =
			source.created_at instanceof Date ? source.created_at : new Date(source.created_at);
	}

	async function loadSingleDevice(row: IDevice) {
		const devEUI = row.dev_eui;
		if (!devEUI || refreshingByDevEui[devEUI]) return;

		refreshingByDevEui[devEUI] = true;
		row.cwloading = true;

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
			applyLatestReadings(row, device);

			// Keep row refresh visible in the table so polling feels intentional.
			await new Promise((resolve) => setTimeout(resolve, dev ? 500 : 1000));
		} finally {
			row.cwloading = false;
			const contextRow = app.devices.find((d) => d.dev_eui === devEUI);
			if (contextRow && contextRow !== row) {
				applyLatestReadings(contextRow, row);
				contextRow.cwloading = false;
			}
			app.devices = [...app.devices];
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
			<div class="flex items-center gap-2 text-xs text-slate-400" style="margin-left: 1rem;">
				<span>Group</span>
				<span class="text-slate-600">/</span>
				<span class="truncate">{activeGroup || 'All groups'}</span>
				{#if activeLocationGroupName}
					<span class="text-slate-600">/</span>
					<span>Location</span>
					<span class="text-slate-600">/</span>
					<span class="truncate">{activeLocationGroupName}</span>
				{/if}
			</div>
		</div>
	</div>

	<div
		class="mb-3 flex min-h-[4rem] flex-row items-end justify-between gap-3 border-t border-slate-800 px-6 py-3 text-xs md:py-4"
		style="margin-left: 1rem;"
	>
		<div class="hidden flex-col gap-2 text-slate-400 md:flex">
			<div class="flex flex-wrap items-center gap-3">
				<span class="flex items-center gap-1">
					<span class="font-mono text-slate-100">{devicesInView}</span>
					<span>devices in view</span>
				</span>
				<span class="flex items-center gap-1 text-amber-200">
					<span class="font-mono">{app.triggeredRules?.length ?? 0}</span>
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

<div style="margin-left: 0.5rem; margin-right: 0.5rem; height: 100%">
	<CwDataTable
		{columns}
		{loadData}
		{loading}
		rowKey="dev_eui"
		searchable
		pageSize={initialPageSize}
		actionsHeader="Actions"
		fillParent
	>
		{#snippet cell(row: IDevice, col: CwColumnDef<IDevice>, defaultValue: string)}
			{#if col.key === 'lastSeen'}
				<span style="flex: 1 1 auto; white-space: nowrap;">{new Date(row.created_at).getTime() < Date.now() - 11 * 60 * 1000 ? '❌' : '✅'}</span>
				<CwDuration
					from={row.created_at}
					alarmAfterMinutes={10.3}
					alarmCallback={() => void loadSingleDevice(row)}
				/>
			{:else}
				{defaultValue}
			{/if}
		{/snippet}

		{#snippet rowActions(row: IDevice)}
			<CwButton
				size="sm"
				variant="info"
				onclick={() => {
					goto(`/locations/${row.location_id}/devices/${row.dev_eui}`);
					loading = true;
				}}>Details</CwButton
			>
		{/snippet}
	</CwDataTable>
</div>
