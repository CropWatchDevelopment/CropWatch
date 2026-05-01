<script lang="ts">
	import { locales, localizeHref } from '$lib/paraglide/runtime';
	import './layout.css';
	import { onDestroy } from 'svelte';
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
	import type { DeviceStatusSummary, RuleDto } from '$lib/api/api.dtos';
	import type { IJWT } from '$lib/interfaces/jwt.interface';
	import type { LayoutProps } from './$types';
	import Header from './Header.svelte';
	import type { Profile } from '$lib/interfaces/profile.interface';

	let { children }: LayoutProps = $props();

	createCwToastContext();

	let mode = $state<CwSideNavMode>('open');
	let isAuthRoute = $derived(page.url.pathname.startsWith('/auth'));
	let isOfflineRoute = $derived(page.url.pathname === '/offline');
	let resizeTimer: ReturnType<typeof setTimeout> | null = null;

	interface AppLayoutData {
		session?: IJWT | null;
		authToken?: string | null;
		profile?: Profile | undefined;
		overview?: {
			deviceStatuses: DeviceStatusSummary;
			triggeredRules: RuleDto[];
			triggeredRulesCount: number;
		};
	}

	const app = $state(createAppContext());

	setAppContext(app);

	function syncAppFromPageData() {
		const routeData = page.data as AppLayoutData;

		app.session = routeData.session ?? null;
		app.accessToken = routeData.authToken ?? undefined;
		app.profile = routeData.profile ?? undefined;
		app.deviceStatuses = routeData.overview?.deviceStatuses ?? { online: 0, offline: 0 };
		app.triggeredRules = routeData.overview?.triggeredRules ?? [];
		app.triggeredRulesCount = routeData.overview?.triggeredRulesCount ?? 0;
	}

	syncAppFromPageData();
	afterNavigate(syncAppFromPageData);

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

	function localizedHref(locale: (typeof locales)[number]): string {
		return localizeHref(page.url.pathname, { locale });
	}
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

<svelte:window onresize={handleWindowResize} />

<div class="app-shell">
	{#if !isAuthRoute && !isOfflineRoute}
		<Sidebar bind:mode />

		<div class="app-shell__content">
			<Header bind:mode />

			<main class="app-shell__main">{@render children()}</main>

			<div class="app-shell__bottom-chrome">
				<OverviewDrawer />
			</div>
		</div>
	{:else}
		<main class="app-shell__main app-shell__main--standalone">{@render children()}</main>
	{/if}
</div>

<div style="display:none">
	{#each locales as locale (locale)}
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
		<a href={localizedHref(locale)}>{locale}</a>
	{/each}
</div>

<style>
	:global(.grecaptcha-badge) {
		visibility: hidden !important;
	}
</style>
