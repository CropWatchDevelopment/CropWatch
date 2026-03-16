<script lang="ts">
	import './layout.css';
	import { onDestroy } from 'svelte';
	import { dev } from '$app/environment';
	import {
		createCwToastContext,
		CwOfflineOverlay,
		CwToastContainer,
		type CwSideNavMode
	} from '@cropwatchdevelopment/cwui';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import OverviewDrawer from './OverviewDrawer.svelte';
	import Sidebar from './Sidebar.svelte';
	import { createAppContext, setAppContext } from '$lib/appContext.svelte';
	import { normalizeDashboardFilterValues } from '$lib/components/dashboard/dashboard-filter-values';
	import type { IJWT } from '$lib/interfaces/jwt.interface';
	import type { IDevice } from '$lib/interfaces/device.interface';
	import type { LocationDto, RuleDto, TriggeredRulesCountResponse } from '$lib/api/api.dtos';
	import type { LayoutProps } from './$types';
	import Header from './Header.svelte';

	let { children }: LayoutProps = $props();
	createCwToastContext();

	let mode = $state<CwSideNavMode>('open');
	let isAuthRoute = $derived(page.url.pathname.startsWith('/auth'));
	let resizeTimer: ReturnType<typeof setTimeout> | null = null;

	interface DashboardPageData {
		session?: IJWT | null;
		authToken?: string | null;
		devices?: IDevice[];
		totalDeviceCount?: number;
		deviceStatuses?: { online: number; offline: number };
		triggeredRules?: RuleDto[];
		triggeredRulesCount?: TriggeredRulesCountResponse;
		deviceGroups?: string[];
		locationGroups?: string[];
		locations?: LocationDto[];
		dashboardDebug?: Record<string, unknown> | null;
	}

	function readTriggeredRulesCount(
		rawTriggeredRulesCount: TriggeredRulesCountResponse | undefined
	): number {
		if (typeof rawTriggeredRulesCount === 'number' && Number.isFinite(rawTriggeredRulesCount)) {
			return rawTriggeredRulesCount;
		}

		if (rawTriggeredRulesCount && typeof rawTriggeredRulesCount === 'object') {
			const maybeCount =
				(rawTriggeredRulesCount as Record<string, unknown>).count ??
				(rawTriggeredRulesCount as Record<string, unknown>).triggered_count;
			if (typeof maybeCount === 'number' && Number.isFinite(maybeCount)) {
				return maybeCount;
			}
		}

		return 0;
	}

	const app = $state(createAppContext());
	setAppContext(app);

	function syncAppFromPageData() {
		const routeData = page.data as DashboardPageData;
		const isDashboardRoute = page.url.pathname === '/';
		const devices = isDashboardRoute ? (routeData.devices ?? []) : [];

		app.session = routeData.session ?? null;
		app.accessToken = routeData.authToken ?? undefined;
		app.devices = devices;
		app.totalDeviceCount = isDashboardRoute ? (routeData.totalDeviceCount ?? devices.length) : 0;
		app.deviceStatuses = isDashboardRoute
			? (routeData.deviceStatuses ?? { online: 0, offline: 0 })
			: { online: 0, offline: 0 };
		app.triggeredRules = isDashboardRoute ? (routeData.triggeredRules ?? []) : [];
		app.triggeredRulesCount = readTriggeredRulesCount(
			isDashboardRoute ? routeData.triggeredRulesCount : 0
		);
		app.deviceGroups = isDashboardRoute
			? normalizeDashboardFilterValues(routeData.deviceGroups)
			: [];
		app.locationGroups = isDashboardRoute
			? normalizeDashboardFilterValues(routeData.locationGroups)
			: [];
		app.locations = isDashboardRoute ? (routeData.locations ?? []) : [];
	}

	syncAppFromPageData();
	afterNavigate(syncAppFromPageData);

	if (dev) {
		$inspect(
			page.url.pathname,
			page.url.search,
			!!(page.data as DashboardPageData).authToken,
			((page.data as DashboardPageData).devices ?? []).length,
			(page.data as DashboardPageData).totalDeviceCount ??
				((page.data as DashboardPageData).devices ?? []).length,
			(page.data as DashboardPageData).deviceStatuses ?? null,
			(page.data as DashboardPageData).dashboardDebug ?? null
		).with(
			(
				type,
				pathname,
				search,
				hasAuthToken,
				devicesLength,
				totalDeviceCount,
				deviceStatuses,
				dashboardDebug
			) => {
				console.info('[layout] route data snapshot', {
					type,
					pathname,
					search,
					hasAuthToken,
					devicesLength,
					totalDeviceCount,
					deviceStatuses,
					dashboardDebug
				});
			}
		);
	}

	function handleWindowResize() {
		document.querySelector('.cw-sidenav')?.classList.add('cw-sidenav--resizing');
		if (resizeTimer) {
			clearTimeout(resizeTimer);
		}
		resizeTimer = setTimeout(() => {
			document.querySelector('.cw-sidenav')?.classList.remove('cw-sidenav--resizing');
		}, 100);
	}

	onDestroy(() => {
		if (resizeTimer) {
			clearTimeout(resizeTimer);
		}
	});
</script>

<CwOfflineOverlay />
<CwToastContainer />
<svelte:window onresize={handleWindowResize} />

<div class="flex h-dvh w-full overflow-hidden">
	{#if !isAuthRoute}
		<Sidebar bind:mode />
		<div class="flex min-h-0 min-w-0 flex-1 flex-col">
			<Header bind:mode />
			<main class="flex min-h-0 flex-1 flex-col overflow-hidden p-1">
				{@render children()}
			</main>
			<OverviewDrawer />
		</div>
	{:else}
		<main class="flex-1 overflow-y-auto">
			{@render children()}
		</main>
	{/if}
</div>
