<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { AppPage } from '$lib/components/layout';
	import { CwButton } from '@cropwatchdevelopment/cwui';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import DashboardDeviceTable from '$lib/components/dashboard/DashboardDeviceTable.svelte';
	import DashboardDeviceCards from '$lib/components/dashboard/DashboardDeviceCards.svelte';
	import type { CardLayout } from '$lib/components/dashboard/DashboardDeviceCards.svelte';
	import {
		countDashboardDevices,
		type DashboardDeviceFilters
	} from '$lib/components/dashboard/device-table';
	import { normalizeDashboardFilterValues } from '$lib/components/dashboard/dashboard-filter-values';
	import { getAppContext } from '$lib/appContext.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { page } from '$app/state';
	import TABLE_ICON from '$lib/images/icons/table.svg';
	import SENSOR_CARDS_ICON from '$lib/images/icons/sensor_cards.svg';
	import GRID_VIEW_ICON from '$lib/images/icons/grid_view.svg';
	import MASONRY_VIEW_ICON from '$lib/images/icons/masonary.svg';

	type DashboardView = 'table' | 'sensor-cards';

	const DASHBOARD_VIEW_STORAGE_KEY = 'cropwatch.dashboard.view';
	const DASHBOARD_CARD_LAYOUT_STORAGE_KEY = 'cropwatch.dashboard.cardLayout';
	const MOBILE_DASHBOARD_MEDIA_QUERY = '(max-width: 767px)';

	const app = getAppContext();

	let dashboardData = $derived(
		(page.data as Record<string, unknown>).dashboard as Record<string, unknown> | undefined
	);
	let dashboardDevices = $derived((dashboardData?.devices as typeof app.devices) ?? []);
	let dashboardDeviceGroups = $derived(
		normalizeDashboardFilterValues(dashboardData?.deviceGroups as string[])
	);
	let dashboardLocationGroups = $derived(
		normalizeDashboardFilterValues(dashboardData?.locationGroups as string[])
	);
	let dashboardLocations = $derived((dashboardData?.locations as typeof app.locations) ?? []);

	$effect(() => {
		if (!dashboardData) {
			return;
		}

		app.accessToken = ((page.data as Record<string, unknown>).authToken as string) ?? undefined;
		app.devices = dashboardDevices;
		app.totalDeviceCount = dashboardDevices.length;
		app.deviceGroups = dashboardDeviceGroups;
		app.locationGroups = dashboardLocationGroups;
		app.locations = dashboardLocations;
	});

	// ── Reactive filter state from URL search params ────────────
	let activeGroup = $derived(page.url.searchParams.get('group') ?? '');
	let activeLocationGroup = $derived(page.url.searchParams.get('locationGroup') ?? '');
	let activeLocation = $derived(page.url.searchParams.get('location') ?? '');
	let dashboardView = $state<DashboardView>('table');
	let cardLayout = $state<CardLayout>('grid');
	let dashboardViewReady = $state(!browser);
	let dashboardFilters = $derived.by(
		(): DashboardDeviceFilters => ({
			group: activeGroup,
			locationGroup: activeLocationGroup,
			location: activeLocation
		})
	);

	let devicesInView = $derived(
		countDashboardDevices(app.devices ?? [], app.locations ?? [], dashboardFilters)
	);

	function refreshDashboard() {
		window.location.reload();
	}

	function setDashboardView(view: DashboardView) {
		dashboardView = view;

		if (browser) {
			window.localStorage.setItem(DASHBOARD_VIEW_STORAGE_KEY, view);
		}
	}

	function setCardLayout(layout: CardLayout) {
		cardLayout = layout;

		if (browser) {
			window.localStorage.setItem(DASHBOARD_CARD_LAYOUT_STORAGE_KEY, layout);
		}
	}

	onMount(() => {
		const storedDashboardView = window.localStorage.getItem(DASHBOARD_VIEW_STORAGE_KEY);
		if (storedDashboardView === 'table' || storedDashboardView === 'sensor-cards') {
			dashboardView = storedDashboardView;
		} else if (window.matchMedia(MOBILE_DASHBOARD_MEDIA_QUERY).matches) {
			dashboardView = 'sensor-cards';
		}

		const storedCardLayout = window.localStorage.getItem(DASHBOARD_CARD_LAYOUT_STORAGE_KEY);
		if (storedCardLayout === 'grid' || storedCardLayout === 'masonry') {
			cardLayout = storedCardLayout;
		}

		dashboardViewReady = true;
	});
</script>

<svelte:head>
	<title>{m.dashboard_page_title()}</title>
</svelte:head>

<AppPage width="full" class="dashboard-page">
	<div class="--cw-bg-base flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
		<header class="flex-none">
			<div class="mb-2 flex w-full flex-col gap-4">
				<div
					id="Dashboard__Overview__actions"
					class="flex w-full flex-row gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end"
				>
					<CwButton
						class="w-full md:w-auto"
						size="sm"
						variant={dashboardView === 'table' ? 'info' : 'secondary'}
						onclick={() => setDashboardView('table')}
					>
						<Icon src={TABLE_ICON} alt={m.dashboard_table_view()} />
						{m.dashboard_table_view()}
					</CwButton>
					<CwButton
						class="w-full md:w-auto"
						size="sm"
						variant={dashboardView === 'sensor-cards' ? 'info' : 'secondary'}
						onclick={() => setDashboardView('sensor-cards')}
					>
						<Icon src={SENSOR_CARDS_ICON} alt={m.dashboard_sensor_cards_view()} />
						{m.dashboard_sensor_cards_view()}
					</CwButton>
					{#if dashboardView === 'sensor-cards'}
						<div
							class="hidden items-center justify-end gap-1 border-t border-slate-600/70 pt-2 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-2 md:flex"
						>
							<CwButton
								class="px-2 text-xs"
								size="sm"
								variant={cardLayout === 'grid' ? 'info' : 'secondary'}
								onclick={() => setCardLayout('grid')}
							>
								<Icon src={GRID_VIEW_ICON} alt="Grid Layout" />
							</CwButton>
							<CwButton
								class="px-2 text-xs"
								size="sm"
								variant={cardLayout === 'masonry' ? 'info' : 'secondary'}
								onclick={() => setCardLayout('masonry')}
							>
								<Icon src={MASONRY_VIEW_ICON} alt="Masonry Layout" />
							</CwButton>
						</div>
					{/if}
				</div>
			</div>
		</header>

		{#if dashboardViewReady}
			{#if dashboardView === 'sensor-cards'}
				<DashboardDeviceCards filters={dashboardFilters} {cardLayout} />
			{:else}
				<DashboardDeviceTable filters={dashboardFilters} />
			{/if}
		{:else}
			<div class="flex min-h-0 flex-1 items-center justify-center px-6 pb-6">
				<p class="text-sm text-slate-400">{m.dashboard_loading_view()}</p>
			</div>
		{/if}
	</div>
</AppPage>

<style>
	/*
	 * The dashboard uses viewport-fill layout (internal scroll in table/cards).
	 * AppPage now uses flex: 1 0 auto globally to allow page-scroll on other routes,
	 * but the dashboard needs the old bounded/shrinkable behaviour so its child
	 * scroll containers (CwDataTable fillParent, .dashboard-device-cards__scroll)
	 * receive a definite height from the flex chain.
	 */
	:global(.app-page.dashboard-page),
	:global(.app-page.dashboard-page .app-page__shell) {
		flex: 1 1 auto;
		min-height: 0;
	}
</style>
