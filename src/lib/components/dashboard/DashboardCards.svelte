<script module lang="ts">
	/** Location-card layout: aligned responsive grid, or tightly-packed masonry. */
	export type CardLayout = 'grid' | 'masonry';
</script>

<script lang="ts">
	import { onMount, onDestroy, untrack } from 'svelte';
	import {
		attachCwDeviceRefreshVisibility,
		createCwDeviceRefreshScheduler,
		normalizeCwUploadIntervalMinutes,
		CwButton,
		CwDuration,
		CwLocationCard,
		CwSensorCard,
		CwSpinner,
		type CwDeviceRefreshResult,
		type CwDeviceRefreshScheduler
	} from '@cropwatchdevelopment/cwui';
	import { ApiService } from '$lib/api/api.service';
	import type { DashboardLocationGroup, DashboardRow } from '$lib/api/api.dtos';
	import { getAppContext } from '$lib/appContext.svelte';
	import {
		formatSensorValue,
		isDisplayableColumn,
		labelFor,
		type SensorFormat
	} from '$lib/sensor-labels';
	import { m } from '$lib/paraglide/messages.js';
	import { goto } from '$app/navigation';
	import { onAppForeground } from '$lib/utils/onAppForeground';
	import TodayDataNoteDialog from '$lib/components/displays/AirDisplay/dialogs/TodayDataNoteDialog.svelte';

	interface Filters {
		group: string;
		locationGroup: string;
		location: string;
		name: string;
	}

	const PAGE_SIZE = 20;

	let { filters, cardLayout = 'grid' }: { filters: Filters; cardLayout?: CardLayout } =
		$props();

	const app = getAppContext();

	let groups = $state<DashboardLocationGroup[]>([]);
	let total = $state(0);
	let loading = $state(false);
	// True while a full reload (initial load or filter change) is in flight, as
	// opposed to a "load more" append. Drives the full-area loading spinner.
	let reloading = $state(false);
	// Refetches each device when its own upload window (last seen +
	// upload_interval + grace) expires, with capped backoff while it stays
	// stale — replaces the old fixed 10-minute full-page poll.
	let refreshScheduler: CwDeviceRefreshScheduler | null = null;

	// dev_eui -> latest row | 'loading' | undefined (not requested yet).
	let detailsByDevEui = $state<Record<string, Record<string, unknown> | 'loading'>>({});

	const thousandFormatter = new Intl.NumberFormat('en', {
		notation: 'compact',
		compactDisplay: 'short'
	});

	function buildQuery(overrides: { skip: number; take: number }) {
		return {
			skip: overrides.skip,
			take: overrides.take,
			group: filters.group || undefined,
			locationGroup: filters.locationGroup || undefined,
			location: filters.location || undefined,
			name: filters.name || undefined
		};
	}

	async function loadPage(opts: { reset?: boolean } = {}) {
		if (loading) {
			console.debug('[dashboard] loadPage skipped — already loading');
			return;
		}
		// On a fresh login (new tab) the auth token can still be undefined when
		// this component first mounts. Stay in the loading state instead of
		// fetching with no token (which yields an empty "no devices" view) — the
		// effect below re-runs once app.accessToken becomes available.
		if (!app.accessToken) {
			if (opts.reset) reloading = true;
			console.debug('[dashboard] loadPage deferred — auth token not ready');
			return;
		}
		loading = true;
		reloading = !!opts.reset;
		const skip = opts.reset ? 0 : groups.length;
		console.debug('[dashboard] loadPage', { reset: !!opts.reset, skip, take: PAGE_SIZE });
		try {
			const api = new ApiService({ authToken: app.accessToken });
			const page = await api.getDashboardLocations(buildQuery({ skip, take: PAGE_SIZE }));
			console.debug('[dashboard] loadPage result', {
				returned: page.groups.length,
				total: page.total
			});
			groups = opts.reset ? page.groups : [...groups, ...page.groups];
			total = page.total;
			preloadOpenCardDetails(page.groups);
			syncRefreshScheduler();
		} catch (err) {
			console.error('Failed to load dashboard page', err);
		} finally {
			loading = false;
			reloading = false;
		}
	}

	async function refreshLoaded() {
		if (groups.length === 0) return;
		try {
			const api = new ApiService({ authToken: app.accessToken });
			const page = await api.getDashboardLocations(
				buildQuery({ skip: 0, take: Math.max(groups.length, PAGE_SIZE) })
			);

			// Patch existing devices in place by dev_eui so card positions don't shift.
			const newRowsByDevEui = new Map<string, DashboardRow>();
			for (const g of page.groups) for (const d of g.devices) newRowsByDevEui.set(d.dev_eui, d);

			for (const existingGroup of groups) {
				for (const existing of existingGroup.devices) {
					const next = newRowsByDevEui.get(existing.dev_eui);
					if (next) {
						existing.latest = next.latest;
						existing.last_data_updated_at = next.last_data_updated_at;
						existing.upload_interval = next.upload_interval;
						existing.error_status = next.error_status;
					}
				}
			}
			total = page.total;
			syncRefreshScheduler();
		} catch (err) {
			console.error('Failed to refresh dashboard', err);
		}
	}

	function findRowByDevEui(devEui: string): DashboardRow | null {
		for (const group of groups) {
			for (const row of group.devices) {
				if (row.dev_eui === devEui) return row;
			}
		}
		return null;
	}

	function readLatestColumn(
		latest: Record<string, unknown>,
		column: string | null | undefined
	): number | string | boolean | null {
		if (!column || column === '-') return null;
		const value = latest[column];
		return value === undefined || value === null ? null : (value as number | string | boolean);
	}

	/** Per-device refetch for the scheduler: the latest full data row. */
	async function fetchLatestForRefresh(devEui: string): Promise<CwDeviceRefreshResult | null> {
		if (!app.accessToken) return null;
		const api = new ApiService({ authToken: app.accessToken });
		const latest = await api.getDashboardDeviceLatest(devEui);
		if (!latest) return null;
		const createdAt = typeof latest.created_at === 'string' ? latest.created_at : null;
		return { lastSeenAt: createdAt, data: latest };
	}

	/** Patch a single card in place from a refetched latest-data row. */
	function applyRefreshedLatest(devEui: string, result: CwDeviceRefreshResult) {
		const latest = result.data as Record<string, unknown> | undefined;
		const row = findRowByDevEui(devEui);
		if (!row || !latest) return;

		const createdAt = typeof latest.created_at === 'string' ? latest.created_at : null;
		row.latest = {
			created_at: createdAt ?? row.latest?.created_at ?? null,
			primary: readLatestColumn(latest, row.device_type.primary_data_v2),
			secondary: readLatestColumn(latest, row.device_type.secondary_data_v2)
		};
		if (createdAt) {
			row.last_data_updated_at = createdAt;
		}
		// Keep the expanded details panel in sync when it is already loaded.
		if (detailsByDevEui[devEui] !== undefined && detailsByDevEui[devEui] !== 'loading') {
			detailsByDevEui[devEui] = latest;
		}
	}

	/** (Re)register every visible device and drop ones no longer on screen. */
	function syncRefreshScheduler() {
		if (!refreshScheduler) return;

		const seen = new Set<string>();
		for (const group of groups) {
			for (const row of group.devices) {
				seen.add(row.dev_eui);
				refreshScheduler.track({
					id: row.dev_eui,
					lastSeenAt: row.last_data_updated_at ?? row.latest?.created_at ?? null,
					uploadIntervalMinutes:
						normalizeCwUploadIntervalMinutes(row.upload_interval) ??
						normalizeCwUploadIntervalMinutes(row.device_type.default_upload_interval)
				});
			}
		}
		for (const devEui of refreshScheduler.states.keys()) {
			if (!seen.has(devEui)) refreshScheduler.untrack(devEui);
		}
	}

	async function loadDetails(devEui: string) {
		if (detailsByDevEui[devEui] !== undefined) return;
		detailsByDevEui[devEui] = 'loading';
		try {
			const api = new ApiService({ authToken: app.accessToken });
			const latest = await api.getDashboardDeviceLatest(devEui);
			detailsByDevEui[devEui] = latest ?? {};
		} catch (err) {
			console.error(`Failed to load details for ${devEui}`, err);
			delete detailsByDevEui[devEui];
		}
	}

	// CwSensorCard persists its expanded state to localStorage under this prefix.
	// When a card mounts already-expanded, it does NOT fire onExpand — so we must
	// proactively load details for any newly-rendered card the user had open.
	function isPersistedOpen(devEui: string): boolean {
		if (typeof window === 'undefined') return false;
		return window.localStorage.getItem(`cw-sensor-card-expand:dashboard:${devEui}`) === 'true';
	}

	function preloadOpenCardDetails(newGroups: DashboardLocationGroup[]) {
		for (const g of newGroups) {
			for (const d of g.devices) {
				if (isPersistedOpen(d.dev_eui)) loadDetails(d.dev_eui);
			}
		}
	}

	function primaryProps(row: DashboardRow) {
		const col = row.device_type.primary_data_v2;
		if (!col || col === '-') return { value: null, unit: '', label: undefined, icon: undefined };
		const def = labelFor(col);
		return { ...readingProps(def.format, def.unit, row.latest?.primary), icon: def.icon };
	}

	function secondaryProps(row: DashboardRow) {
		const col = row.device_type.secondary_data_v2;
		if (!col || col === '' || col === '-')
			return { value: null, unit: '', label: undefined, icon: undefined };
		const def = labelFor(col);
		return { ...readingProps(def.format, def.unit, row.latest?.secondary), icon: def.icon };
	}

	// A non-empty `error_status` on the device row means the sensor has reported a
	// fault. Mirrors the device-detail page's convention. The raw status value is a
	// device-side code (e.g. "-55"), so the card shows a localized message instead.
	function hasDeviceError(row: DashboardRow): boolean {
		return typeof row.error_status === 'string' && row.error_status.trim().length > 0;
	}

	function detailEntries(details: Record<string, unknown>) {
		return Object.entries(details)
			.filter(([col, value]) => isDisplayableColumn(col) && value !== null && value !== undefined)
			.map(([col, value]) => {
				const def = labelFor(col);
				return { col, def, formatted: formatSensorValue(value, def.format) };
			});
	}

	function readingProps(format: SensorFormat, unit: string, raw: unknown) {
		const v = formatSensorValue(raw, format);
		if (format === 'boolean') {
			return { value: null, unit: '', label: v.display };
		}
		return { value: v.numeric, unit, label: undefined };
	}

	$effect(() => {
		// Track filter values AND the auth token so this effect re-runs on filter
		// change and once the token arrives after a fresh login — never on internal
		// state writes from loadPage itself.
		const _loadFingerprint =
			(app.accessToken ?? '') +
			'|' +
			filters.group +
			'|' +
			filters.locationGroup +
			'|' +
			filters.location +
			'|' +
			filters.name;
		void _loadFingerprint;
		untrack(() => {
			loadPage({ reset: true });
		});
	});

	const GoToDetails = (row: DashboardRow) => {
		if (!row.location?.location_id) {
			console.warn('Device has no location, cannot go to details', { devEui: row.dev_eui });
			return;
		}
		// Carry the originating page (and active group filter) so the device
		// page's back button can return to the filtered dashboard.
		const params = new URLSearchParams({ backTo: '/' });
		if (filters.locationGroup) params.set('filter', filters.locationGroup);
		loading = true;
		goto(`/locations/${row.location.location_id}/devices/${row.dev_eui}?${params.toString()}`);
	};

	let removeForegroundListener: (() => void) | null = null;
	let detachRefreshVisibility: (() => void) | null = null;

	onMount(() => {
		refreshScheduler = createCwDeviceRefreshScheduler({
			fetcher: fetchLatestForRefresh,
			onData: applyRefreshedLatest
		});
		detachRefreshVisibility = attachCwDeviceRefreshVisibility(refreshScheduler);
		syncRefreshScheduler();

		// Pull fresh data whenever the user returns to the tab/app, so devices
		// that went "stale" while the page sat in the background don't linger as
		// false offline indicators. syncRefreshScheduler() inside refreshLoaded
		// re-arms each device from its fresh last-seen timestamp.
		removeForegroundListener = onAppForeground(() => {
			void refreshLoaded();
		});
	});

	onDestroy(() => {
		detachRefreshVisibility?.();
		refreshScheduler?.destroy();
		refreshScheduler = null;
		removeForegroundListener?.();
	});
