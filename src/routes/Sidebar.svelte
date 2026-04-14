<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { getAppContext } from '$lib/appContext.svelte';
	import CROPWATCH_LOGO from '$lib/images/cropwatch_static.svg';
	import { m } from '$lib/paraglide/messages.js';
	import { buildLogoutPath } from '$lib/utils/auth-redirect';
	import { CwDuration, CwSideNav, type CwSideNavItem } from '@cropwatchdevelopment/cwui';

	let { mode = $bindable() } = $props();

	const app = getAppContext();
	const DASHBOARD_ICON_PATH = 'M2 3h5v4H2V3zm7 0h5v4H9V3zM2 9h5v4H2V9zm7 0h5v4H9V9z';
	const LOCATIONS_ICON_PATH =
		'M8 2a6 6 0 100 12A6 6 0 008 2zm0 0c1.5 1.6 2.5 3.7 2.8 6-.3 2.3-1.3 4.4-2.8 6M8 2C6.5 3.6 5.5 5.7 5.2 8c.3 2.3 1.3 4.4 2.8 6M2 8h12M3.5 4.5h9M3.5 11.5h9';
	const RULES_ICON_PATH =
		'M3 4.5h6M3 8h6M3 11.5h6M10.5 4.5l1 1 2-2M10.5 8l1 1 2-2M10.5 11.5l1 1 2-2';
	const REPORTS_ICON_PATH =
		'M4 2.5h5l3 3V13a1 1 0 01-1 1H4a1 1 0 01-1-1v-9a1 1 0 011-1zM9 2.5V5a1 1 0 001 1h2M5.5 8.5h5M5.5 10.5h5';

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
		}
	]);
</script>

<CwSideNav bind:mode items={navItems} responsive>
	{#snippet header()}
		<div class="app-sidebar__brand">
			<img src={CROPWATCH_LOGO} alt={m.app_name()} class="app-sidebar__brand-mark" />
			<span class="app-sidebar__brand-name">𝘾𝙧𝙤𝙥𝙒𝙖𝙩𝙘𝙝<sup><small>®</small></sup></span>
		</div>
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
</style>
