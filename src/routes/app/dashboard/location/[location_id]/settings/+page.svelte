<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { formValidation } from '$lib/actions/formValidation';
	import Button from '$lib/components/UI/buttons/Button.svelte';
	import Select from '$lib/components/UI/form/Select.svelte';
	import TextInput from '$lib/components/UI/form/TextInput.svelte';
	import UserPermissionsSelector from '$lib/components/UI/form/UserPermissionsSelector.svelte';
	import Dialog from '$lib/components/UI/overlay/Dialog.svelte';
	import type { LocationUser } from '$lib/models/LocationUser';
	import { error as errorToast, success as successToast } from '$lib/stores/toast.svelte';
	import type { ActionResult } from '@sveltejs/kit';
	import Header from '../Header.svelte';
	import { _ } from 'svelte-i18n';

	type NewUserFormDataProps = {
		email: string;
		permission: string; // Cannot be number
		allDevices: boolean;
	};

	type LocationFormDataProps = {
		name: string;
		description: string;
		lat: number | undefined;
		long: number | undefined;
	};

	const locationFormDataPlaceholder: LocationFormDataProps = {
		name: '',
		description: '',
		lat: undefined,
		long: undefined
	};

	const newUserFormDataPlaceholder: NewUserFormDataProps = {
		email: '',
		permission: '3', // Default to Viewer
		allDevices: false
	};

	const permissionMap: Record<string, string> = {
		1: 'Admin',
		2: 'User',
		3: 'Viewer',
		4: 'Disabled'
	};

	let { data } = $props();
	let { location, locationUsers, deviceCount } = $derived(data);

	let locationFormData: LocationFormDataProps = $state({ ...locationFormDataPlaceholder });
	let ownerList: LocationUser[] = $state([]);
	let newUserFormData: NewUserFormDataProps = $state({ ...newUserFormDataPlaceholder });

	let updatingLocation: boolean = $state(false);
	let editingLocation: boolean = $state(false);
	let addingUser = $state(false);
	let showingRemoveConfirmation = $state(false);

	const startEditLocation = () => {
		editingLocation = true;
		locationFormData = { ...locationFormDataPlaceholder };
		locationFormData.name ||= '';
	};

	const cancelEditLocation = () => {
		editingLocation = false;
		locationFormData = { ...locationFormDataPlaceholder };
	};

	const handleLocationUpdateSuccess = async (result: ActionResult) => {
		if (result.type === 'success') {
			if (result.data?.success) {
				// Refresh the page data to show updated location details
				await invalidateAll();
				editingLocation = false;
				successToast('Location details updated successfully');
			} else {
				errorToast(result.data?.error || 'Failed to update location details');
			}
		} else {
			errorToast('An error occurred');
		}

		updatingLocation = false;
	};

	const handleAddUserSuccess = async (result: ActionResult) => {
		if (result.type === 'success') {
			if (result.data?.success) {
				// Refresh the page data to show updated user list
				await invalidateAll();
				newUserFormData = { ...newUserFormDataPlaceholder };
				successToast('User added successfully');
			} else {
				errorToast(result.data?.error || 'Failed to add user');
			}
		} else {
			errorToast('An error occurred');
		}

		addingUser = false;
	};

	const removeLocation = async () => {
		try {
			const response = await fetch('', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ locationId: location.location_id })
			});

			if (response.ok) {
				const result = await response.json();
				if (result.success) {
					successToast('Location removed successfully');
					await goto('/app/dashboard/location', { replaceState: true });
				} else {
					errorToast(result.error || 'Failed to remove location');
				}
			} else {
				errorToast('An error occurred while removing the location');
			}
		} catch {
			errorToast('An error occurred while removing the location');
		}
	};

	$effect(() => {
		// Update the form data when the data is loaded
		if (location && locationUsers) {
			locationFormData.name = location.name ?? '';
			locationFormData.description = location.description ?? '';
			locationFormData.lat = location.lat ?? undefined;
			locationFormData.long = location.long ?? undefined;
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
			<section class="bg-foreground-light dark:bg-foreground-dark rounded-lg p-6 shadow-lg">
				<div class="mb-4 flex items-center justify-between">
					<h2 class="text-xl font-bold">{$_('Location Details')}</h2>
					{#if !editingLocation}
						<Button variant="secondary" onclick={startEditLocation}>{$_('Edit Details')}</Button>
					{/if}
				</div>

				{#if editingLocation}
					<form
						method="POST"
						action="?/updateLocation"
						class="grid !w-full grid-cols-1 gap-4"
						use:enhance={() => {
							updatingLocation = true;

							return ({ result }) => {
								handleLocationUpdateSuccess(result);
							};
						}}
						use:formValidation
					>
						<div>
							<label for="locationName" class="mb-1 block font-medium">{$_('Location Name')}</label>
							<TextInput
								id="locationName"
								name="name"
								required
								placeholder={$_('Location Name')}
								class="w-full"
								bind:value={locationFormData.name}
							/>
						</div>

						<div>
							<label for="locationName" class="mb-1 block font-medium">{$_('Description')}</label>
							<TextInput
								id="locationName"
								name="description"
								required
								placeholder={$_('Description')}
								class="w-full"
								bind:value={locationFormData.description}
							/>
						</div>

						<div>
							<label for="locationLatitude" class="mb-1 block font-medium">Latitude</label>
							<TextInput
								type="number"
								id="locationLatitude"
								name="lat"
								step="any"
								placeholder="Latitude (e.g. 51.5074)"
								class="w-full"
								bind:value={locationFormData.lat}
							/>
							<p class="mt-1 text-sm text-gray-500">Decimal format (e.g. 51.5074)</p>
						</div>

						<div>
							<label for="locationLongitude" class="mb-1 block font-medium">Longitude</label>
							<TextInput
								type="number"
								id="locationLongitude"
								name="long"
								step="any"
								placeholder="Longitude (e.g. -0.1278)"
								class="w-full"
								bind:value={locationFormData.long}
							/>
							<p class="mt-1 text-sm text-gray-500">Decimal format (e.g. -0.1278)</p>
						</div>

						<div class="flex gap-2">
							<Button
								type="submit"
								variant="primary"
								disabled={updatingLocation || !locationFormData.name}
							>
								{updatingLocation ? $_('Updating...') : $_('Update Location')}
							</Button>
							<Button variant="secondary" onclick={() => cancelEditLocation()}
								>{$_('Cancel')}</Button
							>
						</div>
					</form>
				{:else}
					<div class="grid grid-cols-1 gap-4">
						<div>
							<h3 class="text-sm font-medium text-gray-500">{$_('Name')}</h3>
							<p>{location.name || $_('No name set')}</p>
						</div>
						<div>
							<h3 class="text-sm font-medium text-gray-500">{$_('Description')}</h3>
							<p>{location.description}</p>
						</div>
						<div>
							<h3 class="text-sm font-medium text-gray-500">{$_('Coordinates')}</h3>
							<p>
								{#if location.lat && location.long}
									{location.lat.toFixed(6)}, {location.long.toFixed(6)}
								{:else}
									{$_('Not set')}
								{/if}
							</p>
						</div>
					</div>
				{/if}
			</section>
		</div>

		<!-- Right pane -->
		<div class="flex flex-1 flex-col gap-4">
			<section class="bg-foreground-light dark:bg-foreground-dark rounded-lg p-6 shadow-lg">
				<h2 class="mb-4 text-xl font-bold">{$_('User Permissions')}</h2>
				<p class="mb-4">
					{$_('manage_permissions_description')}
				</p>

				<UserPermissionsSelector {data} {ownerList} canDelete={true} />

				<div class="mt-6">
					<h3 class="mb-2 text-lg font-medium">{$_('Add New User')}</h3>

					<form
						method="POST"
						action="?/addUser"
						class="form-container !grid w-full grid-cols-1 gap-4 xl:grid-cols-2"
						use:enhance={() => {
							addingUser = true;

							return ({ result }) => {
								handleAddUserSuccess(result);
							};
						}}
						use:formValidation
					>
						<div>
							<label for="email" class="mb-1 block font-medium">{$_('Email Address')}</label>
							<TextInput
								type="email"
								id="email"
								name="email"
								required
								placeholder="user@example.com"
								class="w-full"
								bind:value={newUserFormData.email}
							/>
						</div>

						<div>
							<label for="permissionLevel" class="mb-1 block font-medium"
								>{$_('Permission Level')}</label
							>
							<Select
								id="permissionLevel"
								name="permissionLevel"
								required
								class="w-full rounded border px-3 py-2"
								bind:value={newUserFormData.permission}
							>
								{#each Object.entries(permissionMap) as [level, label]}
									<option value={level}>{label}</option>
								{/each}
							</Select>
							<p class="mt-1 text-sm text-gray-500">
								<strong>{$_('Admin:')}</strong>
								{$_('Full control over location and devices')}<br />
								<strong>{$_('User:')}</strong>
								{$_('Can use and configure devices')}<br />
								<strong>{$_('Viewer:')}</strong>
								{$_('Can only view data')}<br />
								<strong>{$_('Disabled:')}</strong>
								{$_('No access')}
							</p>
						</div>

						<div>
							<label class="flex items-center gap-2">
								<input
									type="checkbox"
									name="applyToDevices"
									value="true"
									bind:checked={newUserFormData.allDevices}
								/>
								<span>
									{$_('Apply same permission to all devices in this location')} (x{deviceCount} devices)
								</span>
							</label>
							<p class="mt-1 text-sm text-gray-500">
								{$_('If unchecked, user will be added with "Disabled" permission to all devices.')}
							</p>
						</div>

						<div>
							<Button
								variant="primary"
								type="submit"
								disabled={addingUser || !newUserFormData.email}
							>
								{addingUser ? $_('Adding...') : $_('Add User')}
							</Button>
						</div>
					</form>
				</div>
			</section>

			<section class="border-danger/50 flex flex-col gap-2 rounded-lg border p-4">
				<h2 class="text-danger text-lg font-semibold">{$_('Dangerous Zone')}</h2>
				<form
					method="POST"
					action="?/deleteLocation"
					use:enhance={() => {
						return ({ result }: { result: ActionResult }) => {
							if (result.type === 'success' && result.data?.success) {
								successToast($_('Location removed successfully'));
								window.location.href = '/app/dashboard/location/';
							} else {
								// @ts-ignore
								errorToast(result.data?.error || $_('Failed to remove location'));
							}
						};
					}}
					use:formValidation
				>
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
		<Button
			variant="danger"
			onclick={() => {
				showingRemoveConfirmation = false;
				removeLocation();
			}}
		>
			{$_('Remove')}
		</Button>
	{/snippet}
</Dialog>
