<script lang="ts">
	import { page } from '$app/stores';
	import { sidebarStore } from '$lib/stores/SidebarStore.svelte';
	import { getDarkMode } from '$lib/components/theme/theme.svelte';
	import MaterialIcon from '$lib/components/UI/icons/MaterialIcon.svelte';
	import { _ } from 'svelte-i18n';
	import { onMount } from 'svelte';
	import LanguageSelector from './UI/form/LanguageSelector.svelte';
	import { startLoading } from '$lib/stores/loadingStore';
	import ThemeToggle from './theme/ThemeToggle.svelte';
	import { goto } from '$app/navigation';

	// Navigation items for the sidebar
	const navigationItems = [
		{
			href: '/app/dashboard',
			icon: 'dashboard',
			label: 'Dashboard',
			matcher: '/app/dashboard'
		},
		{
			href: '/app/dashboard/location',
			icon: 'location_on',
			label: 'Locations',
			matcher: '/app/dashboard/location'
		},
		{
			href: '/app/all-devices',
			icon: 'devices',
			label: 'Devices',
			matcher: '/app/all-devices'
		},
		{
			href: '/app/all-notifications',
			icon: 'notifications',
			label: 'Notifications',
			matcher: '/app/all-notifications'
		},
		{
			href: '/app/all-reports',
			icon: 'analytics',
			label: 'Reports',
			matcher: '/app/all-reports'
		},
		{
			href: '/app/all-gateways',
			icon: 'router',
			label: 'Gateways',
			matcher: '/app/all-gateways'
		}
		// {
		// 	href: '/app/account-settings/general',
		// 	icon: 'settings',
		// 	label: 'Settings',
		// 	matcher: '/app/account-settings/general'
		// }
	];

	// Check if current route matches navigation item
	function isActiveRoute(matcher: string): boolean {
		const pathname = $page.url.pathname;

		// Find the most specific matcher that matches the current pathname
		const matchingItems = navigationItems.filter((item) => {
			if (pathname === item.matcher) {
				return true;
			}
			// Check if pathname starts with matcher and next char is '/' or end
			if (pathname.startsWith(item.matcher)) {
				const nextChar = pathname[item.matcher.length];
				return nextChar === '/' || nextChar === undefined;
			}
			return false;
		});

		// If we have matches, find the most specific one (longest matcher)
		if (matchingItems.length > 0) {
			const mostSpecificMatch = matchingItems.reduce((prev, current) =>
				current.matcher.length > prev.matcher.length ? current : prev
			);
			// Return true only if this matcher is the most specific match
			return matcher === mostSpecificMatch.matcher;
		}

		return false;
	}

	// Local reactive variables that sync with store
	let isOpen = $state(false);
	let isSmallIconMode = $state(false);

	// Initialize responsive behavior
	onMount(() => {
		const cleanup = sidebarStore.initializeResponsive();

		// Sync local state with store state
		isOpen = sidebarStore.isOpen;
		isSmallIconMode = sidebarStore.isSmallIconMode;

		return cleanup;
	});

	// Keep local state in sync with store
	$effect(() => {
		isOpen = sidebarStore.isOpen;
		isSmallIconMode = sidebarStore.isSmallIconMode;
	});

	function handleLogout() {
		//console.log('Logging out user:', userName);

		// Call the API endpoint for server-side logout
		fetch('/api/auth/logout', {
			method: 'POST'
		})
			.then(() => {
				//console.log('Server logout successful');
				// Redirect to login page
				goto('/auth/login');
			})
			.catch((err) => {
				console.error('Server logout error:', err);
				// Redirect anyway
				goto('/auth/login');
			});
	}
</script>

