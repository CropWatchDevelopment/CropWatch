<script lang="ts">
	import { browser, dev } from '$app/environment';
	import DashboardFilter from '$lib/components/UI/dashboard/DashboardFilter.svelte';
	import DataRowItem from '$lib/components/UI/dashboard/DataRowItem.svelte';
	import NotLoggedIn from '$lib/components/UI/NotLoggedIn.svelte';
	import type { ILocation } from '$lib/interfaces/ILocation.interface';
	import { m } from '$lib/paraglide/messages';
	import { getUserState } from '$lib/state/user-state.svelte';
	import { mdiCircle, mdiMapMarker, mdiViewDashboard } from '@mdi/js';
	import { Avatar, Card, Header, Icon, Tooltip } from 'svelte-ux';
	import { REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';
	import { DashboardCard } from '@cropwatchdevelopment/cwui';
	import { onDestroy } from 'svelte';
	import { createActiveTimer } from '$lib/utilities/ActiveTimer.js';

	// State initialization
	let { data } = $props();
	let userContext = getUserState();
	let { user } = $derived(userContext);
	let innerWidth: number = $state(1);
	let search: string = $state(browser ? (localStorage.getItem('dashboard_search') ?? '') : '');
	let hideEmptyLocations: boolean = $state(
		browser ? localStorage.getItem('hide_empty_locations') === 'true' : false
	);
	let dashboardViewType: 'grid' | 'mozaic' | 'list' = $state(
		browser
			? localStorage.getItem('dashboard_view_type') === 'mozaic'
				? 'mozaic'
				: localStorage.getItem('dashboard_view_type') === 'list'
					? 'list'
					: 'grid'
			: 'grid'
	);
	let dashboardSortType: 'alpha' | 'custom' = $state(
		browser
			? localStorage.getItem('dashboard_sort_type') === 'alpha'
				? 'alpha'
				: 'custom'
			: 'alpha'
	);

	// Persist `dashboardViewType` changes
	$effect(() => {
		if (browser) {
			localStorage.setItem('dashboard_view_type', dashboardViewType);
			userContext.fetchLocations();
		}
	});

	// Sorting locations
	$effect(() => {
		const sorted = userContext.getSortedLocationsFromLocalStorage();
		if (sorted)
			userContext.allLocations.sort(
				(a, b) => sorted.indexOf(a.location_id) - sorted.indexOf(b.location_id)
			);
	});

	// Function to get container class based on view type
	function getContainerClass(viewType: string): string {
		switch (viewType) {
			case 'grid':
				return 'grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5';
			case 'mozaic':
				return 'columns-[20rem] gap-4 space-y-4';
			case 'list':
				return 'flex flex-col gap-4';
			default:
				return 'grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5';
		}
	}

	// Function to get item class based on view type
	function getItemClass(viewType: string): string {
		if (viewType === 'list') {
			return 'w-full';
		} else if (viewType === 'mozaic') {
			return 'bg-primary-content/60 relative mb-4 flex break-inside-avoid-column flex-col rounded-xl border-2 p-1 shadow-md backdrop-blur-sm transition-all duration-300';
		} else {
			return 'bg-primary-content/60 relative flex h-full flex-col rounded-xl border-2 p-1 shadow-md backdrop-blur-sm transition-all duration-300';
		}
	}

	//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

	// Simple reactive object to track device active status
	const deviceActiveStatus = $state({});

	// Store unsubscribe functions for cleanup
	const unsubscribers = [];

	// Initialize active timers for each device
	$effect(() => {
		// Clear previous timers
		unsubscribers.forEach((unsub) => unsub());
		unsubscribers.length = 0;

		// Process each location and device
		userContext.allLocations.forEach((location) => {
			location.cw_devices.forEach((device) => {
				const deviceKey: string = device.dev_eui;

				// Create an active timer for this device with explicit Date conversion
				const activeTimer = createActiveTimer(
					new Date(device.latest_data?.created_at),
					Number(device.upload_interval || device.cw_device_type?.default_upload_interval || 10)
				);

				// Subscribe to the timer and directly update our state object
				const unsubscribe = activeTimer.subscribe((isActive) => {
					console.log(`Device ${device.name} status updated: ${isActive}`);
					deviceActiveStatus[deviceKey] = isActive;
				});

				// Store the unsubscribe function for cleanup
				unsubscribers.push(unsubscribe);
			});
		});
	});

	// Cleanup on destroy
	onDestroy(() => {
		unsubscribers.forEach((unsub) => unsub());
		unsubscribers.length = 0;
	});

	// Get active status for a specific device
	function getDeviceActiveStatus(deviceKey: string) {
		return deviceActiveStatus[deviceKey] ?? null;
	}

	// Helper function to get active status indicators for a location
	function getLocationActiveStatus(location) {
		if (!location?.cw_devices?.length)
			return { activeDevices: [], allActive: false, allInactive: false };

		const activeValues = location.cw_devices.map((device) => getDeviceActiveStatus(device.dev_eui));
		const activeDevices = activeValues.filter((status: boolean | null) => status !== null);
		const allActive =
			activeDevices.length > 0 && activeDevices.every((status: boolean | null) => status === true);
		const allInactive =
			activeDevices.length > 0 && activeDevices.every((status: boolean | null) => status === false);

		return { activeDevices, allActive, allInactive };
	}
</script>

<svelte:window bind:innerWidth />
{#if user}
	<section class="p-4">
		<h2 class="mb-4 flex w-full flex-row items-center">
			<Icon data={mdiViewDashboard} class="mr-2 h-6 w-6 items-center" />
			{m.app_dashboard_title()}
			<Tooltip title="Real-Time Data Status" placement="right">
				{#if userContext.realtimeJoinedStatus == REALTIME_SUBSCRIBE_STATES.SUBSCRIBED}
					<Icon data={mdiCircle} class="text-green-500" size="1em" />
				{:else if userContext.realtimeJoinedStatus == REALTIME_SUBSCRIBE_STATES.TIMED_OUT}
					<Icon data={mdiCircle} class="text-yellow-500" size="1em" />
				{:else if userContext.realtimeJoinedStatus == REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR || userContext.realtimeJoinedStatus == REALTIME_SUBSCRIBE_STATES.CLOSED}
					<Icon data={mdiCircle} class="text-red-500" size="1em" />
				{/if}
			</Tooltip>

			<div class="ml-auto">
				<DashboardFilter
					bind:search
					bind:hideNoDeviceLocations={hideEmptyLocations}
					bind:dashboardViewType
					bind:dashboardSortType
				/>
			</div>
		</h2>

		<div class={getContainerClass(dashboardViewType)}>
		{#each userContext.allLocations
			.filter((location: ILocation) => {
				if (hideEmptyLocations) return location.cw_devices.length > 0;
				return location;
			})
			.filter((location: ILocation) => {
				if (!search?.trim()) return true;
				return location.name.toLowerCase().includes(search.toLowerCase());
			}) as location, index (location.location_id)}
			{@const { activeDevices, allActive, allInactive } = getLocationActiveStatus(location)}
			<DashboardCard {location} href="#" {activeDevices} {allActive} {allInactive}>
				{#snippet content()}
					{#each location.cw_devices as device}
						{@const deviceKey = device.dev_eui}
						{@const isActive = getDeviceActiveStatus(deviceKey)}

						<DataRowItem
							{device}
							{isActive}
							dataPointPrimary={device.latest_data?.temperatureC}
							primaryNotation={device.cw_device_type.primary_data_notation}
							dataPointSecondary={device.latest_data?.humidity}
							secondaryNotation={device.cw_device_type.secondary_data_notation}
							detailHref={`/device/${device.dev_eui}`}
						>
							{#snippet children()}
								<DeviceDataList {device} {isActive} />
							{/snippet}
						</DataRowItem>
					{/each}
				{/snippet}
			</DashboardCard>
		{/each}
	</div>
		<!--
			{#each userContext.allLocations
				.filter((location: ILocation) => {
					if (hideEmptyLocations) return location.cw_devices.length > 0;
					return location;
				})
				.filter((location: ILocation) => {
					if (!search?.trim()) return true;
					return location.name.toLowerCase().includes(search.toLowerCase());
				}) as location, index (location.location_id)}
				
				{#if dashboardViewType === 'list'}
					<Card class="w-full">
						<Header subheading="Subheading" slot="header">
							<h1 class="text-left text-2xl font-bold" slot="title">
								<a href="/app/location/{location.location_id}">{location.name}</a>
							</h1>
							<div slot="avatar">
								<Avatar class="bg-primary text-primary-content font-bold">
									<Icon data={mdiMapMarker} class="text-xl" />
								</Avatar>
							</div>
						</Header>
						<ol class="w-full">
							{#each location.cw_devices as device}
								<DataRowItem {device} {location}></DataRowItem>
							{/each}
						</ol>
					</Card>
				{:else}
					<div class={getItemClass(dashboardViewType)}>
						<DashboardCard {location} />
					</div>
				{/if}
			{/each}
		-->
	</section>
{:else}
	<NotLoggedIn />
{/if}
