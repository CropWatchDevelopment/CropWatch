<script lang="ts">
	import { Icon, NavItem } from 'svelte-ux';

	import { page } from '$app/stores';
	import {
		mdiAccountGroup,
		mdiCog,
		mdiDevices,
		mdiFormatListBulleted,
		mdiHome,
		mdiMapMarkerDistance,
		mdiMapMarkerMultiple,
		mdiPalette,
		mdiRouterWireless,
		mdiViewDashboard
	} from '@mdi/js';
</script>

<nav class="nav mr-1 h-full bg-surface-300">
	<ul>
		<h1>General</h1>
		<ul>
			<li>
				<NavItem
					text="Dashboard"
					icon={mdiViewDashboard}
					currentUrl={$page.url}
					path="/app/dashboard"
					classes={{ root: 'pl-3', active: 'bg-primary/10 text-primary' }}
				/>
			</li>
			<li>
				<NavItem
					text="General Settings"
					icon={mdiCog}
					currentUrl={$page.url}
					path="/app/general-settings"
					classes={{ root: 'pl-3', active: 'bg-primary/10 text-primary' }}
				/>
			</li>

			<h1>Locations</h1>
			<ul>
				<li>
					<NavItem
						text="All Locations"
						currentUrl={$page.url}
						path="/app/locations"
						icon={mdiMapMarkerMultiple}
						classes={{ root: 'pl-3', active: 'bg-primary/10 text-primary' }}
					/>
				</li>
			</ul>

			<h1>Devices</h1>
			<ul>
				<li>
					<NavItem
						text="All Devices"
						currentUrl={$page.url}
						path="/app/devices"
						icon={mdiDevices}
						classes={{ root: 'pl-3', active: 'bg-primary/10 text-primary' }}
					/>
				</li>
			</ul>

			<h1>Gateways</h1>
			<ul>
				<li>
					<NavItem
						text="Gateway Status"
						currentUrl={$page.url}
						path="/app/gateways"
						icon={mdiRouterWireless}
						classes={{ root: 'pl-3', active: 'bg-primary/10 text-primary' }}
					/>
				</li>
			</ul>

			<h1>Users</h1>
			<ul>
				<li>
					<NavItem
						text="All Users"
						currentUrl={$page.url}
						path="/app/users"
						icon={mdiAccountGroup}
						classes={{ root: 'pl-3', active: 'bg-primary/10 text-primary' }}
					/>
				</li>
			</ul>
		</ul>
	</ul>
</nav>

<style>
	h1 {
		margin-bottom: 12px;
	}
	li {
		margin-bottom: 5px;
	}
</style>