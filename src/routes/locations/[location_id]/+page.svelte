<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { AppPage } from '$lib/components/layout';
	import {
		CwButton,
		CwCard,
		CwCopy,
		CwDataTable,
		type CwColumnDef,
		type CwTableQuery,
		type CwTableResult
	} from '@cropwatchdevelopment/cwui';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import EYE_ICON from '$lib/images/icons/eye.svg';
	import SETTINGS_ICON from '$lib/images/icons/settings.svg';
	import { m } from '$lib/paraglide/messages.js';
	import type { PageProps } from './$types';
	import ADD_ICON from '$lib/images/icons/add.svg';

	type DeviceStatus = 'Online' | 'Offline';

	interface LocationDeviceRow {
		dev_eui: string;
		name: string;
		status: DeviceStatus;
	}

	let { data }: PageProps = $props();
	const offlineThresholdMs = 11 * 60 * 1000;
	let loading = $state(false);

	const selectedLocationId = $derived(page.params.location_id);
	const selectedLocationName = $derived((page.url.searchParams.get('location_name') ?? '').trim());
	const locationLabel = $derived(
		(data.currentLocation ?? '').trim() ||
			selectedLocationName ||
			(selectedLocationId
				? m.locations_location_with_id({ id: selectedLocationId })
				: m.locations_current_location())
	);

	const columns: CwColumnDef<LocationDeviceRow>[] = [
		{ key: 'name', header: m.devices_device_name(), sortable: true },
		{ key: 'dev_eui', header: 'DevEUI', sortable: true, width: '14rem', hideBelow: 'sm' }
	];

	const locationDevices = $derived.by(() => {
		const now = Date.now();
		return (data.allLocationDevices ?? []).map((device) => {
			const createdAt = device.created_at ? new Date(device.created_at) : null;
			const createdAtMs = createdAt?.getTime() ?? NaN;
			const isOffline = !Number.isFinite(createdAtMs) || now - createdAtMs > offlineThresholdMs;
			return {
				dev_eui: String(device.dev_eui ?? ''),
				name: String(device.name ?? device.dev_eui ?? m.devices_unnamed_device()),
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

	function handleViewDevice(row: LocationDeviceRow) {
		if (selectedLocationId) {
			const query = new URLSearchParams({
				location_id: selectedLocationId || '',
				location_name: locationLabel || '',
				dev_eui: row.dev_eui || ''
			});
			window.location.assign(
				`/locations/${encodeURIComponent(selectedLocationId)}/devices/${encodeURIComponent(row.dev_eui)}?${query.toString()}`
			);
		}
	}
</script>

<AppPage>
	<CwButton variant="secondary" size="sm" onclick={() => goto(resolve('/'))}>
		&larr; {m.action_back_to_dashboard()}
	</CwButton>

	<CwCard title={m.locations_location_title({ name: locationLabel })} elevated>
		<CwDataTable
			{columns}
			{loadData}
			{loading}
			rowKey="dev_eui"
			searchable
			pageSize={10}
			rowActionsHeader={m.common_actions()}
		>
			{#snippet toolbarActions()}
				<div class="flex flex-wrap gap-2">
					{#if selectedLocationId}
						<CwButton
							variant="primary"
							onclick={() =>
								goto(`/locations/${encodeURIComponent(+selectedLocationId)}/devices/create`)}
						>
							<Icon src={ADD_ICON} alt="" />
							{m.devices_add_device()}
						</CwButton>
						<CwButton
							variant="secondary"
							onclick={() =>
								goto(`/locations/${encodeURIComponent(+selectedLocationId)}/settings`)}
						>
							<Icon src={SETTINGS_ICON} alt={m.nav_settings()} />
						</CwButton>
					{/if}
				</div>
			{/snippet}

			{#snippet cell(
				row: LocationDeviceRow,
				col: CwColumnDef<LocationDeviceRow>,
				defaultValue: string
			)}
				{#if col.key === 'dev_eui'}
					<CwCopy value={row.dev_eui}>
						<span>{row.dev_eui}</span>
					</CwCopy>
				{:else}
					{defaultValue}
				{/if}
			{/snippet}

			{#snippet rowActions(row: LocationDeviceRow)}
				<div class="flex flex-row gap-2">
					<CwButton size="md" variant="info" onclick={() => handleViewDevice(row)}>
						<Icon src={EYE_ICON} alt={m.action_view()} />
					</CwButton>
					{#if data.hasSettings}
						<CwButton
							size="md"
							variant="secondary"
							onclick={() => {
								if (!selectedLocationId) return;
								goto(
									`/locations/${encodeURIComponent(selectedLocationId)}/devices/${encodeURIComponent(row.dev_eui)}/settings`
								);
							}}
						>
							<Icon src={SETTINGS_ICON} alt={m.nav_settings()} />
						</CwButton>
					{/if}
				</div>
			{/snippet}
		</CwDataTable>
	</CwCard>
</AppPage>
