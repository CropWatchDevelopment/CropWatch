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

		// Apply light mode tint to dropdown menus only when not in dark mode
		if (browser) {
			setTimeout(() => {
				// Check if dark mode is active
				const isDarkMode = document.documentElement.classList.contains('dark') || 
					window.matchMedia('(prefers-color-scheme: dark)').matches;

				if (!isDarkMode) {
					const dropdownContents = document.querySelectorAll('.dropdown-menu-content');
					dropdownContents.forEach(menu => {
						menu.classList.add('light-mode-tint');
					});

					const dropdownItems = document.querySelectorAll('.dropdown-menu-item');
					dropdownItems.forEach(item => {
						item.addEventListener('mouseenter', () => {
							item.classList.add('light-mode-hover');
						});
						item.addEventListener('mouseleave', () => {
							item.classList.remove('light-mode-hover');
						});
					});
				}
			}, 100);
		}
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

<style>
	/* Animation for dropdown opening */
	@keyframes fadeInDown {
		from {
			opacity: 0;
			transform: translateY(-10px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes scaleIn {
		from {
			opacity: 0;
			transform: scale(0.95);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	/* Icon button hover effects */
	:global(.icon-btn) {
		transition: all 0.2s ease;
		position: relative;
		overflow: hidden;
	}

	:global(.icon-btn:hover) {
		transform: translateY(-1px);
		filter: brightness(1.1);
		box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
		background-color: rgba(255, 255, 255, 0.1);
	}

	:global(.icon-btn:active) {
		transform: translateY(0);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
	}

	:global(.icon-btn:focus) {
		outline: none;
		box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2);
	}

	:global(.icon-btn::after) {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 70%);
		opacity: 0;
		transition: opacity 0.3s ease;
	}

	:global(.icon-btn:hover::after) {
		opacity: 1;
	}

	/* Spacing between icon and text */
	:global(.icon-text-spacing) {
		margin-top: 0.5rem;
	}

	/* Dropdown animation */
	:global(.dropdown-animation) {
		animation: fadeInDown 0.2s ease forwards;
	}

	/* Sub-dropdown animation and styling */
	:global(.sub-dropdown-animation) {
		animation: scaleIn 0.15s ease-out forwards;
	}

	:global(.dropdown-content) {
		box-shadow: 0 8px 20px rgba(0, 0, 0, 0.6);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.5rem;
	}

	/* Selected state for dropdown items */
	:global(.dropdown-item-selected) {
		position: relative;
	}

	:global(.dropdown-item-selected::before) {
		content: '';
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 3px;
		background: currentColor;
		border-radius: 0 3px 3px 0;
		opacity: 0.8;
	}
</style>

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
			class="absolute z-50 mt-2 w-auto min-w-[220px] rounded-md border border-gray-200 bg-gray-50 shadow-lg dark:border-gray-600 dark:bg-gray-700 dark:shadow-[0_8px_20px_rgba(0,0,0,0.6)] dropdown-animation"
			style="border: 1px solid rgba(255, 255, 255, 0.1);"
		>
			<!-- Search input -->
			<div class="p-3">
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
						onkeydown={(e) => {
							if (e.key === 'Enter') {
								browser ? localStorage.setItem('dashboard_search', search) : null;
							}
						}}
					/>
					{#if search}
						<button
							class="absolute inset-y-0 right-0 flex items-center pr-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
							onclick={clearSearch}
							aria-label="Clear search"
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
				class="flex flex-row items-center justify-center border-t border-gray-200 px-4 py-6 mt-2 dark:border-gray-600 gap-7"
			>
				<!-- Hide/Show Empty Locations -->
				<Tooltip.Provider>
					<Tooltip.Root>
						<Tooltip.Trigger>
							<div class="mx-2 flex flex-col items-center">
								<button
									class="flex h-8 w-8 items-center justify-center rounded-full {hideNoDeviceLocations
										? 'bg-yellow-500 text-white'
										: 'bg-green-500 text-white'} icon-btn transition-all duration-200 hover:bg-white/10 focus:outline-none focus:shadow-[0_0_0_2px_rgba(255,255,255,0.2)]"
									onclick={toggleHideEmpty}
									aria-label="Toggle empty locations"
								>
									<svg viewBox="0 0 24 24" width="16" height="16">
										<path fill="currentColor" d={hideNoDeviceLocations ? mdiEyeOff : mdiEye} />
									</svg>
								</button>
								<span class="icon-text-spacing text-center text-xs">{nameToJapaneseName('Hide/Show Empty')}</span
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

				<span class="mx-4 h-8 w-px bg-gray-300 dark:bg-gray-500"></span>

				<!-- Dashboard Layout -->
				<Tooltip.Provider>
					<Tooltip.Root>
						<Tooltip.Trigger>
							<div class="mx-2 flex flex-col items-center">
								<DropdownMenu.Root bind:open={layoutMenuOpen}>
									<DropdownMenu.Trigger>
										<button
											class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white icon-btn transition-all duration-200 hover:bg-white/10 focus:outline-none focus:shadow-[0_0_0_2px_rgba(255,255,255,0.2)]"
											aria-label="Dashboard layout options"
										>
											<svg viewBox="0 0 24 24" width="16" height="16">
												<path fill="currentColor" d={mdiMonitorDashboard} />
											</svg>
										</button>
									</DropdownMenu.Trigger>
									<DropdownMenu.Content
										class="z-50 min-w-[180px] rounded-md border border-gray-200 bg-gray-50 p-2 shadow-lg dark:border-gray-600 dark:bg-gray-700 dark:shadow-[0_4px_12px_rgba(0,0,0,0.5)] dropdown-animation"
										style="border: 1px solid rgba(255, 255, 255, 0.08);"
									>
										<DropdownMenu.Item
											class="flex cursor-pointer items-center rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:text-gray-200 dark:hover:bg-gray-600/90 hover:shadow-sm transition-all duration-150 {dashboardViewType === 'grid' ? 'bg-blue-50 dark:bg-blue-900/30 font-medium dropdown-item-selected' : ''}"
											onSelect={() => setDashboardViewType('grid')}
										>
											<svg viewBox="0 0 24 24" width="16" height="16" class="mr-2">
												<path fill="currentColor" d={mdiGrid} />
											</svg>
											Grid
										</DropdownMenu.Item>
										<DropdownMenu.Item
											class="flex cursor-pointer items-center rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:text-gray-200 dark:hover:bg-gray-600/90 hover:shadow-sm transition-all duration-150 {dashboardViewType === 'mozaic' ? 'bg-blue-50 dark:bg-blue-900/30 font-medium dropdown-item-selected' : ''}"
											onSelect={() => setDashboardViewType('mozaic')}
										>
											<svg viewBox="0 0 24 24" width="16" height="16" class="mr-2">
												<path fill="currentColor" d={mdiViewDashboard} />
											</svg>
											Mozaic
										</DropdownMenu.Item>
										<DropdownMenu.Item
											class="flex cursor-pointer items-center rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:text-gray-200 dark:hover:bg-gray-600/90 hover:shadow-sm transition-all duration-150 {dashboardViewType === 'list' ? 'bg-blue-50 dark:bg-blue-900/30 font-medium dropdown-item-selected' : ''}"
											onSelect={() => setDashboardViewType('list')}
										>
											<svg viewBox="0 0 24 24" width="16" height="16" class="mr-2">
												<path fill="currentColor" d={mdiViewList} />
											</svg>
											List
										</DropdownMenu.Item>
									</DropdownMenu.Content>
								</DropdownMenu.Root>
								<span class="icon-text-spacing text-center text-xs">{nameToJapaneseName('Dashboard Style')}</span>
							</div>
						</Tooltip.Trigger>
						<Tooltip.Content>
							<div class="rounded bg-gray-800 px-2 py-1 text-xs text-white">Dashboard Layout</div>
						</Tooltip.Content>
					</Tooltip.Root>
				</Tooltip.Provider>

				<span class="mx-4 h-8 w-px bg-gray-300 dark:bg-gray-500"></span>

				<!-- Sort By -->
				<Tooltip.Provider>
					<Tooltip.Root>
						<Tooltip.Trigger>
							<div class="mx-2 flex flex-col items-center">
								<DropdownMenu.Root bind:open={sortMenuOpen}>
									<DropdownMenu.Trigger>
										<button
											class="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500 text-white icon-btn transition-all duration-200 hover:bg-white/10 focus:outline-none focus:shadow-[0_0_0_2px_rgba(255,255,255,0.2)]"
											aria-label="Sort options"
										>
											<svg viewBox="0 0 24 24" width="16" height="16">
												<path fill="currentColor" d={mdiSort} />
											</svg>
										</button>
									</DropdownMenu.Trigger>
									<DropdownMenu.Content
										class="z-50 min-w-[180px] rounded-md border border-gray-200 bg-gray-50 p-2 shadow-lg dark:border-gray-600 dark:bg-gray-700 dark:shadow-[0_4px_12px_rgba(0,0,0,0.5)] dropdown-animation"
										style="border: 1px solid rgba(255, 255, 255, 0.08);"
									>
										<DropdownMenu.Item
											class="flex cursor-pointer items-center rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:text-gray-200 dark:hover:bg-gray-600/90 hover:shadow-sm transition-all duration-150 {dashboardSortType === 'alpha' ? 'bg-purple-50 dark:bg-purple-900/30 font-medium dropdown-item-selected' : ''}"
											onSelect={() => setDashboardSortType('alpha')}
										>
											<svg viewBox="0 0 24 24" width="16" height="16" class="mr-2">
												<path fill="currentColor" d={mdiSortAlphabeticalAscending} />
											</svg>
											Alpha
										</DropdownMenu.Item>
										<DropdownMenu.Item
											class="flex cursor-pointer items-center rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:text-gray-200 dark:hover:bg-gray-600/90 hover:shadow-sm transition-all duration-150 {dashboardSortType === 'date' ? 'bg-purple-50 dark:bg-purple-900/30 font-medium dropdown-item-selected' : ''}"
											onSelect={() => setDashboardSortType('date')}
										>
											<svg viewBox="0 0 24 24" width="16" height="16" class="mr-2">
												<path fill="currentColor" d={mdiSortCalendarAscending} />
											</svg>
											Date
										</DropdownMenu.Item>
										<DropdownMenu.Item
											class="flex cursor-pointer items-center rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-200 dark:text-gray-200 dark:hover:bg-gray-600/90 hover:shadow-sm transition-all duration-150 {dashboardSortType === 'time' ? 'bg-purple-50 dark:bg-purple-900/30 font-medium dropdown-item-selected' : ''}"
											onSelect={() => setDashboardSortType('time')}
										>
											<svg viewBox="0 0 24 24" width="16" height="16" class="mr-2">
												<path fill="currentColor" d={mdiSortClockAscending} />
											</svg>
											Time
										</DropdownMenu.Item>
									</DropdownMenu.Content>
								</DropdownMenu.Root>
								<span class="icon-text-spacing text-center text-xs">{nameToJapaneseName('Sort By')}</span>
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