<!-- Sidebar Overlay (for mobile) -->
{#if isOpen}
	<div
		class="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300 lg:hidden"
		onclick={() => sidebarStore.close()}
		aria-hidden="true"
	></div>
{/if}

<!-- Sidebar -->
<aside
	class="fixed top-0 left-0 z-50 flex flex-col border-r transition-all duration-300 ease-in-out
		{getDarkMode() ? 'border-slate-700/30 bg-slate-800/95' : 'border-gray-200/30 bg-slate-200'}
		shadow-lg backdrop-blur-sm"
	style="top: 73px; 
		height: calc(100vh - 73px);
		width: {isOpen ? '256px' : '64px'};"
	class:mobile-hidden={!isOpen}
	aria-label="Sidebar navigation"
>
	<!-- Sidebar Header -->
	{#if sidebarStore.isOpen}
		<div
			class="flex items-center justify-between border-b p-4 {getDarkMode()
				? 'border-slate-700/30'
				: 'border-gray-200/30'}"
		>
			<h2 class="text-lg font-semibold {getDarkMode() ? 'text-white' : 'text-gray-900'}">
				{$_('Navigation')}
			</h2>
			<button
				onclick={() => {
					// Toggle sidebar only (no navigation) – don't trigger global loading overlay
					sidebarStore.toggle();
				}}
				class="rounded-lg p-2 transition-all duration-200 hover:scale-105 {getDarkMode()
					? 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
					: 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}"
				aria-label="Toggle small icon mode"
			>
				<MaterialIcon name="keyboard_double_arrow_left" size="small" />
			</button>
		</div>
	{/if}

	<!-- Navigation Items -->
	<nav class="z-10 flex flex-1 flex-col overflow-y-auto pr-2" style="z-index: 10000;">
		<ul class="space-y-1">
			{#if !sidebarStore.isOpen}
				<li class="mx-3 border-t {getDarkMode() ? 'border-slate-500/30' : 'border-gray-200/30'}">
					<button
						type="button"
						onclick={() => {
							// Opening sidebar (no route change) – don't show global loader
							sidebarStore.toggle();
						}}
						class="flex w-full items-center justify-center rounded-lg p-2 transition-all duration-200 hover:scale-105
							{getDarkMode()
							? 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
							: 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}"
						aria-label="Open sidebar"
					>
						<MaterialIcon name="menu" size="medium" />
					</button>
				</li>
			{/if}
			{#each navigationItems as item, index}
				<li>
					<a
						href={item.href}
						onclick={() => {
							// Only trigger loading if we're navigating to a different route
							if ($page.url.pathname !== item.href) {
								startLoading();
							}
							sidebarStore.close();
						}}
						class="decoration-none flex items-center gap-3 rounded-lg px-3 py-2 no-underline transition-all duration-200 hover:scale-105
							{isActiveRoute(item.matcher)
							? getDarkMode()
								? 'bg-emerald-600/30 text-emerald-400'
								: 'bg-emerald-100 text-emerald-700'
							: getDarkMode()
								? 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
								: 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}"
						aria-current={isActiveRoute(item.matcher) ? 'page' : undefined}
						title={sidebarStore.isSmallIconMode && !sidebarStore.isOpen ? $_(item.label) : ''}
					>
						<MaterialIcon name={item.icon} size="medium" />
						<input type="hidden" value={sidebarStore.isOpen} />

						{#if sidebarStore.isOpen}
							<span class="font-medium">{$_(item.label)}</span>
						{/if}
					</a>
				</li>
				{#if index < navigationItems.length - 1}
					<li
						class="mx-3 border-t {getDarkMode() ? 'border-slate-500/30' : 'border-gray-200/30'}"
					></li>
				{/if}
			{/each}
		</ul>
		<span class="flex flex-auto"></span>
		{#if sidebarStore.isOpen}
			<button
				onclick={handleLogout}
				class="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors duration-200
				{getDarkMode() ? 'bg-emerald-600/30 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}
				{getDarkMode()
					? 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
					: 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}"
			>
				<MaterialIcon name="logout" size="medium" />
				{$_('Logout')}
			</button>
		{/if}
		<ul class="space-y-1">
			<li class="mx-3 border-t {getDarkMode() ? 'border-slate-500/30' : 'border-gray-200/30'}"></li>
			<li>
				<div class="flex flex-row">
					<a
						href="/app/account-settings/general"
						onclick={() => {
							if ($page.url.pathname !== '/app/account-settings/general') {
								startLoading();
							}
							sidebarStore.close();
						}}
						class="decoration-none flex items-center gap-3 rounded-lg px-3 py-2 no-underline transition-all duration-200 hover:scale-105
							{isActiveRoute('/app/account-settings/general')
							? getDarkMode()
								? 'bg-emerald-600/30 text-emerald-400'
								: 'bg-emerald-100 text-emerald-700'
							: getDarkMode()
								? 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
								: 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'}"
						aria-current={isActiveRoute('/app/account-settings/general') ? 'page' : undefined}
						title={sidebarStore.isSmallIconMode && !sidebarStore.isOpen ? $_('settings') : ''}
					>
						<MaterialIcon name="settings" size="medium" />
						<input type="hidden" value={sidebarStore.isOpen} />
					</a>
					<span class="flex flex-1 border-l md:hidden"></span>
					<ThemeToggle class="flex w-full md:hidden" outlineColor="black" />
					<span class="flex flex-1 border-l md:hidden"></span>
					<LanguageSelector class="flex w-full md:hidden" />
				</div>
			</li>
		</ul>
	</nav>
</aside>

<style>
	/* Mobile: sidebar hidden by default, only shows when opened */
	@media (max-width: 1023px) {
		aside {
			transform: translateX(-100%);
		}

		/* Only show sidebar on mobile when isOpen is true */
		aside:not(.mobile-hidden) {
			transform: translateX(0);
		}

		.mobile-hidden {
			transform: translateX(-100%) !important;
		}
	}

	/* Force remove underlines from navigation links */
	aside nav a {
		text-decoration: none !important;
	}

	aside nav a:hover {
		text-decoration: none !important;
	}
</style>
