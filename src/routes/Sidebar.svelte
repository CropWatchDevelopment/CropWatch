<script lang="ts">
	import { page } from '$app/state';
	import { getAppContext } from '$lib/appContext.svelte';
	import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import {
		CwDuration,
		CwExpandPanel,
		CwListBox,
		CwSideNav,
		CwThemePicker,
		type CwListBoxItem,
		type CwSideNavItem
	} from '@cropwatchdevelopment/cwui';
	import CROPWATCH_LOGO from '$lib/images/cropwatch_static.svg';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { normalizeDashboardFilterValues } from '$lib/components/dashboard/dashboard-filter-values';
	import { buildLogoutPath } from '$lib/utils/auth-redirect';

	let { mode = $bindable() } = $props();

	const app = getAppContext();
	const DASHBOARD_ICON_PATH = 'M2 3h5v4H2V3zm7 0h5v4H9V3zM2 9h5v4H2V9zm7 0h5v4H9V9z';
	const LOCATIONS_ICON_PATH =
		'M8 2a6 6 0 100 12A6 6 0 008 2zm0 0c1.5 1.6 2.5 3.7 2.8 6-.3 2.3-1.3 4.4-2.8 6M8 2C6.5 3.6 5.5 5.7 5.2 8c.3 2.3 1.3 4.4 2.8 6M2 8h12M3.5 4.5h9M3.5 11.5h9';
	const RULES_ICON_PATH =
		'M3 4.5h6M3 8h6M3 11.5h6M10.5 4.5l1 1 2-2M10.5 8l1 1 2-2M10.5 11.5l1 1 2-2';
	const REPORTS_ICON_PATH =
		'M4 2.5h5l3 3V13a1 1 0 01-1 1H4a1 1 0 01-1-1v-9a1 1 0 011-1zM9 2.5V5a1 1 0 001 1h2M5.5 8.5h5M5.5 10.5h5';
	const GATEWAYS_ICON_PATH =
		'M3 4a1 1 0 011-1h1v2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h1v2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h1v2H4a1 1 0 01-1-1zm5-10a1 1 0 011-1h1v2H9a1 1 0 01-1-1zm0 5a1 1 0 011-1h1v2H9a1 1 0 01-1-1zm0 5a1 1 0 011-1h1v2H9a1 1 0 01-1-1z';
	// ── Read active filters from URL search params ──────────────
	let selectedGroup = $derived(page.url.searchParams.get('group') ?? '');
	let selectedLocation = $derived(page.url.searchParams.get('location') ?? '');
	let selectedLocationGroup = $derived(page.url.searchParams.get('locationGroup') ?? '');
	let dashboardFiltersOpen = $state(false);

	const navItems = $derived<CwSideNavItem[]>([
		{
			id: 'dashboard',
			label: m.nav_dashboard(),
			href: '/',
			icon: { path: DASHBOARD_ICON_PATH }
		},
		{
			id: 'locations',
			label: m.nav_locations(),
			href: '/locations',
			icon: { path: LOCATIONS_ICON_PATH }
		},
		{
			id: 'rules',
			label: m.nav_rules(),
			href: '/rules',
			icon: { path: RULES_ICON_PATH },
			group: 'Info and Management'
		},
		{
			id: 'reports',
			label: m.nav_reports(),
			href: '/reports',
			icon: { path: REPORTS_ICON_PATH },
			group: 'Info and Management'
		},
		{
			id: 'gateways',
			label: 'Gateways',
			href: '/gateways',
			icon: { path: GATEWAYS_ICON_PATH },
			group: 'Connectivity & Hardware'
		}
	]);

	// ── Groups list (dynamic from API) ──────────────────────────
	const groups: CwListBoxItem<string>[] = $derived.by(() => {
		const allItem: CwListBoxItem<string> = {
			value: '',
			label: m.sidebar_all_groups(),
			badge: m.common_all_short(),
			badgeTone: 'secondary',
			endText: String(app.devices?.length ?? 0)
		};
		const groupItems: CwListBoxItem<string>[] = normalizeDashboardFilterValues(
			app.deviceGroups
		).map((group) => ({
			value: group,
			label: group,
			badge: group.toUpperCase().substring(0, 2),
			badgeTone: 'info' as const
			// endText: String(group.length ?? 0)
		}));
		return [allItem, ...groupItems];
	});

	// ── Location Groups list (dynamic from API) ──────────────────────────
	const locationGroups: CwListBoxItem<string>[] = $derived.by(() => {
		const allItem: CwListBoxItem<string> = {
			value: '',
			label: m.sidebar_all_location_groups(),
			badge: m.common_all_short(),
			badgeTone: 'secondary',
			endText: String(app.locations?.length ?? 0)
		};
		const groupItems: CwListBoxItem<string>[] = normalizeDashboardFilterValues(
			app.locationGroups
		).map((group) => ({
			value: group,
			label: group,
			badge: group.toUpperCase().substring(0, 2),
			badgeTone: 'info' as const
			// endText: String(group.length ?? 0)
		}));
		return [allItem, ...groupItems];
	});

	// ── Locations list (dynamic from API) ───────────────────────
	const locations: CwListBoxItem<string>[] = $derived.by(() => {
		const allItem: CwListBoxItem<string> = {
			value: '',
			label: m.sidebar_all_locations(),
			endText: String(app.devices?.length ?? 0)
		};
		const locationItems: CwListBoxItem<string>[] = (app.locations ?? []).map((loc) => ({
			value: String(loc.location_id),
			label: loc.name,
			endText: String(app.devices?.filter((d) => d.location_id === loc.location_id).length ?? 0)
		}));
		return [allItem, ...locationItems];
	});

	// ── Navigate with updated search params on filter change ────
	function applyFilter(key: string, value: string) {
		const params = new URL(page.url);
		if (value) {
			params.searchParams.set(key, value);
		} else {
			params.searchParams.delete(key);
		}
		const qs = params.searchParams.toString();
		goto(resolve(qs ? `/?${qs}` : '/'), {
			replaceState: true,
			keepFocus: true,
			noScroll: true
		});
	}