</script>

<div class="dashboard-cards__scroll">
	{#if reloading}
		<div class="dashboard-cards__loading">
			<CwSpinner size="xl" />
		</div>
	{:else if groups.length === 0}
		<p class="dashboard-cards__empty">{m.dashboard_no_devices()}</p>
	{:else}
		<div class="dashboard-cards__groups dashboard-cards__groups--{cardLayout}">
			{#each groups as group (group.key)}
				<CwLocationCard
					title={group.location?.name ?? m.dashboard_no_location()}
					class="dashboard-cards__location"
					onNavigate={() => {
						const locationId = group.location?.location_id;
						if (locationId == null) return;
						// Carry the originating page (+ active group filter) so the location
						// page's back button returns to the filtered dashboard.
						const params = new URLSearchParams({ backTo: '/' });
						if (filters.locationGroup) params.set('filter', filters.locationGroup);
						goto(`/locations/${locationId}?${params.toString()}`);
					}}
				>
					{#each group.devices as row (row.dev_eui)}
						{@const primary = primaryProps(row)}
						{@const secondary = secondaryProps(row)}
						{@const details = detailsByDevEui[row.dev_eui]}
						{@const detailRows = details && details !== 'loading' ? detailEntries(details) : []}
						{@const lastSeen = row.last_data_updated_at ?? row.latest?.created_at ?? null}
						<CwSensorCard
							label={row.name}
							status={row.latest ? 'online' : 'loading'}
							hasError={hasDeviceError(row) ? m.dashboard_sensor_error() : null}
							primaryValue={primary.value}
							primaryUnit={primary.unit}
							primaryLabel={primary.label}
							primary_icon={primary.icon}
							secondaryValue={secondary.value}
							secondaryUnit={secondary.unit}
							secondaryLabel={secondary.label}
							secondary_icon={secondary.icon}
							lastSeenAt={row.last_data_updated_at ?? row.latest?.created_at ?? undefined}
							expireAfterMinutes={row.upload_interval ??
								row.device_type.default_upload_interval ??
								60}
							storageKey={`dashboard:${row.dev_eui}`}
							onExpand={() => loadDetails(row.dev_eui)}
						>
							{#if details === undefined || details === 'loading'}
								<p class="dashboard-cards__details-loading">{m.dashboard_loading_details()}</p>
							{:else if detailRows.length === 0}
								<p class="dashboard-cards__details-empty">{m.dashboard_no_data_yet()}</p>
							{:else}
								<dl class="dashboard-cards__details-list">
									{#each detailRows as { col, def, formatted } (col)}
										{#if def.label() != 'created_at'}
											<div class="dashboard-cards__details-row">
												<dt>{def.label()}</dt>
												<dd>
													{formatted.display}
													<small><sup>{def.unit ? ` ${def.unit}` : ''}</sup></small>
												</dd>
											</div>
										{/if}
									{/each}
									<!-- Always show Last Seen at the BOTTOM of the details list -->
									{#if lastSeen}
										<div class="dashboard-cards__details-row">
											<dt>Last Seen</dt>
											<dd>
												<CwDuration from={lastSeen} class="ml-1 text-xs text-slate-400" />
											</dd>
										</div>
									{/if}
									<!-- END OF LAST SEEN -->
								</dl>
								<span class="w-full flex flex-row gap-1">
								{#if row.device_type.data_table_v2 === 'cw_air_data'}
								<TodayDataNoteDialog devEui={row.dev_eui} />
								{/if}
								<CwButton
									variant="secondary"
									class="w-full"
									loading={loading}
									onclick={() => GoToDetails(row)}
								>
									Details
								</CwButton>
								</span>
							{/if}
						</CwSensorCard>
					{/each}
				</CwLocationCard>
			{/each}
		</div>

		{#if groups.length < total}
			<div class="dashboard-cards__pager">
				<CwButton
					size="sm"
					variant="secondary"
					onclick={() => {
						console.debug('[dashboard] load-more clicked', {
							groups: groups.length,
							total,
							loading
						});
						loadPage();
					}}
				>
					{loading ? '…' : m.dashboard_load_more()}
				</CwButton>
			</div>
		{/if}
	{/if}
</div>

<style>
	.dashboard-cards__scroll {
		flex: 1 1 auto;
		min-height: 0;
		overflow-y: auto;
		padding: 0.5rem 0.5rem 1.5rem;
	}

	.dashboard-cards__loading,
	.dashboard-cards__empty {
		display: flex;
		width: 100%;
		height: 100%;
		justify-content: center;
		padding: 3rem 0.5rem;
		color: var(--cw-text-muted, #94a3b8);
	}

	/* Responsive layout of location cards.
	   Columns — Mobile: 1. Tablet: 2. Small laptop: 3. Desktop: 5. */
	.dashboard-cards__groups :global(.dashboard-cards__location) {
		width: 100%;
		min-width: 0;
	}

	/* Grid layout: aligned rows — a tall card stretches its whole row, leaving
	   shorter neighbours with empty space below them. */
	.dashboard-cards__groups--grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 0.5rem;
		align-items: start;
	}

	/* Masonry layout: CSS columns pack cards top-to-bottom, so a short card
	   sits directly under another regardless of how tall neighbours are. */
	.dashboard-cards__groups--masonry {
		display: block;
		columns: 1;
		column-gap: 0.5rem;
	}
	.dashboard-cards__groups--masonry :global(.dashboard-cards__location) {
		break-inside: avoid;
		margin-bottom: 0.5rem;
	}

	@media (min-width: 640px) {
		.dashboard-cards__groups--grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.dashboard-cards__groups--masonry {
			columns: 2;
		}
	}
	@media (min-width: 1024px) {
		.dashboard-cards__groups--grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
		.dashboard-cards__groups--masonry {
			columns: 3;
		}
	}
	@media (min-width: 1280px) {
		.dashboard-cards__groups--grid {
			grid-template-columns: repeat(5, minmax(0, 1fr));
		}
		.dashboard-cards__groups--masonry {
			columns: 5;
		}
	}

	.dashboard-cards__details-list {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.25rem 1rem;
		margin: 0;
		padding: 0;
	}

	.dashboard-cards__details-row {
		display: contents;
	}

	.dashboard-cards__details-row dt {
		color: var(--cw-text-muted, #94a3b8);
		font-size: 0.875rem;
	}

	.dashboard-cards__details-row dd {
		margin: 0;
		font-weight: 600;
		text-align: right;
	}

	.dashboard-cards__details-loading,
	.dashboard-cards__details-empty {
		color: var(--cw-text-muted, #94a3b8);
		font-size: 0.875rem;
		margin: 0;
	}

	.dashboard-cards__pager {
		display: flex;
		justify-content: center;
		padding: 1.5rem 0;
	}
</style>
