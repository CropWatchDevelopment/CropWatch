<script lang="ts">
	import './DashboardDeviceCards.css';
	import { createCwAlarmScheduler, CwSensorCard } from '@cropwatchdevelopment/cwui';
	import { onDestroy, tick } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { getAppContext } from '$lib/appContext.svelte';
	import type { IDevice } from '$lib/interfaces/device.interface';
	import { m } from '$lib/paraglide/messages.js';
	import {
		buildDashboardLocationSensorCards,
		buildDeviceLoadingDetailRows,
		DASHBOARD_SENSOR_CARD_LOCATION_BATCH_SIZE,
		DASHBOARD_SENSOR_CARD_PREFETCH_REMAINING,
		type DashboardLocationSensorCard
	} from './device-cards';
	import {
		DASHBOARD_DEVICE_REFRESH_ALARM_AFTER_MINUTES,
		getDashboardDeviceNextRefreshDelayMs,
		refreshDashboardDevice
	} from './dashboard-device-refresh';
	import { resolveDeviceTypeConfig } from './dashboard-device-data';
	import { listDashboardDevices, type DashboardDeviceFilters } from './device-table';
	import { createDeviceExpandManager } from './device-expand.svelte';

	export type CardLayout = 'grid' | 'masonry';

	interface Props {
		filters: DashboardDeviceFilters;
		cardLayout?: CardLayout;
	}

	const SCROLL_CONTAINER_SELECTOR = '[data-dashboard-device-card-scroll="true"]';
	const PREFETCH_ROOT_MARGIN = '0px 0px 45% 0px';

	let { filters, cardLayout = 'grid' }: Props = $props();

	const app = getAppContext();
	const cardRefreshAlarms = createCwAlarmScheduler();
	const expand = createDeviceExpandManager();

	let viewportWidth = $state(0);
	let visibleLocationCountsByFilter = $state<Record<string, number>>({});
	let refreshingByDevEui = $state<Record<string, boolean>>({});
	let isExpandingLocationWindow = $state(false);
	let monitoredCardRefreshIds: string[] = [];

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
		buildDashboardLocationSensorCards(filteredDevices, app.locations ?? [], app.deviceTypeLookup)
	);
	let visibleLocationCards = $derived(locationCards.slice(0, visibleLocationCount));
	let canLoadMore = $derived(visibleLocationCards.length < locationCards.length);
	let enableInfiniteScroll = $derived(viewportWidth > 0);
	let prefetchTriggerIndex = $derived(
		Math.max(0, visibleLocationCards.length - DASHBOARD_SENSOR_CARD_PREFETCH_REMAINING - 1)
	);

	onDestroy(() => {
		cardRefreshAlarms.clear();
	});

	// Pre-load expanded detail rows for cards that were still open when the page
	// last unloaded. CwSensorCard persists its expand state in localStorage under
	// the key 'cw-sensor-card-expand:{card.id}'.
	$effect(() => {
		if (!app.accessToken || locationCards.length === 0) return;
		for (const card of locationCards) {
			preloadExpandedCard(card);
		}
	});

	// Keep background refresh alarms in sync with the currently visible device set.
	$effect(() => {
		if (!app.accessToken) {
			cardRefreshAlarms.clear();
			monitoredCardRefreshIds = [];
			return;
		}

		const nextIds: string[] = [];
		for (const device of filteredDevices) {
			const alarmId = getCardRefreshAlarmId(device.dev_eui);
			const uploadInterval = resolveDeviceUploadIntervalMinutes(device);
			const delayMs = getDashboardDeviceNextRefreshDelayMs(device, uploadInterval);
			if (delayMs == null) {
				cardRefreshAlarms.cancel(alarmId);
				continue;
			}
			nextIds.push(alarmId);
			queueCardRefresh(device);
		}

		for (const alarmId of monitoredCardRefreshIds) {
			if (!nextIds.includes(alarmId)) cardRefreshAlarms.cancel(alarmId);
		}
		monitoredCardRefreshIds = nextIds;
	});

	// ── Upload interval resolution ─────────────────────────────────────────────

	function resolveDeviceUploadIntervalMinutes(device: IDevice): number {
		if (device.upload_interval != null && device.upload_interval > 0) {
			return device.upload_interval;
		}
		const typeConfig = app.deviceTypeLookup
			? resolveDeviceTypeConfig(device, app.deviceTypeLookup)
			: undefined;
		return typeConfig?.default_upload_interval ?? DASHBOARD_DEVICE_REFRESH_ALARM_AFTER_MINUTES;
	}

	// ── Expand / collapse ──────────────────────────────────────────────────────

	function handleDeviceExpand(card: DashboardLocationSensorCard, label: string): void {
		const binding = card.deviceBindingsByLabel[label];
		if (!binding || !app.accessToken) return;
		// Devices that have never sent data already show "No reading" rows from
		// buildUnavailableDetailRows — calling getDeviceLatestData for them always
		// fails and would only cause a spam loop.
		if (binding.sourceDevice.has_primary_data === false) return;
		void expand.load(binding.devEui, app.accessToken, binding.sourceDevice, app.deviceTypeLookup, label);
	}

	function handleDeviceCollapse(card: DashboardLocationSensorCard, label: string): void {
		const devEui = card.deviceBindingsByLabel[label]?.devEui;
		if (devEui) expand.clear(devEui);
	}

	function preloadExpandedCard(card: DashboardLocationSensorCard): void {
		try {
			const stored = localStorage.getItem(`cw-sensor-card-expand:${card.id}`);
			if (!stored) return;
			const expandedMap: Record<string, boolean> = JSON.parse(stored);
			for (const [label, isExpanded] of Object.entries(expandedMap)) {
				if (isExpanded) handleDeviceExpand(card, label);
			}
		} catch {
			// localStorage unavailable or JSON parse error — skip silently
		}
	}

	// ── Background refresh ─────────────────────────────────────────────────────

	function getCardRefreshAlarmId(devEui: string): string {
		return `dashboard-device-card-refresh:${devEui}`;
	}

	function resolveLiveDashboardDevice(device: IDevice | null | undefined): IDevice | null {
		if (!device?.dev_eui) return null;
		return app.devices.find((d) => d.dev_eui === device.dev_eui) ?? device;
	}

	function queueCardRefresh(device: IDevice): void {
		const uploadInterval = resolveDeviceUploadIntervalMinutes(device);
		const delayMs = getDashboardDeviceNextRefreshDelayMs(device, uploadInterval);
		if (delayMs == null) return;

		const alarmId = getCardRefreshAlarmId(device.dev_eui);
		cardRefreshAlarms.schedule({
			id: alarmId,
			from: Date.now(),
			alarmAfterMs: delayMs,
			callback: () => {
				const liveDevice = resolveLiveDashboardDevice(device);
				if (!liveDevice) return;
				void refreshSingleDevice(liveDevice).finally(() => {
					const currentDevice = resolveLiveDashboardDevice(liveDevice);
					if (currentDevice && monitoredCardRefreshIds.includes(alarmId)) {
						queueCardRefresh(currentDevice);
					}
				});
			}
		});
	}

	async function refreshSingleDevice(device: IDevice | null | undefined): Promise<void> {
		const targetDevice = resolveLiveDashboardDevice(device);
		const devEui = targetDevice?.dev_eui;
		if (!devEui || !app.accessToken || refreshingByDevEui[devEui]) return;

		refreshingByDevEui[devEui] = true;
		try {
			await refreshDashboardDevice({ app, devEui, targetDevice });
			// Invalidate cached expanded rows so the next expand fetches fresh data.
			expand.invalidate(devEui);
		} catch (error) {
			console.error(`Failed to refresh device ${devEui}:`, error);
		} finally {
			refreshingByDevEui[devEui] = false;
		}
	}

	// ── Navigation ─────────────────────────────────────────────────────────────

	function openLocation(card: DashboardLocationSensorCard): void {
		if (card.locationId > 0) {
			goto(resolve('/locations/[location_id]', { location_id: String(card.locationId) }))
				.catch((e) => console.error('Failed to navigate to location:', e));
			return;
		}
		const firstLabel = card.devices[0]?.label;
		if (firstLabel) openDeviceDetails(card, firstLabel);
	}

	function openDeviceDetails(card: DashboardLocationSensorCard, label: string): void {
		const binding = card.deviceBindingsByLabel[label];
		if (!binding) return;
		goto(resolve('/locations/[location_id]/devices/[dev_eui]', {
			location_id: String(binding.locationId),
			dev_eui: binding.devEui
		})).catch((e) => console.error('Failed to navigate to device:', e));
	}

	// ── Card device resolution ────────────────────────────────────────────────

	function resolveCardDevices(card: DashboardLocationSensorCard) {
		return card.devices.map((dev) => {
			const binding = card.deviceBindingsByLabel[dev.label];
			const devEui = binding?.devEui;
			if (!devEui || !expand.isActive(devEui)) return dev;
			const freshPrimary = binding
				? expand.getPrimaryValue(devEui, binding.sourceDevice, app.deviceTypeLookup)
				: null;
			return {
				...dev,
				...(freshPrimary !== null ? { primaryValue: freshPrimary } : {}),
				detailRows: expand.getRows(devEui) ?? buildDeviceLoadingDetailRows(dev.label)
			};
		});
	}

	// ── Infinite scroll ────────────────────────────────────────────────────────

	async function loadMoreLocations(): Promise<void> {
		if (!canLoadMore || isExpandingLocationWindow) return;
		isExpandingLocationWindow = true;
		visibleLocationCountsByFilter = {
			...visibleLocationCountsByFilter,
			[filterKey]: Math.min(
				visibleLocationCount + DASHBOARD_SENSOR_CARD_LOCATION_BATCH_SIZE,
				locationCards.length
			)
		};
		await tick();
		isExpandingLocationWindow = false;
	}

	function prefetchWhenVisible(element: HTMLElement) {
		const scrollContainer = element.closest<HTMLElement>(SCROLL_CONTAINER_SELECTOR);
		if (!scrollContainer) return;
		const observer = new IntersectionObserver(
			(entries) => { if (entries.some((e) => e.isIntersecting)) void loadMoreLocations(); },
			{ root: scrollContainer, rootMargin: PREFETCH_ROOT_MARGIN, threshold: 0.01 }
		);
		observer.observe(element);
		return () => observer.disconnect();
	}

	// ── Wheel scroll passthrough ───────────────────────────────────────────────
	// Forwards wheel events to the scroll container so the page doesn't steal
	// scroll when the cursor is over a nested non-scrollable element.

	function handleWheelScroll(event: WheelEvent): void {
		const scrollContainer = event.currentTarget;
		if (
			!(scrollContainer instanceof HTMLDivElement) ||
			event.defaultPrevented ||
			event.ctrlKey ||
			event.metaKey
		) return;

		const deltaY = normalizeWheelDelta(event, scrollContainer);
		if (deltaY === 0 || !canScrollContainer(scrollContainer, deltaY)) return;
		if (nestedScrollableCanHandle(event.target, deltaY, scrollContainer)) return;

		event.preventDefault();
		scrollContainer.scrollTop += deltaY;
	}

	function normalizeWheelDelta(event: WheelEvent, container: HTMLDivElement): number {
		switch (event.deltaMode) {
			case WheelEvent.DOM_DELTA_LINE: return event.deltaY * 16;
			case WheelEvent.DOM_DELTA_PAGE: return event.deltaY * container.clientHeight;
			default: return event.deltaY;
		}
	}

	function canScrollContainer(element: HTMLElement, deltaY: number): boolean {
		if (deltaY < 0) return element.scrollTop > 0;
		if (deltaY > 0) return element.scrollTop + element.clientHeight < element.scrollHeight;
		return false;
	}

	function nestedScrollableCanHandle(
		target: EventTarget | null,
		deltaY: number,
		scrollContainer: HTMLDivElement
	): boolean {
		if (!(target instanceof Element)) return false;
		let current: Element | null = target;
		while (current && current !== scrollContainer) {
			if (current instanceof HTMLElement) {
				const { overflowY } = window.getComputedStyle(current);
				const isScrollable =
					(overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
					current.scrollHeight > current.clientHeight;
				if (isScrollable && canScrollContainer(current, deltaY)) return true;
			}
			current = current.parentElement;
		}
		return false;
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
							{#key card.renderKey}
								<CwSensorCard
									title={card.title}
									devices={resolveCardDevices(card)}
									storageKey={card.id}
									class="dashboard-device-cards__sensor-card"
									onNavigate={(target) => {
										if (target === 'location') {
											openLocation(card);
											return;
										}
										if (target.startsWith('device-detail:')) {
											openDeviceDetails(card, target.replace('device-detail:', ''));
										}
									}}
									onExpand={(label) => handleDeviceExpand(card, label)}
									onCollapse={(label) => handleDeviceCollapse(card, label)}
									onExpire={(label) => refreshSingleDevice(card.deviceBindingsByLabel[label]?.sourceDevice)}
								/>
							{/key}
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
