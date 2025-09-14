<script lang="ts">
	// Import statements
	import { browser } from '$app/environment';
	import {
		mdiEye,
		mdiEyeOff,
		mdiGrid,
		mdiMonitorDashboard,
		mdiSort,
		mdiSortAlphabeticalAscending,
		mdiSortCalendarAscending,
		mdiSortClockAscending,
		mdiTune,
		mdiViewDashboard,
		mdiViewList
	} from '@mdi/js';
	import { Button, DropdownMenu, Tooltip } from 'bits-ui';
	import { onMount } from 'svelte';
	import { themeStore } from '$lib/stores/theme';
	let currentTheme: 'light' | 'dark';
	themeStore.subscribe((s) => (currentTheme = s.effective));
	import { _ } from 'svelte-i18n';
	import type { HTMLAttributes } from 'svelte/elements';

	// Define TypeScript type for onSelect prop
	interface DropdownItemProps extends HTMLAttributes<HTMLDivElement> {
		onSelect?: (event: Event) => void;
		'data-state'?: string;
	}

	// Define props with defaults
	export let search = '';
	export let hideNoDeviceLocations = false;
	export let dashboardViewType = 'mozaic';
	export let dashboardSortType = 'alpha';

	// State for dropdown menus
	let mainMenuOpen = false;
	let layoutSubMenuOpen = false;
	let sortSubMenuOpen = false;

	onMount(() => {
		if (!browser) return;

		// Handle escape key press
		document.onkeydown = function (evt: any) {
			var isEscape = false;
			if ('key' in evt) {
				isEscape = evt.key === 'Escape' || evt.key === 'Esc';
			} else {
				isEscape = evt.keyCode === 27;
			}
			if (isEscape) {
				search = '';
				localStorage.removeItem('dashboard_search');
				// We'll rely on bits-ui's built-in functionality for handling clicks outside
			}
		};

		// Apply light mode tint to dropdown menus only when not in dark mode
		setTimeout(() => {
			// Check if dark mode is active
			const isDarkMode = currentTheme === 'dark';

			if (!isDarkMode) {
				const dropdownContents = document.querySelectorAll('.dropdown-menu-content');
				dropdownContents.forEach((menu) => {
					menu.classList.add('light-mode-tint');
				});

				const dropdownItems = document.querySelectorAll('.dropdown-menu-item');
				dropdownItems.forEach((item) => {
					item.addEventListener('mouseenter', () => {
						item.classList.add('light-mode-hover');
					});
					item.addEventListener('mouseleave', () => {
						item.classList.remove('light-mode-hover');
					});
				});
			}
		}, 100);
	});

	function toggleHideEmpty() {
		hideNoDeviceLocations = !hideNoDeviceLocations;
		browser
			? localStorage.setItem('hide_empty_locations', hideNoDeviceLocations ? 'true' : 'false')
			: null;
	}

	function setDashboardViewType(type: 'grid' | 'mozaic' | 'list', event?: Event) {
		// Prevent the menu from closing when selecting an option
		if (event) {
			event.preventDefault();
			event.stopPropagation();
		}
		dashboardViewType = type;
		browser ? localStorage.setItem('dashboard_view_type', dashboardViewType) : null;
	}

	function setDashboardSortType(type: 'alpha' | 'date' | 'time', event?: Event) {
		// Prevent the menu from closing when selecting an option
		if (event) {
			event.preventDefault();
			event.stopPropagation();
		}
		dashboardSortType = type;
		browser ? localStorage.setItem('dashboard_sort_type', dashboardSortType) : null;
	}
</script>

