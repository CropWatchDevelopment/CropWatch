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
		type CwDeviceRefreshScheduler,
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
	import ADD_ICON from '$lib/images/icons/add.svg';
	import ALERT_ICON from '$lib/images/icons/active_alert.svg';
	import CHECK_ICON from '$lib/images/icons/check_circle.svg';
	import DEVICE_ICON from '$lib/images/icons/device.svg';
	import EYE_ICON from '$lib/images/icons/eye.svg';
	import HISTORY_ICON from '$lib/images/icons/history.svg';
	import LOCATION_ICON from '$lib/images/icons/location.svg';
	import MAP_SEARCH_ICON from '$lib/images/icons/map_search.svg';
	import REFRESH_ICON from '$lib/images/icons/refresh.svg';
	import SETTINGS_ICON from '$lib/images/icons/settings.svg';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime.js';
	import type { PageProps } from './$types';
	import LocationMap from './LocationMap.svelte';
	import SignalStrength from '$lib/components/displays/SignalStrength/SignalStrength.svelte';
	import {
		currentSignal,
		signalBars
	} from '$lib/components/displays/SignalStrength/signalStrength';
	import {
		classifyHealth,
		formatRelative,
		newestTimestamp,
		readingTime,
		summarizeHealth,
		toFiniteNumber,
		type DeviceHealth,
		type LocationDeviceRow
	} from './location-overview';

	type HealthFilter = 'all' | DeviceHealth;

	let { data }: PageProps = $props();
	let loading = $state(false);
	let refreshing = $state(false);
	let healthFilter = $state<HealthFilter>('all');
	// Ticks so "x minutes ago" and the load-time offline check stay current.
	let now = $state(Date.now());

	const app = getAppContext();
	const locale = getLocale();

	// Live freshness and latest reading per device, driven by the refresh
	// scheduler: each device is refetched when its upload window expires.
	let freshnessByDevEui = $state<Record<string, CwDeviceFreshness>>({});
	let lastSeenByDevEui = $state<Record<string, string>>({});
	let latestByDevEui = $state<Record<string, Record<string, unknown>>>({});
	let scheduler: CwDeviceRefreshScheduler | null = null;

	$effect(() => {
		const timer = setInterval(() => (now = Date.now()), 30_000);
		return () => clearInterval(timer);
	});

	$effect(() => {
		const authToken = app.accessToken;
		const devices = data.allLocationDevices ?? [];
		if (!authToken || devices.length === 0) return;

		const api = new ApiService({ authToken });
		const instance = createCwDeviceRefreshScheduler({
			defaultIntervalMinutes: 10,
			fetcher: async (devEui) => {
				const latest = await api.getDashboardDeviceLatest(devEui);
				if (!latest) return null;
				return { lastSeenAt: readingTime(latest), data: latest };
			},
			onData: (devEui, result) => {
				if (typeof result.lastSeenAt === 'string') {
					lastSeenByDevEui[devEui] = result.lastSeenAt;
				}
				if (result.data && typeof result.data === 'object') {
					latestByDevEui[devEui] = result.data as Record<string, unknown>;
				}
			},
			onStateChange: (devEui, state) => {
				freshnessByDevEui[devEui] = state;
			}
		});

		instance.trackAll(
			devices.map((device) => ({
				id: String(device.dev_eui ?? ''),
				lastSeenAt:
					typeof device.last_data_updated_at === 'string' ? device.last_data_updated_at : null,
				uploadIntervalMinutes: toFiniteNumber(device.upload_interval)
			}))
		);
		// The scheduler only fetches devices whose upload window has passed, so
		// load every device's latest row once for the readings columns.
		for (const device of devices) void loadLatest(api, instance, String(device.dev_eui ?? ''));

		scheduler = instance;
		const detachVisibility = attachCwDeviceRefreshVisibility(instance);
		return () => {
			detachVisibility();
			instance.destroy();
			scheduler = null;
		};
	});

	// Reports through reportData rather than refreshNow: the scheduler treats a
	// refetch that returns the same reading as "no new data" and marks it stale.
	async function loadLatest(
		api: ApiService,
		instance: CwDeviceRefreshScheduler,
		devEui: string
	): Promise<void> {
		const latest = await api.getDashboardDeviceLatest(devEui).catch(() => null);
		if (!latest) return;
		latestByDevEui[devEui] = latest;
		const seenAt = readingTime(latest);
		if (seenAt) {
			lastSeenByDevEui[devEui] = seenAt;
			instance.reportData(devEui, seenAt);
		}
	}

	async function refreshAll() {
		const instance = scheduler;
		if (!instance || !app.accessToken || refreshing) return;
		refreshing = true;
		try {
			const api = new ApiService({ authToken: app.accessToken });
			await Promise.all(
				(data.allLocationDevices ?? []).map((device) =>
					loadLatest(api, instance, String(device.dev_eui ?? ''))
				)
			);
		} finally {
			refreshing = false;
		}
	}

	const selectedLocationId = $derived(page.params.location_id);
	const selectedLocationName = $derived((page.url.searchParams.get('location_name') ?? '').trim());
	const locationLabel = $derived(
		(data.currentLocation ?? '').trim() ||
			selectedLocationName ||
			(selectedLocationId
				? m.locations_location_with_id({ id: selectedLocationId })
				: m.locations_current_location())
	);

	// 0,0 is what an unset location falls back to, not a real farm.
	const coordinates = $derived(
		data.locationInfo?.lat != null &&
			data.locationInfo?.long != null &&
			!(data.locationInfo.lat === 0 && data.locationInfo.long === 0)
			? { lat: data.locationInfo.lat, long: data.locationInfo.long }
			: null
	);

	const deviceRows = $derived.by(() =>
		(data.allLocationDevices ?? []).map((device): LocationDeviceRow => {
			const devEui = String(device.dev_eui ?? '');
			const latest = latestByDevEui[devEui];
			// Never let a fetched reading move last-seen behind what the device row says.
			const lastSeen = newestTimestamp(
				lastSeenByDevEui[devEui] ?? null,
				typeof device.last_data_updated_at === 'string' ? device.last_data_updated_at : null
			);
			// Missing before the API sends gateway_signals: unknown, not "never heard".
			const link = Array.isArray(device.gateway_signals)
				? currentSignal(
						device.gateway_signals.map((reading) => ({
							rssi: toFiniteNumber(reading.rssi),
							snr: toFiniteNumber(reading.snr),
							last_update: reading.last_update
						}))
					)
				: undefined;
			return {
				dev_eui: devEui,
				name: String(device.name ?? device.dev_eui ?? m.devices_unnamed_device()),
				group: typeof device.group === 'string' && device.group.trim() ? device.group : null,
				health: classifyHealth(
					lastSeen,
					freshnessByDevEui[devEui],
					toFiniteNumber(device.upload_interval),
					now
				),
				lastSeen,
				temperature: toFiniteNumber(latest?.temperature_c),
				humidity: toFiniteNumber(latest?.humidity),
				co2: toFiniteNumber(latest?.co2),
				signal: link === undefined ? null : { rssi: link?.rssi ?? null, snr: link?.snr ?? null },
				lat: toFiniteNumber(device.lat),
				long: toFiniteNumber(device.long)
			};
		})
	);

	const rowsByDevEui = $derived(new Map(deviceRows.map((row) => [row.dev_eui, row])));
	const summary = $derived(summarizeHealth(deviceRows));
	const attentionRows = $derived(deviceRows.filter((row) => row.health !== 'online'));
	const devicePins = $derived(
		deviceRows.flatMap((row) =>
			row.lat != null && row.long != null && !(row.lat === 0 && row.long === 0)
				? [{ name: row.name, lat: row.lat, long: row.long, health: row.health }]
				: []
		)
	);

	const healthLabel: Record<DeviceHealth, () => string> = {
		online: m.status_online,
		offline: m.status_offline,
		never: m.location_detail_health_never
	};

	// Ring arcs on a circle whose circumference is 100 units, so each arc's
	// dash length is its percentage; offsets start the ring at 12 o'clock.
	const healthArcs = $derived.by(() => {
		let start = 0;
		return (['online', 'offline', 'never'] as const).map((health) => {
			const value = summary[health];
			const length = summary.total === 0 ? 0 : (value / summary.total) * 100;
			const arc = { health, value, label: healthLabel[health](), length, offset: 25 - start };
			start += length;
			return arc;
		});
	});

	const filterOptions = $derived<{ value: HealthFilter; label: string }[]>([
		{ value: 'all', label: m.location_detail_filter_all({ count: summary.total }) },
		{ value: 'online', label: m.location_detail_filter_online({ count: summary.online }) },
		{ value: 'offline', label: m.location_detail_filter_offline({ count: summary.offline }) },
		{ value: 'never', label: m.location_detail_filter_never({ count: summary.never }) }
	]);

	const columns: CwColumnDef<LocationDeviceRow>[] = [
		{ key: 'health', header: m.devices_status(), sortable: true, width: '10rem' },
		{ key: 'name', header: m.devices_device_name(), sortable: true },
		{
			key: 'temperature',
			header: m.location_detail_column_temperature(),
			sortable: true,
			width: '7rem',
			hideBelow: 'md'
		},
		{
			key: 'humidity',
			header: m.location_detail_column_humidity(),
			sortable: true,
			width: '7rem',
			hideBelow: 'md'
		},
		{
			key: 'co2',
			header: m.location_detail_column_co2(),
			sortable: true,
			width: '7rem',
			hideBelow: 'lg'
		},
		{
			key: 'lastSeen',
			header: m.location_detail_column_last_seen(),
			sortable: true,
			width: '10rem',
			hideBelow: 'sm'
		},
		{
			key: 'signal',
			header: m.gateways_signal(),
			sortable: true,
			width: '6rem',
			hideBelow: 'sm'
		},
		{
			key: 'dev_eui',
			header: m.devices_dev_eui_label(),
			sortable: true,
			width: '14rem',
			hideBelow: 'lg'
		}
	];

	function compareRows(a: LocationDeviceRow, b: LocationDeviceRow, column: string): number {
		switch (column) {
			case 'name':
				return a.name.localeCompare(b.name);
			case 'dev_eui':
				return a.dev_eui.localeCompare(b.dev_eui);
			case 'health':
				return a.health.localeCompare(b.health);
			case 'lastSeen':
				return (a.lastSeen ?? '').localeCompare(b.lastSeen ?? '');
			case 'temperature':
			case 'humidity':
			case 'co2':
				return (a[column] ?? -Infinity) - (b[column] ?? -Infinity);
			case 'signal': {
				// Unknown first, then by bars (0 = never heard), then by RSSI.
				const bars = (row: LocationDeviceRow) =>
					row.signal ? signalBars(row.signal.rssi, row.signal.snr) : -1;
				return bars(a) - bars(b) || (a.signal?.rssi ?? -Infinity) - (b.signal?.rssi ?? -Infinity);
			}
			default:
				return 0;
		}
	}

	async function loadData(query: CwTableQuery): Promise<CwTableResult<LocationDeviceRow>> {
		loading = true;
		try {
			const search = query.search.trim().toLowerCase();
			const filter = query.filters.health?.[0];
			let rows = deviceRows;

			if (filter) rows = rows.filter((row) => row.health === filter);
			if (search) {
				rows = rows.filter(
					(row) =>
						row.name.toLowerCase().includes(search) || row.dev_eui.toLowerCase().includes(search)
				);
			}
			if (query.sort) {
				const { column, direction } = query.sort;
				const factor = direction === 'asc' ? 1 : -1;
				rows = [...rows].sort((a, b) => compareRows(a, b, column) * factor);
			}

			const start = Math.max(0, (query.page - 1) * query.pageSize);
			return { rows: rows.slice(start, start + query.pageSize), total: rows.length };
		} finally {
			loading = false;
		}
	}

	function deviceHref(devEui: string): string {
		const query = new URLSearchParams({
			location_id: selectedLocationId ?? '',
			location_name: locationLabel || '',
			dev_eui: devEui
		});
		const path = resolve('/locations/[location_id]/devices/[dev_eui]', {
			location_id: selectedLocationId ?? '',
			dev_eui: devEui
		});
		return `${path}?${query.toString()}`;
	}
