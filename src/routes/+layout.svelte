<script lang="ts">
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import './layout.css';
	import { onDestroy } from 'svelte';
	import { dev } from '$app/environment';
	import { asset, resolve } from '$app/paths';

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
	import PwaDock from '$lib/components/pwa/PwaDock.svelte';
	import Header from './Header.svelte';
	import type { Profile } from '$lib/interfaces/profile.interface';

	let { children }: LayoutProps = $props();

	createCwToastContext();

	let mode = $state<CwSideNavMode>('open');
	let isAuthRoute = $derived(page.url.pathname.startsWith('/auth'));
	let isOfflineRoute = $derived(page.url.pathname === '/offline');
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
		profile?: Profile | undefined;
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

		app.session = routeData.session ?? null;
		app.accessToken = routeData.authToken ?? undefined;
		app.profile = routeData.profile ?? undefined;

		if (!isDashboardRoute) {
			return;
		}

		const devices = routeData.devices ?? [];

		app.devices = devices;
		app.totalDeviceCount = routeData.totalDeviceCount ?? devices.length;
		app.deviceStatuses = routeData.deviceStatuses ?? { online: 0, offline: 0 };
		app.triggeredRules = routeData.triggeredRules ?? [];
		app.triggeredRulesCount = readTriggeredRulesCount(routeData.triggeredRulesCount);
		app.deviceGroups = normalizeDashboardFilterValues(routeData.deviceGroups);
		app.locationGroups = normalizeDashboardFilterValues(routeData.locationGroups);
		app.locations = routeData.locations ?? [];
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
			(page.data as DashboardPageData).dashboardDebug ?? null,
			(page.data as DashboardPageData).profile ?? null
		).with(
			(
				type,
				pathname,
				search,
				hasAuthToken,
				devicesLength,
				totalDeviceCount,
				deviceStatuses,
				dashboardDebug,
				profile,
			) => {
				console.info('[layout] route data snapshot', {
					type,
					pathname,
					search,
					hasAuthToken,
					devicesLength,
					totalDeviceCount,
					deviceStatuses,
					dashboardDebug,
					profile,
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

<svelte:head>
	<link rel="manifest" href={resolve('/manifest.webmanifest')} />

	<link rel="icon" href={asset('/icons/favicon.svg')} sizes="any" type="image/svg+xml" />

	<link rel="icon" href={asset('/icons/icon-32x32.png')} sizes="32x32" type="image/png" />

	<link rel="icon" href={asset('/icons/icon-192x192.png')} sizes="192x192" type="image/png" />

	<link rel="shortcut icon" href={asset('/favicon.ico')} />

	<link rel="apple-touch-icon" href={asset('/icons/apple-touch-icon.png')} sizes="180x180" />

	<meta name="application-name" content="CropWatch" />
	<meta name="apple-mobile-web-app-capable" content="yes" />

	<meta name="apple-mobile-web-app-title" content="CropWatch" />

	<meta name="apple-mobile-web-app-status-bar-style" content="default" />

	<meta name="mobile-web-app-capable" content="yes" />
	<meta name="format-detection" content="telephone=no" />
	<meta name="color-scheme" content="dark light" />
	<meta name="theme-color" content="#1f283b" />

	<meta name="theme-color" content="#eef1f7" media="(prefers-color-scheme: light)" />

	<meta name="theme-color" content="#1f283b" media="(prefers-color-scheme: dark)" />
</svelte:head>

<CwOfflineOverlay />
<CwToastContainer />

{#if !isOfflineRoute}
	<PwaDock />
{/if}

<svelte:window onresize={handleWindowResize} />

<div class="app-shell flex h-dvh w-full overflow-hidden">
	{#if !isAuthRoute && !isOfflineRoute}
		<Sidebar bind:mode />

		<div class="flex min-h-0 min-w-0 flex-1 flex-col">
			<Header bind:mode />

			<main class="flex min-h-0 flex-1 flex-col overflow-hidden p-1">{@render children()}</main>

			<OverviewDrawer />
		</div>
	{:else}
		<main class="flex-1 overflow-y-auto">{@render children()}</main>
	{/if}
</div>

<div style="display:none">
	{#each locales as locale (locale)}
		<a href={localizeHref(page.url.pathname, { locale })}>{locale}</a>
	{/each}
</div>
