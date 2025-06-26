<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { formValidation } from '$lib/actions/formValidation';
	import UserPermissionsSelector from '$lib/components/UI/form/UserPermissionsSelector.svelte';
	import { error as errorToast, success } from '$lib/stores/toast.svelte';
	import Header from '../Header.svelte';

	let { data } = $props();

	const { location, locationUsers, deviceCount, currentUser } = data;

	// Location details editing
	let editingLocationDetails = $state(false);
	let locationName = $state(location?.name ?? 'no name set');
	let locationLatitude = $state(location.lat || null);
	let locationLongitude = $state(location.long || null);
	let isUpdatingLocation = $state(false);
	let ownersList = $state(data.locationUsers || []);

	const startEditLocation = () => {
		editingLocationDetails = true;
		locationName = location.name;
		locationLatitude = location.lat || null;
		locationLongitude = location.long || null;
	};

	const cancelEditLocation = () => {
		editingLocationDetails = false;
	};

	const handleLocationUpdateSuccess = (result) => {
		isUpdatingLocation = false;

		if (result.type === 'success') {
			if (result.data.success) {
				success('Location details updated successfully');
				editingLocationDetails = false;

				// Refresh the page to show updated location details
				window.location.reload();
			} else {
				errorToast(result.data.error || 'Failed to update location details');
			}
		} else {
			errorToast('An error occurred');
		}
	};

	let newUserEmail = $state('');
	let newUserPermission = $state(3); // Default to Viewer
	let applyPermissionToDevices = $state(false);
	let isAdding = $state(false);

	let editingUser: {
		id: number;
		user_id: string;
		permission_level: number;
		applyToDevices: boolean;
	} | null = $state(null);

	const permissionMap = {
		1: 'Admin',
		2: 'User',
		3: 'Viewer',
		4: 'Disabled'
	};

	const handleAddUserSuccess = (result) => {
		isAdding = false;

		if (result.type === 'success') {
			if (result.data.success) {
				success('User added successfully');
				newUserEmail = '';
				newUserPermission = 3;
				applyPermissionToDevices = false;

				// Refresh the page to show updated user list
				window.location.reload();
			} else {
				errorToast(result.data.error || 'Failed to add user');
			}
		} else {
			errorToast('An error occurred');
		}
	};

	const handleDeleteLocation = async () => {
		if (!confirm('Are you sure you want to delete this location? This action cannot be undone.')) {
			return;
		}

		try {
			const response = await fetch(``, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ locationId: location.location_id })
			});

			if (response.ok) {
				const result = await response.json();
				if (result.success) {
					success('Location deleted successfully');
					window.location.href = '/app/dashboard/locations/';
				} else {
					errorToast(result.error || 'Failed to delete location');
				}
			} else {
				errorToast('An error occurred while deleting the location');
			}
		} catch (error) {
			errorToast('An error occurred while deleting the location');
		}
	};
</script>

<svelte:head>
	<title>Location Settings - {locationName}</title>
</svelte:head>

<Header {location} basePath={`/app/dashboard/location/${page.params.location_id}`} />

