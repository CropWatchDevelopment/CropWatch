<script lang="ts">
	import { CwSensorCard } from '@cropwatchdevelopment/cwui';
	import { tick } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { ApiService } from '$lib/api/api.service';
	import { getAppContext } from '$lib/appContext.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { mapDashboardPrimaryDataToDevice, mergeDashboardDevices } from './dashboard-device-data';
	import {
		buildDashboardLocationSensorCards,
		DASHBOARD_SENSOR_CARD_LOCATION_BATCH_SIZE,
		DASHBOARD_SENSOR_CARD_PREFETCH_REMAINING,
		type DashboardLocationSensorCard
	} from './device-cards';
	import { listDashboardDevices, type DashboardDeviceFilters } from './device-table';

	export type CardLayout = 'grid' | 'masonry';

	interface Props {
		filters: DashboardDeviceFilters;
		cardLayout?: CardLayout;
	}

	const PHONE_BREAKPOINT_PX = 768;
	const SCROLL_CONTAINER_SELECTOR = '[data-dashboard-device-card-scroll="true"]';
	const PREFETCH_ROOT_MARGIN = '0px 0px 45% 0px';

	let { filters, cardLayout = 'grid' }: Props = $props();

	const app = getAppContext();

	let viewportWidth = $state(0);
	let visibleLocationCountsByFilter = $state<Record<string, number>>({});
	let refreshingByDevEui = $state<Record<string, boolean>>({});
	let isExpandingLocationWindow = $state(false);

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
		buildDashboardLocationSensorCards(filteredDevices, app.locations ?? [])
	);
	let useMobileCardWindow = $derived(viewportWidth === 0 || viewportWidth < PHONE_BREAKPOINT_PX);
	let enableInfiniteScroll = $derived(viewportWidth > 0 && viewportWidth < PHONE_BREAKPOINT_PX);
	let visibleLocationCards = $derived(
		useMobileCardWindow ? locationCards.slice(0, visibleLocationCount) : locationCards
	);
	let canLoadMore = $derived(
		useMobileCardWindow && visibleLocationCards.length < locationCards.length
	);
	let prefetchTriggerIndex = $derived(
		Math.max(0, visibleLocationCards.length - DASHBOARD_SENSOR_CARD_PREFETCH_REMAINING - 1)
	);
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

		const firstDeviceLabel = card.devices[0]?.label;
		if (firstDeviceLabel) {
			openDeviceDetails(card, firstDeviceLabel);
		}
	}

	function openDeviceDetails(card: DashboardLocationSensorCard, label: string) {
		const routeParams = card.deviceRouteParamsByLabel[label];
		if (!routeParams) {
			return;
		}

		goto(
			resolve('/locations/[location_id]/devices/[dev_eui]', {
				location_id: String(routeParams.locationId),
				dev_eui: routeParams.devEui
			})
		).catch(handleNavigationFailure);
	}

	function handleTimerExpired(card: DashboardLocationSensorCard, label: string) {
		const routeParams = card.deviceRouteParamsByLabel[label];
		if (!routeParams) {
			return;
		}

		void refreshSingleDevice(routeParams.devEui);
	}

	async function refreshSingleDevice(devEui: string) {
		if (!devEui || !app.accessToken || refreshingByDevEui[devEui]) {
			return;
		}

		refreshingByDevEui[devEui] = true;

		try {
			const api = new ApiService({ authToken: app.accessToken });
			const latestDevice = mapDashboardPrimaryDataToDevice(
				await api.getDeviceLatestPrimaryData(devEui)
			);
			app.devices = mergeDashboardDevices(app.devices, [latestDevice]);
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
							<CwSensorCard
								title={card.title}
								devices={card.devices}
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
								onTimerExpired={(label) => handleTimerExpired(card, label)}
							/>
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
		padding: 0 1rem 1.5rem;
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

	.dashboard-device-cards__grid--equal-rows :global(.dashboard-device-cards__sensor-card.cw-sensor-card) {
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

	:global(.dashboard-device-cards__sensor-card.cw-sensor-card) {
		width: 100%;
		max-width: none;
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
		.dashboard-device-cards__scroll {
			padding-inline: 1.5rem;
		}

		.dashboard-device-cards__grid--equal-rows {
			grid-template-columns: repeat(auto-fit, minmax(19rem, 1fr));
		}

		.dashboard-device-cards__grid--masonry {
			columns: auto 19rem;
		}
	}
</style>
