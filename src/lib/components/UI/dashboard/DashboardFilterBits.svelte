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
	import { Collapsible, DropdownMenu, Button, Tooltip } from 'bits-ui';

	let {
		search = $bindable(''),
		hideNoDeviceLocations = $bindable(false),
		dashboardViewType = $bindable('mozaic'),
		dashboardSortType = $bindable('alpha')
	} = $props();

	// State for dropdown menus
	let layoutMenuOpen = $state(false);
	let sortMenuOpen = $state(false);

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

	function clearSearch() {
		search = '';
		browser ? localStorage.removeItem('dashboard_search') : null;
	}

	function toggleHideEmpty() {
		hideNoDeviceLocations = !hideNoDeviceLocations;
		browser
			? localStorage.setItem('hide_empty_locations', hideNoDeviceLocations ? 'true' : 'false')
			: null;
	}

	function setDashboardViewType(type: 'grid' | 'mozaic' | 'list') {
		dashboardViewType = type;
		browser ? localStorage.setItem('dashboard_view_type', dashboardViewType) : null;
		layoutMenuOpen = false;
	}

	function setDashboardSortType(type: 'alpha' | 'date' | 'time') {
		dashboardSortType = type;
		browser ? localStorage.setItem('dashboard_sort_type', dashboardSortType) : null;
		sortMenuOpen = false;
	}
</script>

