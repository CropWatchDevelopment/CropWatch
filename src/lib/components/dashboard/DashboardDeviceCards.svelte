<script lang="ts">
	import { CwSensorCard } from '@cropwatchdevelopment/cwui';
	import { tick } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { ApiService } from '$lib/api/api.service';
	import { getAppContext } from '$lib/appContext.svelte';
	import { mapDashboardPrimaryDataToDevice, mergeDashboardDevices } from './dashboard-device-data';
	import {
		buildDashboardLocationSensorCards,
		DASHBOARD_SENSOR_CARD_LOCATION_BATCH_SIZE,
		DASHBOARD_SENSOR_CARD_PREFETCH_REMAINING,
		type DashboardLocationSensorCard
	} from './device-cards';
	import { listDashboardDevices, type DashboardDeviceFilters } from './device-table';

	interface Props {
		filters: DashboardDeviceFilters;
	}

	const PHONE_BREAKPOINT_PX = 768;
	const SCROLL_CONTAINER_SELECTOR = '[data-dashboard-device-card-scroll="true"]';
	const PREFETCH_ROOT_MARGIN = '0px 0px 45% 0px';

	let { filters }: Props = $props();

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
	let summaryText = $derived.by(() => {
		const locationTotal = locationCards.length;
		const loadedLocationTotal = visibleLocationCards.length;
		const deviceTotal = filteredDevices.length;

		if (locationTotal === 0) {
			return 'No matching locations';
		}

		if (useMobileCardWindow && loadedLocationTotal < locationTotal) {
			return `${loadedLocationTotal} of ${locationTotal} locations loaded · ${deviceTotal} devices`;
		}

		return `${locationTotal} locations · ${deviceTotal} devices`;
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
		<div class="dashboard-device-cards__scroll" data-dashboard-device-card-scroll="true">
			{#if locationCards.length === 0}
				<div class="dashboard-device-cards__empty">
					<h3>No devices match these filters</h3>
					<p>Adjust the dashboard filters or clear them to load more locations.</p>
				</div>
			{:else}
				<div class="dashboard-device-cards__grid">
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
						Loading 10 more locations when you reach the fifth remaining card.
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

	.dashboard-device-cards__summary {
		position: sticky;
		top: 0;
		z-index: 1;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem 0 1.25rem;
		margin-bottom: 0.75rem;
		background: linear-gradient(
			180deg,
			color-mix(in srgb, var(--cw-bg-base) 96%, transparent),
			color-mix(in srgb, var(--cw-bg-base) 84%, transparent) 78%,
			transparent
		);
		backdrop-filter: blur(14px);
	}

	.dashboard-device-cards__summary-copy {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.dashboard-device-cards__eyebrow {
		margin: 0;
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--cw-accent-text) 74%, var(--cw-text-muted));
	}

	.dashboard-device-cards__headline {
		margin: 0;
		font-size: clamp(1.1rem, 2.8vw, 1.45rem);
		font-weight: 700;
		line-height: 1.1;
		color: var(--cw-text-primary);
	}

	.dashboard-device-cards__meta,
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
		display: grid;
		gap: 1rem;
		grid-template-columns: minmax(0, 1fr);
		align-content: start;
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

		.dashboard-device-cards__summary {
			flex-direction: row;
			align-items: end;
			justify-content: space-between;
			gap: 1rem;
		}

		.dashboard-device-cards__grid {
			grid-template-columns: repeat(auto-fit, minmax(22rem, 1fr));
		}
	}
</style>
