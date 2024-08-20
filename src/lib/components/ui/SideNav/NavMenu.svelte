<script lang="ts">
	import { NavItem } from 'svelte-ux';
	import { page } from '$app/stores';
	import {
		mdiAccountGroup,
		mdiCog,
		mdiDevices,
		mdiFunction,
		mdiMapMarkerMultiple,
		mdiRouterWireless,
		mdiViewDashboard
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
		<li>
			<NavItem
				text={$_('nav.GeneralSettings')}
				icon={mdiCog}
				currentUrl={$page.url}
				path="/app/general-settings"
				classes={{ root: 'pl-3 hover:bg-primary/30', active: 'bg-primary/0 text-accent' }}
			/>
		</li>

		<h1>Locations</h1>
		<ul>
			<li>
				<NavItem
					text={$_('nav.AllLocations')}
					currentUrl={$page.url}
					path="/app/locations"
					icon={mdiMapMarkerMultiple}
					classes={{ root: 'pl-3 hover:bg-primary/30', active: 'bg-primary/30 text-accent' }}
				/>
			</li>
		</ul>

		<h1>{$_('nav.Devices')}</h1>
		<ul>
			<li>
				<NavItem
					text={$_('nav.AllDevices')}
					currentUrl={$page.url}
					path="/app/devices"
					icon={mdiDevices}
					classes={{ root: 'pl-3 hover:bg-primary/30', active: 'bg-primary/30 text-accent' }}
				/>
			</li>
		</ul>

		<h1>{$_('nav.Rules')}</h1>
		<ul>
			<li>
				<NavItem
					text={$_('nav.AllRules')}
					currentUrl={$page.url}
					path="/app/rules"
					icon={mdiFunction}
					classes={{ root: 'pl-3 hover:bg-primary/30', active: 'bg-primary/30 text-accent' }}
				/>
			</li>
		</ul>

		<h1>{$_('nav.Gateways')}</h1>
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
		</ul>

		<h1>{$_('nav.Users')}</h1>
		<ul>
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
</ul>

<style>
	h1 {
		margin-bottom: 12px;
	}
	li {
		margin-bottom: 5px;
	}
</style>
