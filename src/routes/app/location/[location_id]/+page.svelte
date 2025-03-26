<script lang="ts">
	import { browser } from '$app/environment';
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import DeleteLocationDialog from '$lib/components/dialogs/DeleteLocationDialog.svelte';
	import Back from '$lib/components/UI/Back.svelte';
	import DeviceGridView from '$lib/components/UI/device/DeviceGridView.svelte';
	import DeviceListView from '$lib/components/UI/device/DeviceListView.svelte';
	import LocationSettings from '$lib/components/UI/location/LocationSettings.svelte';
	import { getUserState } from '$lib/state/user-state.svelte.js';
	import { mdiCog, mdiTrashCan, mdiViewGallery, mdiViewGrid, mdiViewList } from '@mdi/js';
	import { Button, Card, ProgressCircle, Tooltip } from 'svelte-ux';

	let { data } = $props();
	let location_owner = $derived(data.location?.owner_id ?? {});

	let viewType: string | 'list' | 'grid' | 'map' | 'settings' = $state('list');

	let defaultView = browser
		? (localStorage.getItem(`location_view_${$page.params.location_id}`) ?? 'list')
		: 'list';
	viewType = defaultView;
	let userContext = getUserState();
	userContext.fetchLocations();
	let location = $derived(
		userContext.allLocations.find((loc) => loc.location_id === +$page.params.location_id)
	);
	let devices = $derived(location?.cw_devices ?? []);
</script>

{#if location && devices}
	<section class="h-full p-4">
		<h2 class="mb-2 flex gap-4 border-b pb-4">
			<Back url="/app" />
			{location.name ?? 'loading...'}
			<span class="flex-1"></span>

			<Tooltip title="Device List view">
				<Button
					icon={mdiViewList}
					variant="fill-light"
					rounded="full"
					color={viewType == 'list' ? 'primary' : 'secondary'}
					on:click={() => {
						viewType = 'list';
						localStorage.setItem(`location_view_${$page.params.location_id}`, 'list');
					}}
				/>
			</Tooltip>
			<Tooltip title="Device Grid view">
				<Button
					icon={mdiViewGrid}
					variant="fill-light"
					rounded="full"
					color={viewType == 'grid' ? 'primary' : 'secondary'}
					on:click={() => {
						viewType = 'grid';
						localStorage.setItem(`location_view_${$page.params.location_id}`, 'grid');
					}}
				/>
			</Tooltip>
			<Tooltip title="Map/Device view">
				<Button
					icon={mdiViewGallery}
					variant="fill-light"
					rounded="full"
					color={viewType == 'map' ? 'primary' : 'secondary'}
					on:click={() => {
						viewType = 'map';
						localStorage.setItem(`location_view_${$page.params.location_id}`, 'map');
					}}
				/>
			</Tooltip>
			<Tooltip title="Settings">
				<Button
					icon={mdiCog}
					variant="fill-light"
					rounded="full"
					on:click={() => (viewType = 'settings')}
				/>
			</Tooltip>
		</h2>

		{#if viewType === 'list'}
			<DeviceListView {devices} />
		{:else if viewType === 'grid'}
			<DeviceGridView {devices} />
		{:else if viewType === 'map'}
			<!-- <DeviceMapView lat={location.lat} long={location.long ?? 0} {devices} /> -->
		{:else if viewType === 'settings'}
			<LocationSettings
				{data}
				{devices}
				location={data.location}
				locationUsers={data.locationUsers}
				locationGeneralForm={data.updateLocationGeneralForm}
			/>

			<Card class="mt-4">
				<h3 class="text-lg font-semibold">Danger Zone</h3>
				<p class="text-sm text-gray-500">
					Deleting a location will also delete all devices and data associated with it.
				</p>
				{#if location_owner === userContext.profile?.id}
					<DeleteLocationDialog />
				{:else}
					<p class="text-sm text-gray-500">Only the owner of this location can delete it.</p>
				{/if}
			</Card>
		{:else}
			<DeviceListView {devices} />
		{/if}
	</section>
{:else}
	<ProgressCircle />
{/if}