<Collapsible.Root>
	<Collapsible.Trigger>
		<Button.Root
			class="bg-background-alt hover:bg-background-alt/90 flex items-center justify-center rounded-md p-2"
		>
			<svg viewBox="0 0 24 24" width="24" height="24" class="text-current">
				<path fill="currentColor" d={mdiFilterMenu} />
			</svg>
		</Button.Root>
	</Collapsible.Trigger>

	<Collapsible.Content>
		<div
			class="absolute z-50 mt-2 w-auto min-w-[200px] rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
		>
			<!-- Search input -->
			<div class="p-2">
				<div class="relative">
					<div class="absolute inset-y-0 left-0 flex items-center pl-2">
						<svg viewBox="0 0 24 24" width="16" height="16" class="text-gray-500">
							<path fill="currentColor" d={mdiMagnify} />
						</svg>
					</div>
					<input
						type="text"
						bind:value={search}
						class="w-full rounded-md border border-gray-300 bg-white py-2 pr-8 pl-8 text-sm placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500"
						placeholder={nameToJapaneseName('Search')}
						on:keydown={(e) => {
							if (e.key === 'Enter') {
								browser ? localStorage.setItem('dashboard_search', search) : null;
							}
						}}
					/>
					{#if search}
						<button
							class="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
							on:click={clearSearch}
						>
							<svg viewBox="0 0 24 24" width="16" height="16">
								<path fill="currentColor" d={mdiClose} />
							</svg>
						</button>
					{/if}
				</div>
			</div>

			<!-- Filter options -->
			<div
				class="flex flex-row items-center justify-center border-t border-gray-200 p-1 dark:border-gray-700"
			>
				<!-- Hide/Show Empty Locations -->
				<Tooltip.Provider>
					<Tooltip.Root>
						<Tooltip.Trigger>
							<div class="mx-2 flex flex-col items-center">
								<button
									class="flex h-8 w-8 items-center justify-center rounded-full {hideNoDeviceLocations
										? 'bg-yellow-500 text-white'
										: 'bg-green-500 text-white'} hover:opacity-90"
									on:click={toggleHideEmpty}
								>
									<svg viewBox="0 0 24 24" width="16" height="16">
										<path fill="currentColor" d={hideNoDeviceLocations ? mdiEyeOff : mdiEye} />
									</svg>
								</button>
								<span class="mt-1 text-center text-xs">{nameToJapaneseName('Hide/Show Empty')}</span
								>
							</div>
						</Tooltip.Trigger>
						<Tooltip.Content>
							<div class="rounded bg-gray-800 px-2 py-1 text-xs text-white">
								{hideNoDeviceLocations
									? 'Click to include empty locations'
									: 'Click to hide locations without devices'}
							</div>
						</Tooltip.Content>
					</Tooltip.Root>
				</Tooltip.Provider>

				<span class="mx-2 h-8 w-px bg-gray-300 dark:bg-gray-600"></span>

				<!-- Dashboard Layout -->
				<Tooltip.Provider>
					<Tooltip.Root>
						<Tooltip.Trigger>
							<div class="mx-2 flex flex-col items-center">
								<DropdownMenu.Root bind:open={layoutMenuOpen}>
									<DropdownMenu.Trigger>
										<button
											class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white hover:bg-blue-600"
										>
											<svg viewBox="0 0 24 24" width="16" height="16">
												<path fill="currentColor" d={mdiMonitorDashboard} />
											</svg>
										</button>
									</DropdownMenu.Trigger>
									<DropdownMenu.Content
										class="z-50 min-w-[180px] rounded-md border border-gray-200 bg-white p-1 shadow-md dark:border-gray-700 dark:bg-gray-800"
									>
										<DropdownMenu.Item
											class="flex cursor-pointer items-center rounded-md px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
											on:click={() => setDashboardViewType('grid')}
										>
											<svg viewBox="0 0 24 24" width="16" height="16" class="mr-2">
												<path fill="currentColor" d={mdiGrid} />
											</svg>
											Grid
										</DropdownMenu.Item>
										<DropdownMenu.Item
											class="flex cursor-pointer items-center rounded-md px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
											on:click={() => setDashboardViewType('mozaic')}
										>
											<svg viewBox="0 0 24 24" width="16" height="16" class="mr-2">
												<path fill="currentColor" d={mdiViewDashboard} />
											</svg>
											Mozaic
										</DropdownMenu.Item>
										<DropdownMenu.Item
											class="flex cursor-pointer items-center rounded-md px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
											on:click={() => setDashboardViewType('list')}
										>
											<svg viewBox="0 0 24 24" width="16" height="16" class="mr-2">
												<path fill="currentColor" d={mdiViewList} />
											</svg>
											List
										</DropdownMenu.Item>
									</DropdownMenu.Content>
								</DropdownMenu.Root>
								<span class="mt-1 text-center text-xs">{nameToJapaneseName('Dashboard Style')}</span
								>
							</div>
						</Tooltip.Trigger>
						<Tooltip.Content>
							<div class="rounded bg-gray-800 px-2 py-1 text-xs text-white">Dashboard Layout</div>
						</Tooltip.Content>
					</Tooltip.Root>
				</Tooltip.Provider>

				<span class="mx-2 h-8 w-px bg-gray-300 dark:bg-gray-600"></span>

				<!-- Sort By -->
				<Tooltip.Provider>
					<Tooltip.Root>
						<Tooltip.Trigger>
							<div class="mx-2 flex flex-col items-center">
								<DropdownMenu.Root bind:open={sortMenuOpen}>
									<DropdownMenu.Trigger>
										<button
											class="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500 text-white hover:bg-purple-600"
										>
											<svg viewBox="0 0 24 24" width="16" height="16">
												<path fill="currentColor" d={mdiSort} />
											</svg>
										</button>
									</DropdownMenu.Trigger>
									<DropdownMenu.Content
										class="z-50 min-w-[180px] rounded-md border border-gray-200 bg-white p-1 shadow-md dark:border-gray-700 dark:bg-gray-800"
									>
										<DropdownMenu.Item
											class="flex cursor-pointer items-center rounded-md px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
											on:click={() => setDashboardSortType('alpha')}
										>
											<svg viewBox="0 0 24 24" width="16" height="16" class="mr-2">
												<path fill="currentColor" d={mdiSortAlphabeticalAscending} />
											</svg>
											Alpha
										</DropdownMenu.Item>
										<DropdownMenu.Item
											class="flex cursor-pointer items-center rounded-md px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
											on:click={() => setDashboardSortType('date')}
										>
											<svg viewBox="0 0 24 24" width="16" height="16" class="mr-2">
												<path fill="currentColor" d={mdiSortCalendarAscending} />
											</svg>
											Date
										</DropdownMenu.Item>
										<DropdownMenu.Item
											class="flex cursor-pointer items-center rounded-md px-2 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
											on:click={() => setDashboardSortType('time')}
										>
											<svg viewBox="0 0 24 24" width="16" height="16" class="mr-2">
												<path fill="currentColor" d={mdiSortClockAscending} />
											</svg>
											Time
										</DropdownMenu.Item>
									</DropdownMenu.Content>
								</DropdownMenu.Root>
								<span class="mt-1 text-center text-xs">{nameToJapaneseName('Sort By')}</span>
							</div>
						</Tooltip.Trigger>
						<Tooltip.Content>
							<div class="rounded bg-gray-800 px-2 py-1 text-xs text-white">Sort By</div>
						</Tooltip.Content>
					</Tooltip.Root>
				</Tooltip.Provider>
			</div>
		</div>
	</Collapsible.Content>
</Collapsible.Root>
