<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { formValidation } from '$lib/actions/formValidation';
	import AddLocationUserForm from '$lib/components/dashboard/AddLocationUserForm.svelte';
	import LocationDetailsCard from '$lib/components/dashboard/LocationDetailsCard.svelte';
	import Button from '$lib/components/UI/buttons/Button.svelte';
	import UserPermissionsSelector from '$lib/components/UI/form/UserPermissionsSelector.svelte';
	import Dialog from '$lib/components/UI/overlay/Dialog.svelte';
	import type { LocationUser } from '$lib/models/LocationUser';
	import { error as errorToast, success as successToast } from '$lib/stores/toast.svelte';
	import Header from '../Header.svelte';
	import { _ } from 'svelte-i18n';

	let { data } = $props();
	let { location, locationUsers, deviceCount } = $derived(data);

	let ownerList: LocationUser[] = $state([]);
	let showingRemoveConfirmation = $state(false);

	$effect(() => {
		// Update the form data when the data is loaded
		if (location && locationUsers) {
			ownerList = locationUsers;
		}
	});
</script>

<svelte:head>
	<title>Location Settings - {location.name || 'No name set'}</title>
</svelte:head>

<Header {location} basePath={`/app/dashboard/location/${page.params.location_id}`} />

<div class="w-full p-4">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-2xl font-bold">{$_('Location Settings')}</h1>
	</div>

	<div class="flex flex-col gap-4 lg:flex-row">
		<!-- Left pane -->
		<div class="flex flex-none flex-col gap-4 lg:w-[30%] lg:min-w-[360px]">
			<!-- Location Details Section -->
			<LocationDetailsCard {location} />
		</div>

		<!-- Right pane -->
		<div class="flex flex-1 flex-col gap-4">
			<section class="bg-card rounded-lg p-6 shadow-lg">
				<h2 class="mb-4 text-xl font-bold">{$_('User Permissions')}</h2>
				<p class="mb-4">
					{$_('manage_permissions_description')}
				</p>

				<UserPermissionsSelector {data} {ownerList} canDelete={true} />

				<AddLocationUserForm {deviceCount} />
			</section>

			<section class="border-error/50 flex flex-col gap-2 rounded-lg border p-4">
				<h2 class="text-error text-lg font-semibold">{$_('Dangerous Zone')}</h2>
				<form use:formValidation>
					<Button
						variant="danger"
						onclick={(event) => {
							event.stopPropagation();
							showingRemoveConfirmation = true;
						}}
					>
						{$_('Remove Location')}
					</Button>
				</form>
			</section>
		</div>
	</div>
</div>

<Dialog bind:open={showingRemoveConfirmation}>
	{#snippet title()}
		{$_('Remove Location')}
	{/snippet}
	{#snippet body()}
		{$_('Are you sure you want to remove this location? This action cannot be undone.')}
	{/snippet}
	{#snippet footer()}
		<Button
			variant="secondary"
			onclick={() => {
				showingRemoveConfirmation = false;
			}}
		>
			{$_('Cancel')}
		</Button>
		<form
			method="POST"
			action="?/deleteLocation"
			use:enhance={() => {
				return async ({ result }) => {
					showingRemoveConfirmation = false;
					if (result.type === 'redirect') {
						successToast('Location removed successfully');
						await goto(result.location, { replaceState: true });
					} else if (result.type === 'failure') {
						errorToast((result.data?.error as string) || 'Failed to remove location');
					} else if (result.type === 'error') {
						errorToast('An error occurred');
					}
				};
			}}
		>
			<Button variant="danger" type="submit">
				{$_('Remove')}
			</Button>
		</form>
	{/snippet}
</Dialog>
