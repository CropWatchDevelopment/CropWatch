<script lang="ts">
	import {
		createCwAlarmScheduler,
		CwDataList,
		CwLocationCard,
		CwSensorCard
	} from '@cropwatchdevelopment/cwui';
	import { CwButton, type CwSensorCardDetailRow } from '@cropwatchdevelopment/cwui';
	import { onDestroy, tick } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { getAppContext } from '$lib/appContext.svelte';
	import type { IDevice } from '$lib/interfaces/device.interface';
	import { m } from '$lib/paraglide/messages.js';
	import {
		buildDashboardLocationSensorCards,
		buildDeviceExpandedDetailRows,
		buildDeviceLoadingDetailRows,
		DASHBOARD_SENSOR_CARD_LOCATION_BATCH_SIZE,
		DASHBOARD_SENSOR_CARD_PREFETCH_REMAINING,
		type DashboardLocationSensorCard,
		type DashboardSensorCardEntry
	} from './device-cards';
	import {
		getDashboardDeviceNextRefreshDelayMs,
		refreshDashboardDevice
	} from './dashboard-device-refresh';
	import {
		mapDashboardPrimaryDataToDevice,
		mergeDashboardDevices,
		resolveDeviceTypeConfig
	} from './dashboard-device-data';
	import { ApiService } from '$lib/api/api.service';
	import { reactiveNow } from '$lib/utils/reactive-now.svelte';
	import { listDashboardDevices, type DashboardDeviceFilters } from './device-table';

	export type CardLayout = 'grid' | 'masonry';

	interface Props {
		filters: DashboardDeviceFilters;
		cardLayout?: CardLayout;
	}

	const SCROLL_CONTAINER_SELECTOR = '[data-dashboard-device-card-scroll="true"]';
	const PREFETCH_ROOT_MARGIN = '0px 0px 45% 0px';
	const SENSOR_EXPAND_STORAGE_PREFIX = 'cw-sensor-card-expand:';
	const VIEW_DEVICE_DETAILS_LABEL = 'View Device Details';

	let { filters, cardLayout = 'grid' }: Props = $props();

	const app = getAppContext();
	const cardRefreshAlarms = createCwAlarmScheduler();

	let viewportWidth = $state(0);
	let visibleLocationCountsByFilter = $state<Record<string, number>>({});
	let refreshingByDevEui = $state<Record<string, boolean>>({});
	/** null = loading; CwSensorCardDetailRow[] = loaded; absent key = not yet requested */
	let expandedDetailRowsByDevEui = $state<Record<string, CwSensorCardDetailRow[] | null>>({});
	let isExpandingLocationWindow = $state(false);
	let monitoredCardRefreshIds: string[] = [];
	// Dedupe guard for the missing-primary-data backfill effect below; a plain
	// Set is fine because we never want to render from it.
	const backfilledDevEuis = new Set<string>();

	let search = $derived(page.url.searchParams.get('search') ?? '');
	let filterKey = $derived(
		[filters.group, filters.locationGroup, filters.location, search].join('|')
	);
	let visibleLocationCount = $derived(
		visibleLocationCountsByFilter[filterKey] ?? DASHBOARD_SENSOR_CARD_LOCATION_BATCH_SIZE
	);
	let filteredDevices = $derived(
		listDashboardDevices(app.devices ?? [], app.locations ?? [], filters, search)
	);
	let locationCards = $derived(
		buildDashboardLocationSensorCards(
			filteredDevices,
			app.locations ?? [],
			reactiveNow.value,
			app.deviceTypeLookup
		)
	);
	let deviceRefreshPlans = $derived(
		filteredDevices.map((device) => ({
			device,
			alarmId: getCardRefreshAlarmId(device.dev_eui),
			delayMs: getDashboardDeviceNextRefreshDelayMs(device, reactiveNow.value)
		}))
	);
	let enableInfiniteScroll = $derived(viewportWidth > 0);
	let visibleLocationCards = $derived(locationCards.slice(0, visibleLocationCount));
	let canLoadMore = $derived(visibleLocationCards.length < locationCards.length);
	let prefetchTriggerIndex = $derived(
		Math.max(0, visibleLocationCards.length - DASHBOARD_SENSOR_CARD_PREFETCH_REMAINING - 1)
	);

	onDestroy(() => {
		cardRefreshAlarms.clear();
	});

	function getCardRefreshAlarmId(devEui: string): string {
		return `dashboard-device-card-refresh:${devEui}`;
	}

	function resolveLiveDashboardDevice(device: IDevice | null | undefined): IDevice | null {
		if (!device?.dev_eui) {
			return null;
		}

		return app.devices.find((candidate) => candidate.dev_eui === device.dev_eui) ?? device;
	}

	function queueCardRefresh(device: IDevice) {
		const delayMs = getDashboardDeviceNextRefreshDelayMs(device);
		if (delayMs == null) {
			return;
		}

		const devEui = device.dev_eui;
		const alarmId = getCardRefreshAlarmId(devEui);

		cardRefreshAlarms.schedule({
			id: alarmId,
			from: Date.now(),
			alarmAfterMs: delayMs,
			callback: () => {
				const liveDevice = resolveLiveDashboardDevice(device);
				if (!liveDevice) {
					return;
				}

				void refreshSingleDevice(liveDevice).finally(() => {
					const currentDevice = resolveLiveDashboardDevice(liveDevice);
					if (!currentDevice || !monitoredCardRefreshIds.includes(alarmId)) {
						return;
					}

					queueCardRefresh(currentDevice);
				});
			}
		});
	}

	// On mount and whenever locationCards or the access token become available,
	// check localStorage for any cards that were already expanded and pre-fetch their data.
	$effect(() => {
		if (!app.accessToken || locationCards.length === 0) return;

		for (const card of locationCards) {
			for (const sensor of card.sensors) {
				if (isSensorExpandedInStorage(card, sensor)) {
					void handleSensorExpand(sensor);
				}
			}
		}
	});

	// Backfill visible cards whose device came back from the bulk primary-data
	// endpoint without any reading. Scoped to visible cards so we don't spray
	// requests across hundreds of never-seen devices.
	$effect(() => {
		if (!app.accessToken) return;

		for (const card of visibleLocationCards) {
			for (const sensor of card.sensors) {
				if (backfilledDevEuis.has(sensor.devEui)) continue;
				if (sensor.sourceDevice.has_primary_data !== false) continue;

				backfilledDevEuis.add(sensor.devEui);
				void fetchAndMergeLatestDeviceData(sensor.devEui);
			}
		}
	});

	$effect(() => {
		if (!app.accessToken) {
			cardRefreshAlarms.clear();
			monitoredCardRefreshIds = [];
			return;
		}

		const nextRefreshIds: string[] = [];

		for (const { device, alarmId, delayMs } of deviceRefreshPlans) {
			if (delayMs == null) {
				cardRefreshAlarms.cancel(alarmId);
				continue;
			}

			nextRefreshIds.push(alarmId);
			queueCardRefresh(device);
		}

		for (const alarmId of monitoredCardRefreshIds) {
			if (!nextRefreshIds.includes(alarmId)) {
				cardRefreshAlarms.cancel(alarmId);
			}
		}

		monitoredCardRefreshIds = nextRefreshIds;
	});

	async function loadMoreLocations() {
		if (!canLoadMore || isExpandingLocationWindow) {
			return;
		}

		isExpandingLocationWindow = true;
		setVisibleLocationCount(visibleLocationCount + DASHBOARD_SENSOR_CARD_LOCATION_BATCH_SIZE);
		await tick();
		isExpandingLocationWindow = false;
	}

	function setVisibleLocationCount(nextCount: number) {
		visibleLocationCountsByFilter = {
			...visibleLocationCountsByFilter,
			[filterKey]: Math.min(
				Math.max(nextCount, DASHBOARD_SENSOR_CARD_LOCATION_BATCH_SIZE),
				locationCards.length
			)
		};
	}

	function prefetchWhenVisible(element: HTMLElement) {
		const scrollContainer = element.closest<HTMLElement>(SCROLL_CONTAINER_SELECTOR);
		if (!scrollContainer) {
			return;
		}

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					void loadMoreLocations();
				}
			},
			{
				root: scrollContainer,
				rootMargin: PREFETCH_ROOT_MARGIN,
				threshold: 0.01
			}
		);

		observer.observe(element);
		return () => observer.disconnect();
	}

	function normalizeWheelDelta(event: WheelEvent, scrollContainer: HTMLDivElement): number {
		switch (event.deltaMode) {
			case WheelEvent.DOM_DELTA_LINE:
				return event.deltaY * 16;
			case WheelEvent.DOM_DELTA_PAGE:
				return event.deltaY * scrollContainer.clientHeight;
			default:
				return event.deltaY;
		}
	}

	function canScrollVertically(element: HTMLElement, deltaY: number): boolean {
		if (deltaY < 0) {
			return element.scrollTop > 0;
		}

		if (deltaY > 0) {
			return element.scrollTop + element.clientHeight < element.scrollHeight;
		}

		return false;
	}

	function nestedScrollableAncestorCanHandleWheel(
		target: EventTarget | null,
		deltaY: number,
		scrollContainer: HTMLDivElement
	): boolean {
		if (!(target instanceof Element)) {
			return false;
		}

		let current: Element | null = target;
		while (current && current !== scrollContainer) {
			if (current instanceof HTMLElement) {
				const { overflowY } = window.getComputedStyle(current);
				const isScrollable =
					(overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
					current.scrollHeight > current.clientHeight;

				if (isScrollable && canScrollVertically(current, deltaY)) {
					return true;
				}
			}

			current = current.parentElement;
		}

		return false;
	}

	function handleWheelScroll(event: WheelEvent) {
		const scrollContainer = event.currentTarget;
		if (
			!(scrollContainer instanceof HTMLDivElement) ||
			event.defaultPrevented ||
			event.ctrlKey ||
			event.metaKey
		) {
			return;
		}

		const deltaY = normalizeWheelDelta(event, scrollContainer);
		if (deltaY === 0 || !canScrollVertically(scrollContainer, deltaY)) {
			return;
		}

		if (nestedScrollableAncestorCanHandleWheel(event.target, deltaY, scrollContainer)) {
			return;
		}

		event.preventDefault();
		scrollContainer.scrollTop += deltaY;
	}

	function handleNavigationFailure(error: unknown) {
		console.error('Failed to navigate from dashboard cards:', error);
	}

	function openLocation(card: DashboardLocationSensorCard) {
		if (card.locationId > 0) {
			goto(
				resolve('/locations/[location_id]', {
					location_id: String(card.locationId)
				})
			).catch(handleNavigationFailure);
			return;
		}

		const firstSensor = card.sensors[0];
		if (firstSensor) {
			openDeviceDetails(firstSensor);
		}
	}

	function openDeviceDetails(sensor: DashboardSensorCardEntry) {
		goto(
			resolve('/locations/[location_id]/devices/[dev_eui]', {
				location_id: String(sensor.locationId),
				dev_eui: sensor.devEui
			})
		).catch(handleNavigationFailure);
	}

	function resolveSensorDetailRows(sensor: DashboardSensorCardEntry): CwSensorCardDetailRow[] {
		const cachedRows = expandedDetailRowsByDevEui[sensor.devEui];
		if (cachedRows !== undefined) {
			return cachedRows ?? buildDeviceLoadingDetailRows(sensor.sensor.label);
		}

		return sensor.sensor.detailRows ?? [];
	}

	function readStoredExpandedState(storageKey: string): boolean | null {
		try {
			const stored = localStorage.getItem(SENSOR_EXPAND_STORAGE_PREFIX + storageKey);
			return stored == null ? null : JSON.parse(stored) === true;
		} catch {
			return null;
		}
	}

	function isSensorExpandedInStorage(
		card: DashboardLocationSensorCard,
		sensor: DashboardSensorCardEntry
	): boolean {
		const storedExpandedState = readStoredExpandedState(sensor.storageKey);
		if (storedExpandedState != null) {
			return storedExpandedState;
		}

		try {
			const legacyStored = localStorage.getItem(SENSOR_EXPAND_STORAGE_PREFIX + card.id);
			if (!legacyStored) {
				return false;
			}

			const expandedMap = JSON.parse(legacyStored) as Record<string, boolean>;
			return expandedMap[sensor.sensor.label] === true;
		} catch {
			return false;
		}
	}

	async function fetchAndMergeLatestDeviceData(
		devEui: string
	): Promise<Record<string, unknown> | null> {
		if (!app.accessToken) return null;

		try {
			const api = new ApiService({ authToken: app.accessToken });
			const rawData = await api.getDeviceLatestData(devEui);

			// Some fields arrive as string-encoded numbers (e.g. ec, moisture, ph) — coerce them
			const freshData = Object.fromEntries(
				Object.entries(rawData).map(([k, v]) => [
					k,
					typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : v
				])
			);

			// Merge into app.devices so the card header's primary/secondary
			// values re-derive — otherwise the card keeps whatever (possibly
			// empty) reading the bulk primary-data endpoint returned at page load.
			const freshDevice = mapDashboardPrimaryDataToDevice(freshData);
			app.devices = mergeDashboardDevices(app.devices, [freshDevice]);

			return freshData;
		} catch (err) {
			console.error(`Failed to load latest data for ${devEui}:`, err);
			return null;
		}
	}

	async function handleSensorExpand(sensor: DashboardSensorCardEntry) {
		if (!app.accessToken) {
			return;
		}

		const { devEui } = sensor;

		// Skip if already fetched or currently loading
		if (devEui in expandedDetailRowsByDevEui) {
			return;
		}

		// Mark as loading
		expandedDetailRowsByDevEui[devEui] = null;

		const freshData = await fetchAndMergeLatestDeviceData(devEui);
		if (!freshData) {
			// Remove loading marker so the user can retry by collapsing and re-expanding
			delete expandedDetailRowsByDevEui[devEui];
			return;
		}

		backfilledDevEuis.add(devEui);

		const liveDevice = resolveLiveDashboardDevice(sensor.sourceDevice) ?? sensor.sourceDevice;
		const typeConfig = resolveDeviceTypeConfig(liveDevice, app.deviceTypeLookup);
		expandedDetailRowsByDevEui[devEui] = buildDeviceExpandedDetailRows(
			freshData,
			typeConfig,
			sensor.sensor.label
		);
	}

	async function refreshSingleDevice(device: IDevice | null | undefined) {
		const targetDevice = resolveLiveDashboardDevice(device);
		const devEui = targetDevice?.dev_eui;

		if (!devEui || !app.accessToken || refreshingByDevEui[devEui]) {
			return;
		}

		refreshingByDevEui[devEui] = true;

		try {
			const latestDevice = await refreshDashboardDevice({
				app,
				devEui,
				targetDevice
			});

			// If this device's expanded detail rows were already loaded, rebuild them
			// with the fresh payload so CwDataList shows current values and an
			// up-to-date "Last Update" timestamp.
			if (latestDevice?.raw_data && devEui in expandedDetailRowsByDevEui) {
				// Apply the same string-to-number coercion used in handleSensorExpand
				const coercedData = Object.fromEntries(
					Object.entries(latestDevice.raw_data).map(([k, v]) => [
						k,
						typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))
							? Number(v)
							: v
					])
				);
				const sensorEntry = locationCards
					.flatMap((c) => c.sensors)
					.find((s) => s.devEui === devEui);
				const typeConfig = sensorEntry
					? resolveDeviceTypeConfig(sensorEntry.sourceDevice, app.deviceTypeLookup)
					: undefined;
				expandedDetailRowsByDevEui[devEui] = buildDeviceExpandedDetailRows(
					coercedData,
					typeConfig,
					sensorEntry?.sensor.label ?? devEui
				);
			}
		} catch (error) {
			console.error(`Failed to refresh device ${devEui}:`, error);
		} finally {
			refreshingByDevEui[devEui] = false;
		}
	}