<div>
	<DropdownMenu.Root bind:open={mainMenuOpen}>
		<DropdownMenu.Trigger>
			<Button.Root
				class="bg-background-alt hover:bg-background-alt/90 flex items-center justify-center rounded-md px-2"
			>
				<svg viewBox="0 0 24 24" width="24" height="24" class="text-current">
					<path fill="currentColor" d={mdiTune} />
				</svg>
			</Button.Root>
		</DropdownMenu.Trigger>

		<DropdownMenu.Content
			side="bottom"
			align="start"
			class="dropdown-surface dropdown-animation z-50 mt-2 w-auto min-w-[220px] p-2"
		>
			<!-- Search input  -> moved to Locations panel -->

			<!-- Filter options -->
			<div
				class="flex flex-row items-center justify-center gap-2 border-gray-200 px-4 py-6 dark:border-gray-600"
			>
				<!-- Hide/Show Empty Locations -->
				<Tooltip.Provider>
					<Tooltip.Root delayDuration={300} disableHoverableContent={true}>
						<div tabindex="-1"></div>
						<Tooltip.Trigger>
							<div tabindex="-1">
								<div class="mx-2 flex flex-col items-center">
									<button
										class={`flex h-8 w-8 items-center justify-center rounded-full text-white transition-all duration-200 focus:ring-2 focus:ring-white/20 focus:outline-none ${
											hideNoDeviceLocations
												? 'bg-yellow-500 hover:bg-yellow-600 dark:hover:bg-yellow-400'
												: 'bg-green-500 hover:bg-green-600 dark:hover:bg-green-400'
										}`}
										onclick={toggleHideEmpty}
										aria-label={hideNoDeviceLocations
											? 'Show empty locations'
											: 'Hide empty locations'}
									>
										<svg viewBox="0 0 24 24" width="16" height="16">
											<path fill="currentColor" d={hideNoDeviceLocations ? mdiEyeOff : mdiEye} />
										</svg>
									</button>
									<span class="icon-text-spacing block min-w-[100px] text-center text-xs"
										>{$_('Hide/Show Empty')}</span
									>
								</div>
							</div>
						</Tooltip.Trigger>
						<Tooltip.Content>
							<!-- <div class="rounded bg-gray-800 px-2 py-1 text-xs text-white">
								{hideNoDeviceLocations
									? 'Click to include empty locations'
									: 'Click to hide locations without devices'}
							</div> -->
						</Tooltip.Content>
					</Tooltip.Root>
				</Tooltip.Provider>

				<span class="divider-vertical mx-4 h-8"></span>

				<!-- Dashboard Layout -->
				<Tooltip.Provider>
					<Tooltip.Root>
						<Tooltip.Trigger>
							<div class="mx-2 flex flex-col items-center">
								<DropdownMenu.Sub>
									<DropdownMenu.SubTrigger>
										<div
											class="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500 text-white transition-all duration-200 hover:bg-blue-600 focus:shadow-[0_0_0_2px_rgba(255,255,255,0.2)] focus:outline-none dark:hover:bg-blue-400"
										>
											<svg viewBox="0 0 24 24" width="16" height="16">
												<path fill="currentColor" d={mdiMonitorDashboard} />
											</svg>
										</div>
									</DropdownMenu.SubTrigger>
									<DropdownMenu.SubContent
										side="bottom"
										align="start"
										class="dropdown-surface dropdown-animation z-50 mt-2 min-w-[180px] p-2"
									>
										<DropdownMenu.Item
											class="menu-item justify-between {dashboardViewType === 'grid'
												? 'active bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-white'
												: ''}"
											onSelect={(e) => setDashboardViewType('grid', e)}
										>
											<div class="flex items-center">
												<svg viewBox="0 0 24 24" width="16" height="16" class="mr-2">
													<path fill="currentColor" d={mdiGrid} />
												</svg>
												Grid
											</div>
											{#if dashboardViewType === 'grid'}
												<svg viewBox="0 0 24 24" width="16" height="16">
													<path
														fill="currentColor"
														d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
													/>
												</svg>
											{/if}
										</DropdownMenu.Item>
										<DropdownMenu.Item
											class="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm text-gray-700 transition-all duration-150 hover:bg-blue-100/50 hover:shadow-sm dark:text-gray-200 dark:hover:bg-blue-600/40 {dashboardViewType ===
											'mozaic'
												? 'bg-blue-50 font-medium text-blue-700 dark:bg-blue-900/30 dark:text-white'
												: ''}"
											onSelect={(e) => setDashboardViewType('mozaic', e)}
										>
											<div class="flex items-center">
												<svg viewBox="0 0 24 24" width="16" height="16" class="mr-2">
													<path fill="currentColor" d={mdiViewDashboard} />
												</svg>
												Mozaic
											</div>
											{#if dashboardViewType === 'mozaic'}
												<svg viewBox="0 0 24 24" width="16" height="16">
													<path
														fill="currentColor"
														d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
													/>
												</svg>
											{/if}
										</DropdownMenu.Item>
										<DropdownMenu.Item
											class="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm text-gray-700 transition-all duration-150 hover:bg-blue-100/50 hover:shadow-sm dark:text-gray-200 dark:hover:bg-blue-600/40 {dashboardViewType ===
											'list'
												? 'bg-blue-50 font-medium text-blue-700 dark:bg-blue-900/30 dark:text-white'
												: ''}"
											onSelect={(e) => setDashboardViewType('list', e)}
										>
											<div class="flex items-center">
												<svg viewBox="0 0 24 24" width="16" height="16" class="mr-2">
													<path fill="currentColor" d={mdiViewList} />
												</svg>
												List
											</div>
											{#if dashboardViewType === 'list'}
												<svg viewBox="0 0 24 24" width="16" height="16">
													<path
														fill="currentColor"
														d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
													/>
												</svg>
											{/if}
										</DropdownMenu.Item>
									</DropdownMenu.SubContent>
								</DropdownMenu.Sub>
								<span class="icon-text-spacing block min-w-[150px] text-center text-xs"
									>{$_('Dashboard Style')}</span
								>
							</div>
						</Tooltip.Trigger>
						<Tooltip.Content>
							<div class="rounded bg-gray-800 px-2 py-1 text-xs text-white">Dashboard Layout</div>
						</Tooltip.Content>
					</Tooltip.Root>
				</Tooltip.Provider>

				<span class="divider-vertical mx-4 h-8"></span>

				<!-- Sort By -->
				<Tooltip.Provider>
					<Tooltip.Root>
						<Tooltip.Trigger>
							<div class="mx-2 flex flex-col items-center">
								<DropdownMenu.Sub>
									<DropdownMenu.SubTrigger>
										<div
											class="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500 text-white transition-all duration-200 hover:bg-purple-600 focus:shadow-[0_0_0_2px_rgba(255,255,255,0.2)] focus:outline-none dark:hover:bg-purple-400"
										>
											<svg viewBox="0 0 24 24" width="16" height="16">
												<path fill="currentColor" d={mdiSort} />
											</svg>
										</div>
									</DropdownMenu.SubTrigger>
									<DropdownMenu.SubContent
										side="bottom"
										align="start"
										class="dropdown-surface dropdown-animation z-50 mt-2 min-w-[180px] p-2"
									>
										<DropdownMenu.Item
											class="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm text-gray-700 transition-all duration-150 hover:bg-purple-100/50 hover:shadow-sm dark:text-gray-200 dark:hover:bg-purple-600/40 {dashboardSortType ===
											'alpha'
												? 'bg-purple-50 font-medium text-purple-700 dark:bg-purple-900/30 dark:text-white'
												: ''}"
											onSelect={(e) => setDashboardSortType('alpha', e)}
										>
											<div class="flex items-center">
												<svg viewBox="0 0 24 24" width="16" height="16" class="mr-2">
													<path fill="currentColor" d={mdiSortAlphabeticalAscending} />
												</svg>
												Alpha
											</div>
											{#if dashboardSortType === 'alpha'}
												<svg viewBox="0 0 24 24" width="16" height="16">
													<path
														fill="currentColor"
														d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
													/>
												</svg>
											{/if}
										</DropdownMenu.Item>
										<DropdownMenu.Item
											class="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm text-gray-700 transition-all duration-150 hover:bg-purple-100/50 hover:shadow-sm dark:text-gray-200 dark:hover:bg-purple-600/40 {dashboardSortType ===
											'date'
												? 'bg-purple-50 font-medium text-purple-700 dark:bg-purple-900/30 dark:text-white'
												: ''}"
											onSelect={(e) => setDashboardSortType('date', e)}
										>
											<div class="flex items-center">
												<svg viewBox="0 0 24 24" width="16" height="16" class="mr-2">
													<path fill="currentColor" d={mdiSortCalendarAscending} />
												</svg>
												Date
											</div>
											{#if dashboardSortType === 'date'}
												<svg viewBox="0 0 24 24" width="16" height="16">
													<path
														fill="currentColor"
														d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
													/>
												</svg>
											{/if}
										</DropdownMenu.Item>
										<DropdownMenu.Item
											class="flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm text-gray-700 transition-all duration-150 hover:bg-purple-100/50 hover:shadow-sm dark:text-gray-200 dark:hover:bg-purple-600/40 {dashboardSortType ===
											'time'
												? 'bg-purple-50 font-medium text-purple-700 dark:bg-purple-900/30 dark:text-white'
												: ''}"
											onSelect={(e) => setDashboardSortType('time', e)}
										>
											<div class="flex items-center">
												<svg viewBox="0 0 24 24" width="16" height="16" class="mr-2">
													<path fill="currentColor" d={mdiSortClockAscending} />
												</svg>
												Time
											</div>
											{#if dashboardSortType === 'time'}
												<svg viewBox="0 0 24 24" width="16" height="16">
													<path
														fill="currentColor"
														d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
													/>
												</svg>
											{/if}
										</DropdownMenu.Item>
									</DropdownMenu.SubContent>
								</DropdownMenu.Sub>
								<span class="icon-text-spacing block min-w-[60px] text-center text-xs"
									>{$_('Sort By')}</span
								>
							</div>
						</Tooltip.Trigger>
						<Tooltip.Content>
							<div class="rounded bg-gray-800 px-2 py-1 text-xs text-white">Sort By</div>
						</Tooltip.Content>
					</Tooltip.Root>
				</Tooltip.Provider>
			</div>
		</DropdownMenu.Content>
	</DropdownMenu.Root>
</div>

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
	.icon-btn {
		transition: all 0.2s ease;
		position: relative;
		overflow: hidden;
	}

	.icon-btn:hover {
		transform: translateY(-1px);
		filter: brightness(1.1);
		box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
		background-color: rgba(255, 255, 255, 0.1);
	}

	.icon-btn:active {
		transform: translateY(0);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
	}

	.icon-btn:focus {
		outline: none;
		box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.2);
	}

	.icon-btn::after {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0) 70%);
		opacity: 0;
		transition: opacity 0.3s ease;
	}

	.icon-btn:hover::after {
		opacity: 1;
	}

	/* Spacing between icon and text */
	.icon-text-spacing {
		margin-top: 0.5rem;
	}

	/* Dropdown animation */
	.dropdown-animation {
		animation: fadeInDown 0.2s ease forwards;
	}

	/* Sub-dropdown animation and styling */
	.sub-dropdown-animation {
		animation: scaleIn 0.15s ease-out forwards;
	}

	.dropdown-content {
		box-shadow: 0 8px 20px rgba(0, 0, 0, 0.6);
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 0.5rem;
	}

	/* Selected state for dropdown items */
	.dropdown-item-selected {
		position: relative;
	}

	.dropdown-item-selected::before {
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

	.dropdown-item-selected::after {
		content: '✓';
		position: absolute;
		right: 10px;
		top: 50%;
		transform: translateY(-50%);
		font-size: 0.8rem;
		opacity: 0.9;
		color: currentColor;
	}
</style>
