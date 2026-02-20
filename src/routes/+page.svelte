<script lang="ts">
	import {
		CwButton,
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

	type PagableDevices = {
		data: IDevice[];
		total: number;
	};

	interface PageData {
		pagableDevices: PagableDevices;
		locals: App.Locals;
	}

	let { data }: { data: PageData } = $props();

	const initialPageSize = 10;
	let jwt = $derived(data.locals?.jwtString);
	let serverRows = $derived(data.pagableDevices?.data ?? []);
	let serverTotal = $derived(data.pagableDevices?.total ?? serverRows.length);
	let loading = $state(false);
	let rows = $state<IDevice[]>([]);
	let total = $state(0);
	let servedInitialRows = $state(false);
	let refreshingByDevEui = $state<Record<string, boolean>>({});

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

			const result = (await response.json()) as PagableDevices;
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
				debugger;
				goto('/auth/login');
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
</script>

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
			<CwDuration
				from={row.created_at}
				alarmAfterMinutes={11}
				alarmCallback={() => void loadSingleDevice(row.dev_eui)}
			/>
		{:else}
			{defaultValue}
		{/if}
	{/snippet}

	{#snippet rowActions(row: IDevice)}
		<CwButton size="sm" variant="info" onclick={() => showDetail(row)}>Details</CwButton>
	{/snippet}
</CwDataTable>
