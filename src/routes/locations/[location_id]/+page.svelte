<script lang="ts">
	import {
		CwButton,
		CwCard,
		CwChip,
		CwCopy,
		CwDataTable,
		useCwToast,
		type CwColumnDef,
		type CwTableQuery,
		type CwTableResult
	} from '@cropwatchdevelopment/cwui';
	import { page } from '$app/state';
	import type { DevicePrimaryDataDto } from '$lib/api/api.service';
	import { goto } from '$app/navigation';

	type DeviceStatus = 'Online' | 'Offline';
	interface PageData {
		allLocationDevices: DevicePrimaryDataDto[];
	}

	interface LocationDeviceRow {
		dev_eui: string;
		name: string;
		status: DeviceStatus;
	}

	let { data }: { data: PageData } = $props();
	const toast = useCwToast();
	const offlineThresholdMs = 11 * 60 * 1000;
	let loading = $state(false);

	const selectedLocationId = $derived(page.params.location_id);
	const selectedLocationName = $derived((page.url.searchParams.get('location_name') ?? '').trim());
	const locationLabel = $derived(
		selectedLocationName || (selectedLocationId ? `Location ${selectedLocationId}` : 'Current Location')
	);

	const columns: CwColumnDef<LocationDeviceRow>[] = [
		{ key: 'name', header: 'Device Name', sortable: true },
		{ key: 'dev_eui', header: 'DevEUI', sortable: true, width: '14rem', hideBelow: 'sm' },
		{ key: 'status', header: 'Status', sortable: true, width: '8rem', align: 'center' }
	];

	const locationDevices = $derived.by(() => {
		const now = Date.now();
		return (data.allLocationDevices ?? []).map((device) => {
			const createdAt = device.created_at ? new Date(device.created_at) : null;
			const createdAtMs = createdAt?.getTime() ?? NaN;
			const isOffline = !Number.isFinite(createdAtMs) || now - createdAtMs > offlineThresholdMs;
			return {
				dev_eui: String(device.dev_eui ?? ''),
				name: String(device.name ?? device.dev_eui ?? 'Unnamed Device'),
				status: isOffline ? 'Offline' : 'Online'
			} satisfies LocationDeviceRow;
		});
	});

	function sortRows(rows: LocationDeviceRow[], query: CwTableQuery): LocationDeviceRow[] {
		if (!query.sort) return rows;
		const { column, direction } = query.sort;
		const directionFactor = direction === 'asc' ? 1 : -1;

		return [...rows].sort((a, b) => {
			switch (column) {
				case 'name':
					return a.name.localeCompare(b.name) * directionFactor;
				case 'dev_eui':
					return a.dev_eui.localeCompare(b.dev_eui) * directionFactor;
				case 'status':
					return a.status.localeCompare(b.status) * directionFactor;
				default:
					return 0;
			}
		});
	}

	async function loadData(query: CwTableQuery): Promise<CwTableResult<LocationDeviceRow>> {
		loading = true;
		try {
			const search = query.search.trim().toLowerCase();
			let rows = locationDevices;

			if (search) {
				rows = rows.filter(
					(row) =>
						row.name.toLowerCase().includes(search) || row.dev_eui.toLowerCase().includes(search)
				);
			}

			const sorted = sortRows(rows, query);
			const start = Math.max(0, (query.page - 1) * query.pageSize);

			return {
				rows: sorted.slice(start, start + query.pageSize),
				total: sorted.length
			};
		} finally {
			loading = false;
		}
	}

	function handleSettings() {
		toast.add({
			tone: 'info',
			message: `Open location settings for ${locationLabel}.`
		});
	}

	function handleAddDevice() {
		toast.add({
			tone: 'info',
			message: `Add device to ${locationLabel}.`
		});
	}

	function handleViewDevice(row: LocationDeviceRow) {
		const query = new URLSearchParams({
			location_id: selectedLocationId,
			location_name: locationLabel,
			dev_eui: row.dev_eui
		});
		window.location.assign(
			`/locations/${encodeURIComponent(selectedLocationId)}/devices/${encodeURIComponent(row.dev_eui)}?${query.toString()}`
		);
	}
</script>

<div class="location-page">
	<div style="margin-bottom: 1rem;">
		<CwButton variant="primary" onclick={ () => goto(`/`) }>← Back to Dashboard</CwButton>
	</div>
	<CwCard title={`Location: ${locationLabel}`} subtitle="Devices returned for this location" elevated>
		<CwDataTable
			columns={columns}
			{loadData}
			{loading}
			rowKey="dev_eui"
			searchable
			pageSize={10}
			rowActionsHeader="View"
		>
			{#snippet toolbarActions()}
				<div class="location-page__actions">
					<CwButton variant="secondary" onclick={() => goto(`/locations/${encodeURIComponent(+selectedLocationId)}/settings`)}>Settings</CwButton>
					<CwButton variant="primary" onclick={handleAddDevice}>Add Device</CwButton>
				</div>
			{/snippet}

			{#snippet cell(row: LocationDeviceRow, col: CwColumnDef<LocationDeviceRow>, defaultValue: string)}
				{#if col.key === 'status'}
					<CwChip
						label={row.status}
						tone={row.status === 'Online' ? 'success' : 'danger'}
						variant="soft"
					/>
				{:else if col.key === 'dev_eui'}
					<CwCopy value={row.dev_eui}>
						<span>{row.dev_eui}</span>
					</CwCopy>
				{:else}
					{defaultValue}
				{/if}
			{/snippet}

			{#snippet rowActions(row: LocationDeviceRow)}
				<CwButton size="sm" variant="info" onclick={() => handleViewDevice(row)}>View</CwButton>
			{/snippet}
		</CwDataTable>
	</CwCard>
</div>

<style>
	.location-page {
		padding: 1rem;
	}

	.location-page__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}
</style>