</script>

<AppPage width="xl">
	<div>
		<CwButton
			id="location-back-button"
			variant="secondary"
			size="sm"
			onclick={() => goto(resolve(backHref(page.url, '/') as '/'))}
		>
			&larr; {m.action_back_to_dashboard()}
		</CwButton>
	</div>

	<header class="location-header">
		<div class="location-header__titles">
			<div class="location-header__eyebrow">
				<Icon src={LOCATION_ICON} alt="" />
				<span>{m.nav_locations()}</span>
				{#if data.locationInfo?.group}
					<span aria-hidden="true">/</span>
					<span>{data.locationInfo.group}</span>
				{/if}
			</div>
			<h1 class="location-header__title">{locationLabel}</h1>
			<div class="location-header__chips">
				{#if summary.total > 0}
					<span
						class="location-chip"
						class:location-chip--success={summary.online === summary.total}
					>
						<span
							class="dot"
							class:dot--online={summary.online === summary.total}
							class:dot--warning={summary.online !== summary.total}
						></span>
						{m.location_detail_reporting({ online: summary.online, total: summary.total })}
					</span>
				{/if}
				{#if coordinates}
					<span class="location-chip location-chip--mono">
						{coordinates.lat.toFixed(4)}, {coordinates.long.toFixed(4)}
					</span>
				{:else}
					<span class="location-chip location-chip--warning"
						>{m.location_detail_no_coordinates()}</span
					>
				{/if}
				{#if selectedLocationId}
					<span class="location-chip">{m.location_detail_id({ id: selectedLocationId })}</span>
				{/if}
			</div>
		</div>

		<div class="location-header__actions">
			<CwButton
				id="location-refresh-button"
				variant="secondary"
				loading={refreshing}
				disabled={summary.total === 0}
				onclick={refreshAll}
			>
				<Icon src={REFRESH_ICON} alt="" />
				{m.location_detail_refresh()}
			</CwButton>
			{#if data.hasSettings && selectedLocationId}
				<CwButton
					id="location-settings-button"
					variant="secondary"
					onclick={() =>
						goto(
							resolve('/locations/[location_id]/settings', {
								location_id: String(+selectedLocationId)
							})
						)}
				>
					<Icon src={SETTINGS_ICON} alt="" />
					{m.location_detail_location_settings()}
				</CwButton>
			{/if}
			{#if selectedLocationId}
				<CwButton
					id="location-add-device-button"
					variant="primary"
					onclick={() =>
						goto(
							resolve('/locations/[location_id]/devices/create', {
								location_id: String(+selectedLocationId)
							})
						)}
				>
					<Icon src={ADD_ICON} alt="" />
					{m.devices_add_device()}
				</CwButton>
			{/if}
		</div>
	</header>

	<section class="kpi-grid" aria-label={m.location_detail_summary()}>
		<CwCard>
			<div class="kpi">
				<div class="kpi__head">
					<span>{m.location_detail_kpi_devices()}</span>
					<Icon src={DEVICE_ICON} alt="" class="kpi__icon kpi__icon--info" />
				</div>
				<span class="kpi__value">{summary.total}</span>
				<span class="kpi__sub">{m.location_detail_kpi_devices_sub()}</span>
			</div>
		</CwCard>
		<CwCard>
			<div class="kpi">
				<div class="kpi__head">
					<span>{m.location_detail_kpi_online()}</span>
					<Icon src={CHECK_ICON} alt="" class="kpi__icon kpi__icon--success" />
				</div>
				<span class="kpi__value kpi__value--success">{summary.online}</span>
				<span class="kpi__sub">
					{m.location_detail_kpi_online_sub({ percent: summary.percentOnline })}
				</span>
			</div>
		</CwCard>
		<CwCard>
			<div class="kpi">
				<div class="kpi__head">
					<span>{m.location_detail_kpi_attention()}</span>
					<Icon src={ALERT_ICON} alt="" class="kpi__icon kpi__icon--danger" />
				</div>
				<span class="kpi__value" class:kpi__value--danger={attentionRows.length > 0}>
					{attentionRows.length}
				</span>
				<span class="kpi__sub">
					{attentionRows.length > 0
						? m.location_detail_kpi_attention_sub({
								offline: summary.offline,
								never: summary.never
							})
						: m.location_detail_kpi_attention_none()}
				</span>
			</div>
		</CwCard>
		<CwCard>
			<div class="kpi">
				<div class="kpi__head">
					<span>{m.location_detail_kpi_last_uplink()}</span>
					<Icon src={HISTORY_ICON} alt="" class="kpi__icon" />
				</div>
				<span class="kpi__value">
					{formatRelative(summary.lastUplink?.lastSeen ?? null, now, locale) ?? '—'}
				</span>
				<span class="kpi__sub">
					{summary.lastUplink?.name ?? m.location_detail_kpi_last_uplink_none()}
				</span>
			</div>
		</CwCard>
	</section>

	<div class="overview-row">
		<CwCard
			title={m.location_detail_map_title()}
			headingLevel={2}
			elevated
			class={coordinates ? 'overview-row__map' : 'overview-row__map overview-row__map--empty'}
		>
			{#snippet actions()}
				{#if coordinates}
					<a
						class="button-link"
						href={`https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.long}`}
						target="_blank"
						rel="noopener noreferrer"
					>
						{m.location_detail_open_in_maps()}
					</a>
				{/if}
			{/snippet}
			{#if coordinates}
				<div class="map-body">
					<div class="map-body__map">
						<LocationMap
							lat={coordinates.lat}
							long={coordinates.long}
							zoom={data.locationInfo?.map_zoom}
							name={locationLabel}
							devices={devicePins}
						/>
					</div>
					<div class="map-body__coords">
						<span>
							{m.location_detail_latitude()}
							<span class="mono">{coordinates.lat}</span>
						</span>
						<span>
							{m.location_detail_longitude()}
							<span class="mono">{coordinates.long}</span>
						</span>
						<CwCopy labels={cwCopyLabels()} value={`${coordinates.lat}, ${coordinates.long}`}>
							<span class="sr-only">{m.location_detail_coordinates()}</span>
						</CwCopy>
					</div>
				</div>
			{:else}
				<div class="map-empty">
					<Icon src={MAP_SEARCH_ICON} alt="" class="map-empty__icon" />
					<p class="map-empty__title">{m.location_detail_no_coordinates_title()}</p>
					<p class="map-empty__body">{m.location_detail_no_coordinates_body()}</p>
				</div>
			{/if}
		</CwCard>

		<CwCard
			title={m.location_detail_health_title()}
			subtitle={m.location_detail_health_subtitle()}
			headingLevel={2}
			elevated
			class={coordinates
				? 'overview-row__health'
				: 'overview-row__health overview-row__health--wide'}
		>
			{#if summary.total === 0}
				<p class="muted">{m.location_detail_no_devices()}</p>
			{:else}
				<div class="health">
					<div class="health__chart">
						<div class="health-ring">
							<svg viewBox="0 0 42 42" class="health-ring__svg" aria-hidden="true">
								<circle class="health-ring__track" cx="21" cy="21" r="15.9155" />
								{#each healthArcs as arc (arc.health)}
									{#if arc.length > 0}
										<circle
											class={`health-ring__arc health-ring__arc--${arc.health}`}
											cx="21"
											cy="21"
											r="15.9155"
											stroke-dasharray={`${arc.length} ${100 - arc.length}`}
											stroke-dashoffset={arc.offset}
										/>
									{/if}
								{/each}
							</svg>
							<div class="health-ring__center">
								<span class="health-ring__value">{summary.percentOnline}%</span>
								<span class="health-ring__label">{m.location_detail_health_percent_online()}</span>
							</div>
						</div>
						<ul class="health__legend">
							{#each healthArcs as arc (arc.health)}
								<li>
									<span class={`dot dot--${arc.health}`}></span>
									<span class="health__legend-label">{arc.label}</span>
									<strong>{arc.value}</strong>
								</li>
							{/each}
						</ul>
					</div>

					<div class="health__attention">
						<h3 class="health__subtitle">{m.location_detail_needs_attention()}</h3>
						{#if attentionRows.length === 0}
							<div class="attention-item attention-item--ok">
								<Icon src={CHECK_ICON} alt="" />
								<span>{m.location_detail_all_healthy()}</span>
							</div>
						{:else}
							<ul class="health__attention-list">
								{#each attentionRows as row (row.dev_eui)}
									<li
										class="attention-item"
										class:attention-item--danger={row.health === 'offline'}
									>
										<span class={`dot dot--${row.health}`}></span>
										<div class="attention-item__text">
											<span class="attention-item__name">{row.name}</span>
											<span class="attention-item__meta">
												{row.health === 'offline'
													? m.location_detail_offline_since({
															when: formatRelative(row.lastSeen, now, locale) ?? '—'
														})
													: m.location_detail_never_reported_body()}
											</span>
										</div>
										<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- deviceHref() resolves the path -->
										<a class="location-link" href={deviceHref(row.dev_eui)}>{m.action_view()}</a>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				</div>
			{/if}
		</CwCard>
	</div>

	<CwCard
		title={m.location_detail_devices_title()}
		subtitle={m.location_detail_devices_subtitle({ count: summary.total })}
		headingLevel={2}
		elevated
	>
		<div class="status-filter" role="group" aria-label={m.location_detail_filter_label()}>
			{#each filterOptions as option (option.value)}
				<button
					type="button"
					class="status-filter__chip"
					class:status-filter__chip--active={healthFilter === option.value}
					aria-pressed={healthFilter === option.value}
					onclick={() => (healthFilter = option.value)}
				>
					{#if option.value !== 'all'}
						<span class={`dot dot--${option.value}`}></span>
					{/if}
					{option.label}
				</button>
			{/each}
		</div>

		<CwDataTable
			id="location-table"
			labels={cwDataTableLabels()}
			{columns}
			{loadData}
			{loading}
			filters={healthFilter === 'all' ? {} : { health: [healthFilter] }}
			rowKey="dev_eui"
			columnAlign="left"
			searchable
			pageSize={10}
			rowActionsHeader={m.common_actions()}
		>
			{#snippet cell(
				row: LocationDeviceRow,
				col: CwColumnDef<LocationDeviceRow>,
				defaultValue: string
			)}
				<!-- Render from the live row so status and readings update between table loads. -->
				{@const live = rowsByDevEui.get(row.dev_eui) ?? row}
				{#if col.key === 'health'}
					<span class={`status-pill status-pill--${live.health}`}>
						<span class={`dot dot--${live.health}`}></span>
						{healthLabel[live.health]()}
					</span>
				{:else if col.key === 'temperature'}
					{live.temperature != null ? `${live.temperature.toFixed(1)} °C` : '—'}
				{:else if col.key === 'humidity'}
					{live.humidity != null ? `${Math.round(live.humidity)} %` : '—'}
				{:else if col.key === 'co2'}
					{live.co2 != null ? `${Math.round(live.co2)} ppm` : '—'}
				{:else if col.key === 'lastSeen'}
					{formatRelative(live.lastSeen, now, locale) ?? m.location_detail_never()}
				{:else if col.key === 'signal'}
					{#if live.signal}
						<!-- Both null (never heard by a gateway): empty bars with the "no" sign. -->
						<SignalStrength rssi={live.signal.rssi} snr={live.signal.snr} />
					{:else}
						—
					{/if}
				{:else if col.key === 'dev_eui'}
					<CwCopy labels={cwCopyLabels()} value={row.dev_eui}>
						<span class="mono">{row.dev_eui}</span>
					</CwCopy>
				{:else}
					{defaultValue}
				{/if}
			{/snippet}

			{#snippet rowActions(row: LocationDeviceRow)}
				<div class="flex flex-row gap-2">
					<CwButton
						id={`location-row-${row.dev_eui}-view-button`}
						size="md"
						variant="info"
						onclick={() => window.location.assign(deviceHref(row.dev_eui))}
					>
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
									resolve('/locations/[location_id]/devices/[dev_eui]/settings', {
										location_id: String(selectedLocationId),
										dev_eui: row.dev_eui
									})
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

	{#if data.locationInfo}
		<CwCard title={m.location_detail_details_title()} headingLevel={2} elevated>
			<div class="details">
				<dl class="details__list">
					<dt>{m.common_name()}</dt>
					<dd>{data.locationInfo.name}</dd>
					<dt>{m.common_group()}</dt>
					<dd>{data.locationInfo.group ?? '—'}</dd>
					<dt>{m.common_description()}</dt>
					<dd>{data.locationInfo.description ?? '—'}</dd>
				</dl>
				<dl class="details__list">
					<dt>{m.location_detail_created()}</dt>
					<dd>
						{new Date(data.locationInfo.created_at).toLocaleDateString(locale, {
							dateStyle: 'medium'
						})}
					</dd>
					<dt>{m.location_detail_coordinates()}</dt>
					<dd class="mono">{coordinates ? `${coordinates.lat}, ${coordinates.long}` : '—'}</dd>
					<dt>{m.location_detail_location_id()}</dt>
					<dd class="mono">{data.locationInfo.location_id}</dd>
				</dl>
			</div>
		</CwCard>
	{/if}
</AppPage>

<style>
	.location-header {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: var(--cw-space-4);
	}

	.location-header__titles {
		display: flex;
		flex-direction: column;
		gap: var(--cw-space-2);
		min-width: 0;
	}

	.location-header__eyebrow {
		display: flex;
		align-items: center;
		gap: var(--cw-space-2);
		font-size: var(--cw-text-sm);
		color: var(--cw-text-muted);
	}

	.location-header__title {
		margin: 0;
		font-size: var(--cw-text-3xl);
		font-weight: var(--cw-font-bold);
		line-height: var(--cw-leading-tight);
		color: var(--cw-text-primary);
		overflow-wrap: anywhere;
	}

	.location-header__chips,
	.location-header__actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--cw-space-2);
	}

	.location-chip {
		display: inline-flex;
		align-items: center;
		gap: var(--cw-space-2);
		height: 1.5rem;
		padding: 0 var(--cw-space-3);
		border-radius: var(--cw-radius-pill);
		font-size: var(--cw-text-xs);
		font-weight: var(--cw-font-medium);
		background: var(--cw-bg-muted);
		color: var(--cw-text-secondary);
		border: 1px solid var(--cw-border-muted);
		white-space: nowrap;
	}

	.location-chip--success {
		background: var(--cw-tone-success-bg-subtle);
		color: var(--cw-tone-success-text);
		border-color: var(--cw-tone-success-border);
	}

	.location-chip--warning {
		background: var(--cw-tone-warning-bg-subtle);
		color: var(--cw-tone-warning-text);
		border-color: var(--cw-tone-warning-border);
	}

	.location-chip--mono,
	.mono {
		font-family: var(--cw-font-mono);
	}

	.kpi-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr));
		gap: var(--cw-space-4);
	}

	.kpi {
		display: flex;
		flex-direction: column;
		gap: var(--cw-space-2);
	}

	.kpi__head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		font-size: var(--cw-text-sm);
		font-weight: var(--cw-font-medium);
		color: var(--cw-text-muted);
	}

	.kpi__value {
		font-size: var(--cw-text-3xl);
		font-weight: var(--cw-font-bold);
		line-height: var(--cw-leading-tight);
		color: var(--cw-text-primary);
		font-variant-numeric: tabular-nums;
	}

	.kpi__value--success {
		color: var(--cw-tone-success-text);
	}

	.kpi__value--danger {
		color: var(--cw-tone-danger-text);
	}

	.kpi__sub {
		font-size: var(--cw-text-xs);
		color: var(--cw-text-muted);
	}

	.overview-row {
		display: flex;
		flex-wrap: wrap;
		gap: var(--cw-space-4);
		align-items: stretch;
	}

	.overview-row :global(.overview-row__map) {
		flex: 2 1 32rem;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.overview-row :global(.overview-row__map--empty) {
		flex: 1 1 20rem;
	}

	.overview-row :global(.overview-row__map > .cw-card__body) {
		flex: 1;
		display: flex;
		flex-direction: column;
	}

	.overview-row :global(.overview-row__health) {
		flex: 1 1 20rem;
		min-width: 0;
	}

	.overview-row :global(.overview-row__health--wide) {
		flex: 2 1 32rem;
	}

	.map-body {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: var(--cw-space-3);
	}

	.map-body__map {
		flex: 1;
		min-height: 21rem;
		display: flex;
	}

	.map-body__coords {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--cw-space-2) var(--cw-space-6);
		font-size: var(--cw-text-sm);
		color: var(--cw-text-muted);
	}

	.map-body__coords .mono {
		color: var(--cw-text-primary);
	}

	.map-empty {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--cw-space-3);
		text-align: center;
		padding: var(--cw-space-8) var(--cw-space-6);
		border-radius: var(--cw-radius-lg);
		border: 1px dashed var(--cw-border-default);
		background: var(--cw-bg-elevated2);
	}

	.map-empty :global(.map-empty__icon) {
		width: 2.5rem;
		height: 2.5rem;
		color: var(--cw-text-muted);
	}

	.map-empty__title {
		margin: 0;
		font-size: var(--cw-text-base);
		font-weight: var(--cw-font-semibold);
		color: var(--cw-text-primary);
	}

	.map-empty__body,
	.muted {
		margin: 0;
		font-size: var(--cw-text-sm);
		color: var(--cw-text-muted);
		max-width: 36ch;
	}

	.location-link {
		font-size: var(--cw-text-sm);
		font-weight: var(--cw-font-medium);
		color: var(--cw-info-300);
		white-space: nowrap;
	}

	.location-link:hover {
		color: var(--cw-info-200);
	}

	.health {
		display: flex;
		flex-direction: column;
		gap: var(--cw-space-4);
	}

	.health__chart {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--cw-space-5);
	}

	.health-ring {
		position: relative;
		width: 7.5rem;
		height: 7.5rem;
		flex: none;
	}

	.health-ring__svg {
		width: 100%;
		height: 100%;
	}

	.health-ring__track,
	.health-ring__arc {
		fill: none;
		stroke-width: 5;
	}

	.health-ring__track {
		stroke: var(--cw-bg-muted);
	}

	.health-ring__arc--online {
		stroke: var(--cw-success-400);
	}

	.health-ring__arc--offline {
		stroke: var(--cw-danger-400);
	}

	.health-ring__arc--never {
		stroke: var(--cw-status-loading);
	}

	.health-ring__center {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		line-height: 1.1;
		pointer-events: none;
	}

	.health-ring__value {
		font-size: var(--cw-text-2xl);
		font-weight: var(--cw-font-bold);
		color: var(--cw-text-primary);
		font-variant-numeric: tabular-nums;
	}

	.health-ring__label {
		font-size: var(--cw-text-xs);
		color: var(--cw-text-muted);
	}

	.health__legend {
		list-style: none;
		margin: 0;
		padding: 0;
		flex: 1 1 9rem;
		display: flex;
		flex-direction: column;
		gap: var(--cw-space-3);
		font-size: var(--cw-text-sm);
		color: var(--cw-text-primary);
	}

	.health__legend li {
		display: flex;
		align-items: center;
		gap: var(--cw-space-2);
	}

	.health__legend-label {
		flex: 1;
	}

	.health__legend strong {
		font-weight: var(--cw-font-semibold);
		font-variant-numeric: tabular-nums;
	}

	.dot {
		width: 0.5rem;
		height: 0.5rem;
		border-radius: var(--cw-radius-full);
		flex: none;
	}

	.dot--online {
		background: var(--cw-success-400);
	}

	.dot--offline {
		background: var(--cw-danger-400);
	}

	.dot--never {
		background: var(--cw-status-loading);
	}

	.dot--warning {
		background: var(--cw-warning-400);
	}

	.status-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		height: 1.5rem;
		padding: 0 0.625rem;
		border-radius: var(--cw-radius-pill);
		font-size: var(--cw-text-xs);
		font-weight: var(--cw-font-medium);
		white-space: nowrap;
		border: 1px solid var(--cw-border-muted);
		background: var(--cw-bg-muted);
		color: var(--cw-text-secondary);
	}

	.status-pill--online {
		background: var(--cw-tone-success-bg-subtle);
		border-color: var(--cw-tone-success-border);
		color: var(--cw-tone-success-text);
	}

	.status-pill--offline {
		background: var(--cw-tone-danger-bg-subtle);
		border-color: var(--cw-tone-danger-border);
		color: var(--cw-tone-danger-text);
	}

	.kpi :global(.kpi__icon) {
		width: 1.25rem;
		height: 1.25rem;
		color: var(--cw-text-muted);
	}

	.kpi :global(.kpi__icon--info) {
		color: var(--cw-info-300);
	}

	.kpi :global(.kpi__icon--success) {
		color: var(--cw-success-400);
	}

	.kpi :global(.kpi__icon--danger) {
		color: var(--cw-danger-400);
	}

	.button-link {
		display: inline-flex;
		align-items: center;
		height: var(--cw-control-h-sm);
		padding: 0 var(--cw-control-px-sm);
		border-radius: var(--cw-control-radius);
		font-size: var(--cw-control-text-sm);
		font-weight: var(--cw-font-medium);
		white-space: nowrap;
		text-decoration: none;
		background: var(--cw-button-secondary-bg);
		border: 1px solid var(--cw-button-secondary-border);
		color: var(--cw-button-secondary-text);
		box-shadow: var(--cw-button-secondary-shadow);
	}

	.button-link:hover {
		background: var(--cw-button-secondary-bg-hover);
		border-color: var(--cw-button-secondary-border-hover);
		color: var(--cw-button-secondary-text-hover);
	}

	.button-link:focus-visible {
		outline: var(--cw-focus-ring-width) solid var(--cw-primary-500);
		outline-offset: var(--cw-focus-ring-offset);
	}

	.health__attention {
		border-top: 1px solid var(--cw-border-muted);
		padding-top: var(--cw-space-4);
		display: flex;
		flex-direction: column;
		gap: var(--cw-space-3);
	}

	.health__subtitle {
		margin: 0;
		font-size: var(--cw-text-sm);
		font-weight: var(--cw-font-semibold);
		color: var(--cw-text-primary);
	}

	.health__attention-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--cw-space-2);
		max-height: 16rem;
		overflow-y: auto;
	}

	.attention-item {
		display: flex;
		align-items: center;
		gap: var(--cw-space-3);
		padding: var(--cw-space-2) var(--cw-space-3);
		border-radius: var(--cw-radius-lg);
		background: var(--cw-bg-muted);
		border: 1px solid var(--cw-border-muted);
		font-size: var(--cw-text-sm);
		color: var(--cw-text-primary);
	}

	.attention-item--danger {
		background: var(--cw-tone-danger-bg-subtle);
		border-color: var(--cw-tone-danger-border);
	}

	.attention-item--ok {
		background: var(--cw-tone-success-bg-subtle);
		border-color: var(--cw-tone-success-border);
		color: var(--cw-tone-success-text);
	}

	.attention-item__text {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}

	.attention-item__name {
		font-weight: var(--cw-font-medium);
		overflow-wrap: anywhere;
	}

	.attention-item__meta {
		font-size: var(--cw-text-xs);
		color: var(--cw-text-muted);
	}

	.attention-item--danger .attention-item__meta {
		color: var(--cw-tone-danger-text);
	}

	.status-filter {
		display: flex;
		flex-wrap: wrap;
		gap: var(--cw-space-2);
		margin-bottom: var(--cw-space-3);
	}

	.status-filter__chip {
		display: inline-flex;
		align-items: center;
		gap: var(--cw-space-2);
		min-height: var(--cw-control-h-sm);
		padding: 0 var(--cw-space-3);
		border-radius: var(--cw-radius-pill);
		font: inherit;
		font-size: var(--cw-text-xs);
		font-weight: var(--cw-font-medium);
		background: var(--cw-bg-muted);
		color: var(--cw-text-secondary);
		border: 1px solid var(--cw-border-muted);
		cursor: pointer;
		transition: background-color var(--cw-duration-fast) var(--cw-ease-default);
	}

	.status-filter__chip:hover {
		background: var(--cw-bg-subtle);
	}

	.status-filter__chip:focus-visible {
		outline: var(--cw-focus-ring-width) solid var(--cw-primary-500);
		outline-offset: var(--cw-focus-ring-offset);
	}

	.status-filter__chip--active {
		background: var(--cw-primary-700);
		border-color: var(--cw-primary-600);
		color: #ffffff;
	}

	.details {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr));
		gap: var(--cw-space-6);
	}

	.details__list {
		display: grid;
		grid-template-columns: minmax(0, 9rem) minmax(0, 1fr);
		gap: var(--cw-space-3) var(--cw-space-4);
		margin: 0;
		font-size: var(--cw-text-sm);
	}

	.details__list dt {
		color: var(--cw-text-muted);
	}

	.details__list dd {
		margin: 0;
		color: var(--cw-text-primary);
		overflow-wrap: anywhere;
	}
</style>
