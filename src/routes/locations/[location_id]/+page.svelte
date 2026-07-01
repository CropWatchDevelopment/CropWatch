<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { AppPage } from '$lib/components/layout';
	import {
		attachCwDeviceRefreshVisibility,
		createCwDeviceRefreshScheduler,
		CwButton,
		CwCard,
		CwCopy,
		CwDataTable,
		type CwColumnDef,
		type CwDeviceFreshness,
		type CwTableQuery,
		type CwTableResult
	} from '@cropwatchdevelopment/cwui';
	import { ApiService } from '$lib/api/api.service';
	import { getAppContext } from '$lib/appContext.svelte';
	import { cwCopyLabels, cwDataTableLabels } from '$lib/i18n/cwuiLabels';
	import { goto } from '$app/navigation';
	import { backHref } from '$lib/navigation/backTo';
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

	const app = getAppContext();

	// Live freshness per device, driven by the refresh scheduler: each device is
	// refetched when its upload window expires, so the status column updates
	// without reloading the page.
	let freshnessByDevEui = $state<Record<string, CwDeviceFreshness>>({});
	let lastSeenByDevEui = $state<Record<string, string>>({});

	$effect(() => {
		const authToken = app.accessToken;
		const devices = data.allLocationDevices ?? [];
		if (!authToken || devices.length === 0) return;

		const api = new ApiService({ authToken });
		const scheduler = createCwDeviceRefreshScheduler({
			// The list endpoint has no per-device upload_interval; default to the
			// page's historical 10 min + 1 min grace ≈ the old 11-minute threshold.
			defaultIntervalMinutes: 10,
			fetcher: async (devEui) => {
				const latest = await api.getDashboardDeviceLatest(devEui);
				if (!latest) return null;
				const createdAt = typeof latest.created_at === 'string' ? latest.created_at : null;
				return { lastSeenAt: createdAt, data: latest };
			},
			onData: (devEui, result) => {
				if (typeof result.lastSeenAt === 'string') {
					lastSeenByDevEui[devEui] = result.lastSeenAt;
				}
			},
			onStateChange: (devEui, state) => {
				freshnessByDevEui[devEui] = state;
			}
		});

		scheduler.trackAll(
			devices.map((device) => ({
				id: String(device.dev_eui ?? ''),
				lastSeenAt: device.created_at ?? null
			}))
		);

		const detachVisibility = attachCwDeviceRefreshVisibility(scheduler);
		return () => {
			detachVisibility();
			scheduler.destroy();
		};
	});

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
		{ key: 'status', header: m.devices_status(), sortable: true, width: '8rem' },
		{ key: 'dev_eui', header: 'DevEUI', sortable: true, width: '14rem', hideBelow: 'sm' }
	];

	const locationDevices = $derived.by(() => {
		const now = Date.now();
		return (data.allLocationDevices ?? []).map((device) => {
			const devEui = String(device.dev_eui ?? '');
			const lastSeen = lastSeenByDevEui[devEui] ?? device.created_at ?? null;
			const lastSeenMs = lastSeen ? new Date(lastSeen).getTime() : NaN;
			const freshness = freshnessByDevEui[devEui];
			// Scheduler verdict wins once available; otherwise fall back to the
			// load-time threshold check.
			const isOffline =
				freshness === 'stale' ||
				(freshness === undefined &&
					(!Number.isFinite(lastSeenMs) || now - lastSeenMs > offlineThresholdMs));
			return {
				dev_eui: devEui,
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
	<CwButton id="location-back-button" variant="secondary" size="sm" onclick={() => goto(backHref(page.url, resolve('/')))}>
		&larr; {m.action_back_to_dashboard()}
	</CwButton>

	<CwCard title={m.locations_location_title({ name: locationLabel })} elevated>
		<CwDataTable id="location-table" labels={cwDataTableLabels()}
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
							id="location-add-device-button"
							variant="primary"
							onclick={() =>
								goto(`/locations/${encodeURIComponent(+selectedLocationId)}/devices/create`)}
						>
							<Icon src={ADD_ICON} alt="" />
							{m.devices_add_device()}
						</CwButton>
						<CwButton
							id="location-settings-button"
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
					<CwCopy labels={cwCopyLabels()} value={row.dev_eui}>
						<span>{row.dev_eui}</span>
					</CwCopy>
				{:else}
					{defaultValue}
				{/if}
			{/snippet}

			{#snippet rowActions(row: LocationDeviceRow)}
				<div class="flex flex-row gap-2">
					<CwButton id={`location-row-${row.dev_eui}-view-button`} size="md" variant="info" onclick={() => handleViewDevice(row)}>
						<Icon src={EYE_ICON} alt={m.action_view()} />
					</CwButton>
					{#if data.hasSettings}
						<CwButton
							id={`location-row-${row.dev_eui}-settings-button`}
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