</script>

<CwSideNav bind:mode items={navItems} responsive>
	{#snippet header()}
		<div class="app-sidebar__brand">
			<img src={CROPWATCH_LOGO} alt={m.app_name()} class="app-sidebar__brand-mark" />
			<span class="app-sidebar__brand-name">𝘾𝙧𝙤𝙥𝙒𝙖𝙩𝙘𝙝<sup><small>®</small></sup></span>
		</div>
	{/snippet}

	{#snippet aboveContent()}
		<div class="app-sidebar__mobile-utilities lg:hidden">
			<p class="app-sidebar__mobile-utilities-label">{m.nav_settings()}</p>
			<div class="app-sidebar__mobile-utilities-controls">
				<LanguageSwitcher compact />
				<CwThemePicker />
			</div>
		</div>

		{#if page.url.pathname === '/'}
			<CwExpandPanel title={m.sidebar_dashboard_filters()} open={dashboardFiltersOpen}>
				<div class="app-sidebar__filters-copy">{m.sidebar_filter_devices_in_view()}</div>
				<div
					class="dashboard-filters-scroll flex max-h-[50dvh] flex-col gap-2 overflow-y-auto overscroll-contain pr-1"
				>
					<CwListBox
						heading={`📱 ${m.sidebar_device_groups()}`}
						items={groups}
						value={selectedGroup}
						onselect={(item) => applyFilter('group', item.value)}
					/>

					<CwListBox
						heading={`📍 ${m.sidebar_location_groups()}`}
						items={locationGroups}
						value={selectedLocationGroup}
						onselect={(item) => applyFilter('locationGroup', item.value)}
					/>

					<CwListBox
						heading={`📍 ${m.sidebar_locations()}`}
						items={locations}
						value={selectedLocation}
						onselect={(item) => applyFilter('location', item.value)}
					/>
				</div>
			</CwExpandPanel>
		{/if}
	{/snippet}
	{#snippet footer()}
		<span class="app-sidebar__footer">
			<div class="app-sidebar__session">
				{#if app.session?.exp}
					<p class="app-sidebar__session-copy">
						{m.sidebar_current_session_expires()}: <CwDuration
							from={new Date(app.session.exp * 1000)}
							countDown={true}
							alarmAfterMinutes={0.5}
							alarmCallback={() => {
								document.location = buildLogoutPath({
									path: resolve('/auth/logout'),
									redirectTo: `${page.url.pathname}${page.url.search}`
								});
							}}
						/>
					</p>
				{/if}
			</div>
		</span>
	{/snippet}
</CwSideNav>

<style>
	.app-sidebar__brand {
		display: flex;
		height: 100%;
		width: 100%;
		flex-direction: row;
		align-items: center;
		gap: var(--cw-space-2);
		color: var(--cw-text-primary);
	}

	.app-sidebar__brand-mark {
		width: 2rem;
		height: 2rem;
	}

	.app-sidebar__brand-name {
		font-size: 1.125rem;
		font-weight: var(--cw-font-semibold);
		color: white;
	}

	:global(.cw-sidenav__above-content) {
		min-height: 0;
	}

	:global(.cw-sidenav__header),
	:global(.cw-sidenav__header--mini) {
		height: calc(5rem + var(--app-shell-padding-block-start));
		padding-top: var(--app-shell-padding-block-start);
	}

	:global(.cw-sidenav__items) {
		padding-bottom: max(var(--cw-space-2), var(--app-shell-padding-block-end));
	}

	:global(.cw-sidenav__footer) {
		padding-bottom: max(var(--cw-space-3), var(--app-shell-padding-block-end));
	}

	.app-sidebar__mobile-utilities {
		display: grid;
		gap: var(--cw-space-3);
		padding: var(--cw-space-3) var(--cw-space-4);
		border-bottom: 1px solid color-mix(in srgb, var(--cw-border-muted) 65%, transparent);
	}

	.app-sidebar__mobile-utilities-label {
		margin: 0;
		font-size: var(--cw-text-xs);
		font-weight: var(--cw-font-semibold);
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--cw-text-secondary);
	}

	.app-sidebar__mobile-utilities-controls {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--cw-space-3);
	}

	.app-sidebar__filters-copy {
		padding: var(--cw-space-3) var(--cw-space-4) var(--cw-space-2);
		font-size: var(--cw-text-sm);
		color: var(--cw-text-secondary);
	}

	.app-sidebar__footer {
		display: flex;
		flex-direction: column;
		gap: var(--cw-space-4);
	}

	.app-sidebar__session {
		padding: var(--cw-space-4);
		font-size: var(--cw-text-sm);
		color: var(--cw-text-secondary);
	}

	.app-sidebar__session-copy {
		margin: 0;
		font-size: var(--cw-text-xs);
	}

	.dashboard-filters-scroll {
		-webkit-overflow-scrolling: touch;
	}
</style>
