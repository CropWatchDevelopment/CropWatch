<script lang="ts">
	import { page } from '$app/state';
	import { _ } from 'svelte-i18n';

	type BreadcrumbProps = {
		path: string;
		label: string;
		showArrow?: boolean;
	};

	type Route = {
		path: string;
		label: string;
	};

	/**
	 * Generate the breadcrumb routes based on the current page state. The routes are defined in a
	 * function to ensure they are reactive to changes in `page`.
	 */
	const getRoutes = (): Route[] => [
		{
			path: '/app/dashboard',
			label: $_('Dashboard')
		},
		// {
		// 	path: '/app/dashboard/location',
		// 	label: 'All Locations'
		// },
		{
			path: `/app/dashboard/location/[location_id]`,
			label: page.data.location?.name ?? $_('Location Details')
		},
		// {
		// 	path: `/app/dashboard/location/[location_id]/devices`,
		// 	label: 'All Devices'
		// },
		{
			path: `/app/dashboard/location/[location_id]/devices/[devEui]`,
			label: page.data.device?.name ?? $_('Device Details')
		},
		{
			path: `/app/dashboard/location/[location_id]/devices/[devEui]/settings`,
			label: $_('Settings')
		}
	];
</script>

{#snippet breadcrumb({ path, label, showArrow = true }: BreadcrumbProps)}
	{#if showArrow}
		<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
		</svg>
	{/if}
	<a
		href={path?.replaceAll(/\[(?<param>\w+?)\]/g, (_, param) => page.params[param])}
		class="transition-colors hover:text-green-400">{label}</a
	>
{/snippet}

<nav class="ml-16 flex flex-wrap items-center gap-1">
	{#key page}
		{#each getRoutes() as { path, label }, index}
			{#if page.route.id?.startsWith(path)}
				{@render breadcrumb({ path, label, showArrow: index > 0 })}
			{/if}
		{/each}
	{/key}
</nav>
