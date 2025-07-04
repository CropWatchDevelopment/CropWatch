<script lang="ts">
	import { page } from '$app/stores';
	import { sidebarStore } from '$lib/stores/SidebarStore.svelte';
	import { getDarkMode } from '$lib/components/theme/theme.svelte';
	import MaterialIcon from '$lib/components/UI/icons/MaterialIcon.svelte';
	import { _ } from 'svelte-i18n';
	import { onMount } from 'svelte';

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
			href: '/app/devices',
			icon: 'devices',
			label: 'Devices',
			matcher: '/app/devices'
		},
		{
			href: '/app/reports',
			icon: 'analytics',
			label: 'Reports',
			matcher: '/app/reports'
		},
		{
			href: '/app/settings',
			icon: 'settings',
			label: 'Settings',
			matcher: '/app/settings'
		}
	];

	// Check if current route matches navigation item
	function isActiveRoute(matcher: string): boolean {
		return $page.url.pathname.startsWith(matcher);
	}

	// Get transform value based on screen size and sidebar state
	function getTransformValue(): string {
		// On mobile (handled by CSS), we don't need inline transform
		// On desktop, we handle the transform here
		return sidebarStore.isOpen || sidebarStore.isSmallIconMode ? '0' : '-100%';
	}

	// Initialize responsive behavior
	onMount(() => {
		const cleanup = sidebarStore.initializeResponsive();
		return cleanup;
	});
</script>

<!-- Sidebar Overlay (for mobile) -->
{#if sidebarStore.isOpen}
	<div
		class="bg-opacity-50 fixed inset-0 z-40 bg-black backdrop-blur-sm transition-opacity duration-300 lg:hidden"
		onclick={() => sidebarStore.close()}
		aria-hidden="true"
	></div>
{/if}

<!-- Sidebar -->
<aside
	class="fixed top-0 left-0 z-50 flex flex-col border-r transition-all duration-300 ease-in-out
		{getDarkMode() ? 'border-slate-700/30 bg-slate-800/95' : 'border-gray-200/30 bg-white/95'}
		shadow-lg backdrop-blur-sm"
	style="top: 119px; 
		height: calc(100vh - 119px);
		width: {sidebarStore.isOpen ? '256px' : '64px'};"
	class:mobile-hidden={!sidebarStore.isOpen}
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
				onclick={() => sidebarStore.toggleSmallIconMode()}
				class="rounded-lg p-2 transition-colors {getDarkMode()
					? 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
					: 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}"
				aria-label="Toggle small icon mode"
			>
				<MaterialIcon name="keyboard_double_arrow_left" size="small" />
			</button>
		</div>
	{/if}

	<!-- Navigation Items -->
	<nav class="flex-1 overflow-y-auto p-2">
		<ul class="space-y-1">
			{#each navigationItems as item}
				<li>
					<a
						href={item.href}
						class="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors duration-200
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
						{#if sidebarStore.isOpen}
							<span class="font-medium">{$_(item.label)}</span>
						{/if}
					</a>
				</li>
			{/each}
		</ul>
	</nav>

	<!-- Sidebar Footer -->
	{#if sidebarStore.isOpen}
		<div class="border-t p-4 {getDarkMode() ? 'border-slate-700/30' : 'border-gray-200/30'}">
			<button
				onclick={() => sidebarStore.close()}
				class="flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-colors duration-200
					{getDarkMode()
					? 'text-slate-400 hover:bg-slate-700/50 hover:text-white'
					: 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}"
			>
				<MaterialIcon name="close" size="medium" />
				<span class="font-medium">{$_('Close')}</span>
			</button>
		</div>
	{/if}
</aside>

<!-- Debug button (remove in production) -->
<button
	onclick={() => sidebarStore.toggle()}
	class="fixed right-4 bottom-4 z-50 rounded-full bg-blue-500 p-3 text-white shadow-lg hover:bg-blue-600"
	style="display: {sidebarStore.isOpen || sidebarStore.isSmallIconMode ? 'none' : 'block'}"
>
	☰
</button>

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
</style>
