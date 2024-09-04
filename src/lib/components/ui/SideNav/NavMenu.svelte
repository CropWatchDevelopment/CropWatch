<script lang="ts">
	import { NavItem } from 'svelte-ux';
	import { page } from '$app/stores';
	import {
		mdiAccountGroup,
		mdiCalendarMonth,
		mdiCog,
		mdiDevices,
		mdiFileChart,
		mdiFunction,
		mdiMapMarkerMultiple,
		mdiRouterWireless,
		mdiViewDashboard,
		mdiViewWeek
	} from '@mdi/js';
	import { _ } from 'svelte-i18n';
</script>

<ul class="nav h-full bg-surface-300">
	<h1>{$_('nav.general')}</h1>
	<ul>
		<li>
			<NavItem
				text={$_('nav.dashboard')}
				icon={mdiViewDashboard}
				currentUrl={$page.url}
				path="/app/dashboard"
				classes={{ root: 'pl-3 hover:bg-primary/30', active: 'bg-primary/30 text-accent' }}
			/>
		</li>
		<h1>{$_('nav.general')}</h1>
		<li>
			<NavItem
				text={$_('nav.GeneralSettings')}
				icon={mdiCog}
				currentUrl={$page.url}
				path="/app/general-settings"
				classes={{ root: 'pl-3 hover:bg-primary/30', active: 'bg-primary/0 text-accent' }}
			/>
		</li>

		<h1>{$_('nav.locations')}</h1>

		<li>
			<NavItem
				text={$_('nav.AllLocations')}
				currentUrl={$page.url}
				path="/app/locations"
				icon={mdiMapMarkerMultiple}
				classes={{ root: 'pl-3 hover:bg-primary/30', active: 'bg-primary/30 text-accent' }}
			/>
		</li>

		<h1>{$_('nav.Devices')}</h1>

		<li>
			<NavItem
				text={$_('nav.AllDevices')}
				currentUrl={$page.url}
				path="/app/devices"
				icon={mdiDevices}
				classes={{ root: 'pl-3 hover:bg-primary/30', active: 'bg-primary/30 text-accent' }}
			/>
		</li>

		<h1>{$_('nav.Reports')}</h1>

		<li>
			<NavItem
				text={$_('nav.AllReports')}
				currentUrl={$page.url}
				path="/app/reports"
				icon={mdiFileChart}
				classes={{ root: 'pl-3 hover:bg-primary/30', active: 'bg-primary/30 text-accent' }}
			/>
		</li>
		<ul>
			<li>
				<NavItem
					text={$_('nav.weeklyReports')}
					currentUrl={$page.url}
					path="/app/reports"
					icon={mdiViewWeek}
					classes={{ root: 'pl-3 hover:bg-primary/30', active: 'bg-primary/30 text-accent' }}
				/>
			</li>
			<li>
				<NavItem
					text={$_('nav.monthlyReports')}
					currentUrl={$page.url}
					path="/app/reports"
					icon={mdiCalendarMonth}
					classes={{ root: 'pl-3 hover:bg-primary/30', active: 'bg-primary/30 text-accent' }}
				/>
			</li>
		</ul>

		<h1>{$_('nav.Rules')}</h1>

		<li>
			<NavItem
				text={$_('nav.AllRules')}
				currentUrl={$page.url}
				path="/app/rules"
				icon={mdiFunction}
				classes={{ root: 'pl-3 hover:bg-primary/30', active: 'bg-primary/30 text-accent' }}
			/>
		</li>

		<!-- <h1>{$_('nav.Gateways')}</h1>
		<ul>
			<li>
				<NavItem
					text={$_('nav.Gateways')}
					currentUrl={$page.url}
					path="/app/gateways"
					icon={mdiRouterWireless}
					classes={{ root: 'pl-3 hover:bg-primary/30', active: 'bg-primary/30 text-accent' }}
				/>
			</li>
		</ul> -->

		<h1>{$_('nav.Users')}</h1>

		<li>
			<NavItem
				text={$_('nav.AllUsers')}
				currentUrl={$page.url}
				path="/app/users"
				icon={mdiAccountGroup}
				classes={{ root: 'pl-3 hover:bg-primary/30', active: 'bg-primary/30 text-accent' }}
			/>
		</li>
	</ul>
</ul>

<style>
	h1 {
		margin-bottom: 12px;
	}
	li {
		margin-bottom: 10px;
	}
	ul {
		list-style-type: none;
	}
	ul ul {
		margin-left: 10px;

	}
</style>