<div class="container mx-auto my-4">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-2xl font-bold">Location Settings</h1>
	</div>

	<!-- Location Details Section -->
	<div class="bg-foreground-light dark:bg-foreground-dark mb-8 rounded-lg p-6 shadow-lg">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-xl font-bold">Location Details</h2>
			{#if !editingLocationDetails}
				<button type="button" class="text-blue-500 hover:text-blue-700" onclick={startEditLocation}>
					Edit Details
				</button>
			{/if}
		</div>

		{#if editingLocationDetails}
			<form
				method="POST"
				action="?/updateLocation"
				class="form-container max-w-md"
				use:enhance={() => {
					isUpdatingLocation = true;

					return ({ result }) => {
						handleLocationUpdateSuccess(result);
					};
				}}
				use:formValidation
			>
				<div class="mb-4">
					<label for="locationName" class="mb-1 block font-medium">Location Name</label>
					<input
						type="text"
						id="locationName"
						name="name"
						required
						placeholder="Location Name"
						class="w-full rounded border px-3 py-2"
						bind:value={locationName}
					/>
				</div>

				<div class="mb-4">
					<label for="locationLatitude" class="mb-1 block font-medium">Latitude</label>
					<input
						type="number"
						id="locationLatitude"
						name="lat"
						step="any"
						placeholder="Latitude (e.g. 51.5074)"
						class="w-full rounded border px-3 py-2"
						bind:value={locationLatitude}
					/>
					<p class="mt-1 text-sm text-gray-500">Decimal format (e.g. 51.5074)</p>
				</div>

				<div class="mb-4">
					<label for="locationLongitude" class="mb-1 block font-medium">Longitude</label>
					<input
						type="number"
						id="locationLongitude"
						name="long"
						step="any"
						placeholder="Longitude (e.g. -0.1278)"
						class="w-full rounded border px-3 py-2"
						bind:value={locationLongitude}
					/>
					<p class="mt-1 text-sm text-gray-500">Decimal format (e.g. -0.1278)</p>
				</div>

				<div class="flex gap-2">
					<button
						type="submit"
						class="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
						disabled={isUpdatingLocation || !locationName}
					>
						{isUpdatingLocation ? 'Updating...' : 'Update Location'}
					</button>
					<button
						type="button"
						class="rounded bg-gray-300 px-4 py-2 text-gray-800 hover:bg-gray-400"
						onclick={() => cancelEditLocation()}
					>
						Cancel
					</button>
				</div>
			</form>
		{:else}
			<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div>
					<h3 class="text-sm font-medium text-gray-500">Name</h3>
					<p>{location.name}</p>
				</div>
				<div>
					<h3 class="text-sm font-medium text-gray-500">Coordinates</h3>
					<p>
						{#if locationLatitude !== null && locationLongitude !== null}
							{locationLatitude.toFixed(6)}, {locationLongitude.toFixed(6)}
						{:else}
							Not set
						{/if}
					</p>
				</div>
			</div>
		{/if}
	</div>

	<div class="bg-foreground-light dark:bg-foreground-dark mb-8 rounded-lg p-6 shadow-lg">
		<h2 class="mb-4 text-xl font-bold">User Permissions</h2>
		<p class="mb-4">
			Manage which users have access to this location and with what permission level.
		</p>

		<UserPermissionsSelector {data} {ownersList} canDelete={true} />

		<div class="mt-6 border-t pt-4">
			<h3 class="mb-2 text-lg font-medium">Add User</h3>

			<form
				method="POST"
				action="?/addUser"
				class="form-container w-full max-w-md"
				use:enhance={() => {
					isAdding = true;

					return ({ result }) => {
						handleAddUserSuccess(result);
					};
				}}
				use:formValidation
			>
				<div class="mb-4">
					<label for="email" class="mb-1 block font-medium">Email Address</label>
					<input
						type="email"
						id="email"
						name="email"
						required
						placeholder="user@example.com"
						class="w-full rounded border px-3 py-2"
						bind:value={newUserEmail}
					/>
				</div>

				<div class="mb-4">
					<label for="permissionLevel" class="mb-1 block font-medium">Permission Level</label>
					<select
						id="permissionLevel"
						name="permissionLevel"
						required
						class="w-full rounded border px-3 py-2"
						bind:value={newUserPermission}
					>
						{#each [1, 2, 3, 4] as level}
							<option value={level}>{permissionMap[level]}</option>
						{/each}
					</select>
					<p class="mt-1 text-sm text-gray-500">
						<strong>Admin:</strong> Full control over location and devices<br />
						<strong>User:</strong> Can use and configure devices<br />
						<strong>Viewer:</strong> Can only view data<br />
						<strong>Disabled:</strong> No access
					</p>
				</div>

				<div class="mb-4">
					<label class="flex items-center gap-2">
						<input
							type="checkbox"
							name="applyToDevices"
							value="true"
							bind:checked={applyPermissionToDevices}
						/>
						<span
							>Apply same permission to all devices in this location (x{deviceCount} devices)</span
						>
					</label>
					<p class="mt-1 text-sm text-gray-500">
						If unchecked, user will be added with "Disabled" permission to all devices.
					</p>
				</div>

				<div class="flex gap-2">
					<button
						type="submit"
						class="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
						disabled={isAdding || !newUserEmail}
					>
						{isAdding ? 'Adding...' : 'Add User'}
					</button>
				</div>
			</form>
		</div>
	</div>
</div>
<section class="container mx-auto rounded-lg bg-red-300 px-4 py-8 text-black shadow-lg">
	<h1>Super dangerous section!!!</h1>
	<form
		method="POST"
		action="?/deleteLocation"
		class="form-container w-full max-w-md"
		use:enhance={() => {
			return ({ result }) => {
				if (result.type === 'success' && result.data.success) {
					success('Location deleted successfully');
					window.location.href = '/app/dashboard/location/';
				} else {
					errorToast(result.data.error || 'Failed to delete location');
				}
			};
		}}
		use:formValidation
	>
		<button class="btn btn-danger" onclick={() => handleDeleteLocation()}>
			Execute Dangerous Action
		</button>
	</form>
</section>