</script>

<svelte:window bind:innerWidth={viewportWidth} />

<section class="dashboard-device-cards">
	{#key filterKey}
		<div
			class="dashboard-device-cards__scroll"
			data-dashboard-device-card-scroll="true"
			onwheelcapture={handleWheelScroll}
		>
			{#if locationCards.length === 0}
				<div class="dashboard-device-cards__empty">
					<h3>{m.dashboard_no_matching_locations_title()}</h3>
					<p>{m.dashboard_no_matching_locations_body()}</p>
				</div>
			{:else}
				<div class="dashboard-device-cards__grid {cardLayout === 'masonry' ? 'dashboard-device-cards__grid--masonry' : 'dashboard-device-cards__grid--equal-rows'}">
					{#each visibleLocationCards as card, index (card.id)}
						<div class="dashboard-device-cards__item">
							<CwLocationCard
								title={card.title}
								class="dashboard-device-cards__location-card"
								onNavigate={() => openLocation(card)}
							>
								<div class="dashboard-device-cards__sensor-list">
									{#each card.sensors as sensor (sensor.id)}
										<CwSensorCard
											label={sensor.sensor.label}
											status={sensor.sensor.status}
											storageKey={sensor.storageKey}
											primaryValue={sensor.sensor.primaryValue}
											primaryUnit={sensor.sensor.primaryUnit}
											primary_icon={sensor.sensor.primary_icon}
											secondaryValue={sensor.sensor.secondaryValue}
											secondaryUnit={sensor.sensor.secondaryUnit}
											secondary_icon={sensor.sensor.secondary_icon}
											lastUpdated={sensor.sensor.lastUpdated}
											expireAfterMinutes={sensor?.sourceDevice?.raw_data?.default_upload_interval ?? 10}
											class="dashboard-device-cards__sensor-card"
											onExpand={() => handleSensorExpand(sensor)}
										>
											<div class="dashboard-device-cards__sensor-details">
												<CwDataList rows={resolveSensorDetailRows(sensor)} />
												<CwButton
													variant="secondary"
													onclick={() => openDeviceDetails(sensor)}
												>
													{VIEW_DEVICE_DETAILS_LABEL}
												</CwButton>
											</div>
										</CwSensorCard>
									{/each}
								</div>
							</CwLocationCard>
						</div>

						{#if enableInfiniteScroll && canLoadMore && index === prefetchTriggerIndex}
							<div
								class="dashboard-device-cards__prefetch-sentinel"
								data-dashboard-prefetch-trigger="true"
								{@attach prefetchWhenVisible}
								aria-hidden="true"
							></div>
						{/if}
					{/each}
				</div>

				{#if enableInfiniteScroll && canLoadMore}
					<p class="dashboard-device-cards__load-more">
						{m.dashboard_loading_more_locations_hint()}
					</p>
				{/if}
			{/if}
		</div>
	{/key}
</section>

<style>
	.dashboard-device-cards {
		flex: 1;
		min-height: 0;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.dashboard-device-cards__scroll {
		flex: 1;
		min-height: 0;
		overflow-y: auto;
		padding: 0 0 1.5rem;
		overscroll-behavior: contain;
	}

	.dashboard-device-cards__load-more,
	.dashboard-device-cards__empty p {
		margin: 0;
		font-size: 0.92rem;
		line-height: 1.4;
		color: var(--cw-text-muted);
	}

	.dashboard-device-cards__empty {
		display: grid;
		gap: 0.35rem;
		padding: 1.1rem 1rem;
		border-radius: 1.2rem;
		border: 1px dashed color-mix(in srgb, var(--cw-border-default) 78%, transparent);
		background: color-mix(in srgb, var(--cw-bg-surface) 88%, transparent);
	}

	.dashboard-device-cards__empty h3 {
		margin: 0;
		font-size: 1rem;
		color: var(--cw-text-primary);
	}

	.dashboard-device-cards__grid {
		gap: 0.5rem;
	}

	/* ── Equal-height rows (default grid) ── */
	.dashboard-device-cards__grid--equal-rows {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		align-content: start;
		align-items: stretch;
	}

	.dashboard-device-cards__grid--equal-rows .dashboard-device-cards__item {
		display: flex;
		flex-direction: column;
	}

	.dashboard-device-cards__grid--equal-rows :global(.dashboard-device-cards__location-card.cw-location-card) {
		flex: 1;
	}

	/* ── Masonry / mosaic layout ── */
	.dashboard-device-cards__grid--masonry {
		display: block;
		columns: 1;
		column-gap: 0.5rem;
	}

	.dashboard-device-cards__grid--masonry .dashboard-device-cards__item {
		break-inside: avoid;
		margin-bottom: 0.5rem;
	}

	.dashboard-device-cards__item {
		min-width: 0;
	}

	:global(.dashboard-device-cards__location-card.cw-location-card) {
		width: 100%;
		max-width: none;
	}

	.dashboard-device-cards__sensor-list {
		display: grid;
		gap: 0.5rem;
	}

	:global(.dashboard-device-cards__sensor-card.cw-sensor-card) {
		width: 100%;
		max-width: none;
	}

	.dashboard-device-cards__sensor-details {
		display: grid;
		gap: 0.75rem;
	}

	.dashboard-device-cards__device-link {
		justify-self: end;
		padding: 0.45rem 0.8rem;
		border: 1px solid var(--cw-border-default);
		border-radius: 999px;
		background: var(--cw-bg-surface);
		color: var(--cw-text-secondary);
		font: inherit;
		font-size: 0.82rem;
		font-weight: 600;
		cursor: pointer;
		transition:
			border-color var(--cw-duration-fast) var(--cw-ease-default),
			background-color var(--cw-duration-fast) var(--cw-ease-default),
			color var(--cw-duration-fast) var(--cw-ease-default);
	}

	.dashboard-device-cards__device-link:hover {
		border-color: var(--cw-accent);
		background: color-mix(in srgb, var(--cw-accent) 10%, var(--cw-bg-surface));
		color: var(--cw-accent);
	}

	.dashboard-device-cards__device-link:focus-visible {
		outline: 2px solid var(--cw-accent);
		outline-offset: 2px;
	}

	.dashboard-device-cards__prefetch-sentinel {
		width: 100%;
		height: 1px;
	}

	.dashboard-device-cards__load-more {
		padding: 1rem 0 0.25rem;
		text-align: center;
	}

	@media (min-width: 768px) {
		.dashboard-device-cards__grid--equal-rows {
			grid-template-columns: repeat(auto-fit, minmax(19rem, 1fr));
		}

		.dashboard-device-cards__grid--masonry {
			columns: auto 19rem;
		}
	}
</style>
