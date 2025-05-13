<script lang="ts">
	import { browser } from '$app/environment';
	import { nameToJapaneseName } from '$lib/utilities/nameToJapanese';
	import {
		mdiClose,
		mdiEye,
		mdiEyeOff,
		mdiFilterMenu,
		mdiGrid,
		mdiMagnify,
		mdiMonitorDashboard,
		mdiSort,
		mdiSortAlphabeticalAscending,
		mdiSortCalendarAscending,
		mdiSortClockAscending,
		mdiViewDashboard,
		mdiViewList
	} from '@mdi/js';
	import {
		Badge,
		Button,
		Menu,
		MenuItem,
		ResponsiveMenu,
		TextField,
		Toggle,
		Tooltip
	} from 'svelte-ux';

	let {
		search = $bindable(''),
		hideNoDeviceLocations = $bindable(false),
		dashboardViewType = $bindable('mozaic'),
		dashboardSortType = $bindable('alpha')
	} = $props();
	$effect(() => {
		document.onkeydown = function (evt: any) {
			var isEscape = false;
			if ('key' in evt) {
				isEscape = evt.key === 'Escape' || evt.key === 'Esc';
			} else {
				isEscape = evt.keyCode === 27;
			}
			if (isEscape) {
				search = '';
				browser ? localStorage.removeItem('dashboard_search') : null;
			}
		};
	});
</script>

<Toggle let:on={open} let:toggle let:toggleOff>
	<Badge value={search ? 1 : 0} circle small class="bg-warning text-black">
		<Button icon={mdiFilterMenu} onclick={toggle}>
			<ResponsiveMenu {open} on:close={toggleOff} menuProps={{ explicitClose: true }}>
				<div class="p-2">
					<!-- Add autofocus delay to keep the opening transition smooth  -->
					<TextField
					class="text-surface-content"
						bind:value={search}
						on:keydown={(e) => {
							if (e.key === 'Enter') {
								toggle();
								browser ? localStorage.setItem('dashboard_search', search) : null;
							}
						}}
						label={nameToJapaneseName('Search')}
						icon={mdiMagnify}
						placeholder={nameToJapaneseName('Search')}
						autofocus={{ delay: 50 }}
					>
						<div slot="append">
							<Button
								icon={mdiClose}
								class="p-2 text-surface-content/50"
								onclick={() => {
									search = '';
									browser ? localStorage.removeItem('dashboard_search') : null;
									toggle();
								}}
							/>
						</div>
					</TextField>
				</div>
				<div class="center flex flex-row p-1">
					<Tooltip
						title={hideNoDeviceLocations
							? 'Click to include empty locations'
							: 'Click to hide locations without devices'}
					>
						<div class="flex flex-col">
							<Button
								icon={hideNoDeviceLocations ? mdiEyeOff : mdiEye}
								rounded
								color={hideNoDeviceLocations ? 'warning' : 'success'}
								onclick={() => {
									hideNoDeviceLocations = !hideNoDeviceLocations;
									browser
										? localStorage.setItem(
												'hide_empty_locations',
												hideNoDeviceLocations ? 'true' : 'false'
											)
										: null;
								}}
							/>
							<span class="text-center text-xs">{nameToJapaneseName('Hide/Show Empty')}</span>
						</div>
					</Tooltip>
					<span class="min-h-50 mx-2 w-1 border"></span>
					<Tooltip title="Dashboard Layout">
						<div class="flex flex-col">
							<Toggle let:on={open} let:toggle let:toggleOff>
								<Button onclick={toggle} icon={mdiMonitorDashboard}>
									<Menu {open} on:close={toggleOff}>
										<MenuItem
											icon={mdiGrid}
											onclick={() => {
												dashboardViewType = 'grid';
												browser
													? localStorage.setItem('dashboard_view_type', dashboardViewType)
													: null;
											}}>Grid</MenuItem
										>
										<MenuItem
											icon={mdiViewDashboard}
											onclick={() => {
												dashboardViewType = 'mozaic';
												browser
													? localStorage.setItem('dashboard_view_type', dashboardViewType)
													: null;
											}}>Mozaic</MenuItem
										>
										<MenuItem
											icon={mdiViewList}
											onclick={() => {
												dashboardViewType = 'list';
												browser
													? localStorage.setItem('dashboard_view_type', dashboardViewType)
													: null;
											}}>List</MenuItem
										>
									</Menu>
								</Button>
							</Toggle>
							<span class="text-center text-xs">{nameToJapaneseName('Dashboard Style')}</span>
						</div>
					</Tooltip>
					<span class="min-h-50 mx-2 w-1 border"></span>
					<Tooltip title="Dashboard Layout">
						<div class="flex flex-col">
							<Toggle let:on={open} let:toggle let:toggleOff>
								<Button onclick={toggle} icon={mdiSort}>
									<Menu {open} on:close={toggleOff}>
										<MenuItem
											icon={mdiSortAlphabeticalAscending}
											onclick={() => {
												dashboardSortType = 'alpha';
												browser
													? localStorage.setItem('dashboard_sort_type', dashboardSortType)
													: null;
											}}>Alpha</MenuItem
										>
										<MenuItem
											icon={mdiSortCalendarAscending}
											onclick={() => {
												dashboardSortType = 'date';
												browser
													? localStorage.setItem('dashboard_sort_type', dashboardSortType)
													: null;
											}}>Date</MenuItem
										>
										<MenuItem
											icon={mdiSortClockAscending}
											onclick={() => {
												dashboardSortType = 'time';
												browser
													? localStorage.setItem('dashboard_sort_type', dashboardSortType)
													: null;
											}}>Time</MenuItem
										>
									</Menu>
								</Button>
							</Toggle>
							<span class="text-center text-xs">{nameToJapaneseName('Sort By')}</span>
						</div>
					</Tooltip>
				</div>
			</ResponsiveMenu>
		</Button>
	</Badge>
</Toggle>
