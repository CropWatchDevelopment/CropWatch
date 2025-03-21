<script lang="ts">
	import { browser, dev } from '$app/environment';
	import DashboardCard from '$lib/components/UI/dashboard/DashboardCard.svelte';
	import DashboardFilter from '$lib/components/UI/dashboard/DashboardFilter.svelte';
	import DataRowItem from '$lib/components/UI/dashboard/DataRowItem.svelte';
	import NotLoggedIn from '$lib/components/UI/NotLoggedIn.svelte';
	import type { ILocation } from '$lib/interfaces/ILocation.interface';
	import { m } from '$lib/paraglide/messages';
	import { getUserState } from '$lib/state/user-state.svelte';
	import {
		mdiCheck,
		mdiCheckCircle,
		mdiCloseCircle,
		mdiHelp,
		mdiMapMarker,
		mdiTimerSand,
		mdiViewDashboard
	} from '@mdi/js';
	import { droppable, type DragDropState } from '@thisux/sveltednd';
	import { Avatar, Card, Header, Icon, Tooltip } from 'svelte-ux';
	import { flip } from 'svelte/animate';

	// State initialization
	let { data } = $props();
	let userContext = getUserState();
	let { user } = $derived(userContext);
	let innerWidth: number = $state(1);
	let useDnD = $derived(innerWidth > 900);
	let search: string = $state(browser ? (localStorage.getItem('dashboard_search') ?? '') : '');
	let hideEmptyLocations: boolean = $state(
		browser ? localStorage.getItem('hide_empty_locations') === 'true' : false
	);
	let dashboardViewType: 'grid' | 'mozaic' | 'list' = $state(
		// browser ? (localStorage.getItem('dashboard_view_type') === 'grid' ? 'grid' : 'mozaic') : 'grid'
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

	$effect(() => {
		if (browser) {
			window.mediaq
		}
	})

	// Handle drag-and-drop reordering
	function handleDrop(state: DragDropState<ILocation>) {
		if (!useDnD) return;
		const { draggedItem, sourceContainer, targetContainer } = state;
		if (!targetContainer || sourceContainer === targetContainer) return;

		// Reorder locations
		userContext.allLocations = userContext.allLocations.filter(
			(location: ILocation) => location.location_id !== draggedItem.location_id
		);
		userContext.allLocations.splice(parseInt(targetContainer), 0, draggedItem);

		// Persist changes
		userContext.percistLocationSortInLocalStorage();
	}
</script>

<svelte:window bind:innerWidth />
{#if user}
	<section class="p-4">
		<h2 class="mb-4 flex w-full flex-row items-center">
			<Icon data={mdiViewDashboard} class="mr-2 h-6 w-6 items-center" />
			{m.app_dashboard_title()}
			<!-- <Tooltip title={`Realtime Status ${userContext.realtime?.state}`} class="flex items-center">
				{#if userContext.realtime?.state == 'joined'}
					<Icon data={mdiCheckCircle} class="ml-2 h-6 w-6 text-green-500" />
				{:else if userContext.realtime?.state == 'joining'}
					<Icon data={mdiTimerSand} class="ml-2 h-6 w-6 text-yellow-500" />
				{:else if userContext.realtime?.state == 'errored'}
					<Icon data={mdiCloseCircle} class="ml-2 h-6 w-6 text-red-500" />
				{:else}
				<Icon data={mdiHelp} class="ml-2 h-6 w-6 text-red-500" />
				{/if}
			</Tooltip> -->
			<div class="ml-auto">
				<DashboardFilter
					bind:search
					bind:hideNoDeviceLocations={hideEmptyLocations}
					bind:dashboardViewType
					bind:dashboardSortType
				/>
			</div>
		</h2>

		{#if dashboardViewType === 'grid'}
			<!-- Grid view -->
			<div class="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
				{#each userContext.allLocations
					.filter((location: ILocation) => {
						if (hideEmptyLocations) return location.cw_devices.length > 0;
						return location;
					})
					.filter((location: ILocation) => {
						if (!search?.trim()) return true;
						return location.name.toLowerCase().includes(search.toLowerCase());
					}) as location, index (location.location_id)}
					<div
					use:droppable={{ container: index.toString(), callbacks: { onDrop: handleDrop } }}
						class="aspect-square relative rounded-xl bg-primary-content/50 p-1 text-black backdrop-blur-sm
	                           transition-all duration-300 hover:bg-primary-content/60"
						animate:flip={{ duration: 300 }}
					>
						<DashboardCard {location} />
					</div>
				{/each}
			</div>
		{:else if dashboardViewType === 'mozaic'}
			<!-- Mozaic view -->
			<div class="columns-[20rem] gap-4">
				{#each userContext.allLocations.filter((location: ILocation) => {
					if (!search?.trim()) return true;
					return location.name.toLowerCase().includes(search.toLowerCase());
				}) as location, index (location.location_id)}
					<div
						use:droppable={{ container: index.toString(), callbacks: { onDrop: handleDrop } }}
						class="mb-4 break-inside-avoid
					       rounded-xl bg-primary-content/50 p-1 text-black
					       transition-all duration-300 hover:bg-primary-content/60"
					>
						<DashboardCard {location} />
					</div>
				{/each}
			</div>
		{:else if dashboardViewType === 'list'}
			<!-- List view -->
			<div class="flex flex-col gap-4">
				{#each userContext.allLocations.filter((location: ILocation) => {
					if (!search?.trim()) return true;
					return location.name.toLowerCase().includes(search.toLowerCase());
				}) as location, index (location.location_id)}
					<Card class="w-full">
						<Header subheading="Subheading" slot="header">
							<h1 class="text-left text-2xl font-bold" slot="title">
								<a href="/app/location/{location.location_id}">{location.name}</a>
							</h1>
							<div slot="avatar">
								<Avatar class="bg-primary font-bold text-primary-content">
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
				{/each}
			</div>
		{/if}
	</section>
{:else}
	<NotLoggedIn />
{/if}
