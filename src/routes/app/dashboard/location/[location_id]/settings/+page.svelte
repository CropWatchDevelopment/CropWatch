<script lang="ts">
	import { browser } from '$app/environment';
	import { enhance } from '$app/forms';
	import { error as errorToast, success } from '$lib/stores/toast.svelte';

	let { data } = $props();

	const { location, locationUsers, deviceCount, permissionTypes, currentUser } = data;

	// Location details editing
	let editingLocationDetails = $state(false);
	let locationName = $state(location?.name ?? 'no name set');
	let locationLatitude = $state(location.lat || null);
	let locationLongitude = $state(location.long || null);
	let isUpdatingLocation = $state(false);
	const columns: ColumnRegular[] = $state([
		{
			name: '🎰 Ticker',
			prop: 'symbol',
			sortable: true,
			pin: 'colPinStart',
			cellTemplate: (h, { model, prop }) => h('strong', null, model[prop])
		},
		{
			name: '🔠 Company Name',
			prop: 'company_name',
			size: 300,
			
		},
		{
			name: '',
			prop: '📉 graph',
			readonly: true,
			// Custom cell render
			cellTemplate(h) {
				const barWidth = 5;
				const barSpacing = 5;
				const maxHeight = 30;
				const bars = [];

				// Draw 5 vertical bars with random heights
				for (let i = 0; i < 5; i++) {
					const barHeight = Math.random() * maxHeight;
					const x = i * (barWidth + barSpacing);
					const y = maxHeight - barHeight + 5;

					// Create the rectangle element for the bar
					const rect = h('rect', {
						key: i,
						x,
						y,
						width: barWidth,
						height: barHeight,
						fill: 'blue',
						stroke: 'black'
					});

					// Append the rectangle to the group
					bars.push(rect);
				}
				return h(
					'svg',
					{
						width: '100%',
						height: maxHeight + 10
					},
					h('g', {}, bars)
				);
			}
		},
		{
			name: '💰 Price',
			prop: 'price',
			columnType: 'numeric',
			sortable: true,
			
		},
		{
			name: '⬆️ Change',
			prop: 'change',
			columnType: 'numeric',
			sortable: true
		},
		{
			name: '% Change',
			prop: 'percent_change'
		}
	]);

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

	let newUserEmail = '';
	let newUserPermission = 3; // Default to Viewer
	let applyPermissionToDevices = false;
	let isAdding = false;

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

	const getUserDisplayName = (user) => {
		if (!user?.profile) return 'Unknown User';
		return user.profile.full_name || user.profile.username || user.profile.email || 'Unknown User';
	};

	const startEdit = (user) => {
		editingUser = {
			id: user.id,
			user_id: user.user_id,
			permission_level: user.permission_level || 4,
			applyToDevices: false
		};
	};

	const cancelEdit = () => {
		editingUser = null;
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

	const handleUpdatePermissionSuccess = (result) => {
		if (result.type === 'success') {
			if (result.data.success) {
				success('Permission updated successfully');
				editingUser = null;

				// Refresh the page to show updated permissions
				window.location.reload();
			} else {
				errorToast(result.data.error || 'Failed to update permission');
			}
		} else {
			errorToast('An error occurred');
		}
	};

	const handleRemoveUserSuccess = (result) => {
		if (result.type === 'success') {
			if (result.data.success) {
				success('User removed successfully');

				// Refresh the page to show updated user list
				window.location.reload();
			} else {
				errorToast(result.data.error || 'Failed to remove user');
			}
		} else {
			errorToast('An error occurred');
		}
	};
</script>

<svelte:head>
	<title>Location Settings - {locationName}</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-2xl font-bold">Location Settings: {location.name}</h1>
		<a
			href="/app/dashboard/location/{location.location_id}/"
			class="text-blue-500 hover:text-blue-700"
		>
			Back to Location
		</a>
	</div>

	<!-- Location Details Section -->
	<div class="bg-foreground-light dark:bg-foreground-dark mb-8 rounded-lg p-6 shadow-lg">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-xl font-bold">Location Details</h2>
			{#if !editingLocationDetails}
				<button
					type="button"
					class="text-blue-500 hover:text-blue-700"
					onclick={startEditLocation}
				>
					Edit Details
				</button>
			{/if}
		</div>

		{#if editingLocationDetails}
			<form
				method="POST"
				action="?/updateLocation"
				class="max-w-md"
				use:enhance={() => {
					isUpdatingLocation = true;

					return ({ result }) => {
						handleLocationUpdateSuccess(result);
					};
				}}
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

		{#if locationUsers.length > 0}
			<div class="overflow-x-auto">
				<table class="min-w-full">
					<thead>
						<tr class="border-b">
							<th class="px-4 py-3 text-left">User</th>
							<th class="px-4 py-3 text-left">Email</th>
							<th class="px-4 py-3 text-left">Permission</th>
							<th class="px-4 py-3 text-left">Actions</th>
						</tr>
					</thead>
					<tbody>
						{#each locationUsers as user}
							<tr class="border-b bg-foreground-light dark:bg-foreground-dark">
								<td class="px-4 py-3">{getUserDisplayName(user)}</td>
								<td class="px-4 py-3">{user.profile?.email || 'No email'}</td>
								<td class="px-4 py-3">
									{#if editingUser && editingUser.id === user.id}
										<div class="flex flex-col gap-2">
											<select
												class="rounded border px-2 py-1"
												bind:value={editingUser.permission_level}
											>
												{#each [1, 2, 3, 4] as level}
													<option value={level}>{permissionMap[level]}</option>
												{/each}
											</select>

											<label class="flex items-center gap-2 text-sm">
												<input type="checkbox" bind:checked={editingUser.applyToDevices} />
												<span>Apply to all devices ({deviceCount})</span>
											</label>
										</div>
									{:else}
										<span class={user.permission_level === 1 ? 'font-medium text-green-600' : ''}>
											{permissionMap[user.permission_level] || 'Unknown'}
										</span>
									{/if}
								</td>
								<td class="px-4 py-3">
									{#if editingUser && editingUser.id === user.id}
										<div class="flex gap-2">
											<form
												method="POST"
												action="?/updatePermission"
												use:enhance={() => {
													return ({ result }) => {
														handleUpdatePermissionSuccess(result);
													};
												}}
											>
												<input type="hidden" name="userId" value={user.user_id} />
												<input type="hidden" name="locationOwnerId" value={user.id} />
												<input
													type="hidden"
													name="permissionLevel"
													value={editingUser.permission_level}
												/>
												<input
													type="hidden"
													name="applyToDevices"
													value={editingUser.applyToDevices}
												/>
												<button type="submit" class="text-green-600 hover:text-green-800">
													Save
												</button>
											</form>

											<button
												type="button"
												class="text-gray-600 hover:text-gray-800"
												onclick={() => cancelEdit()}
											>
												Cancel
											</button>
										</div>
									{:else}
										<div class="flex gap-2">
											<button
												type="button"
												class="text-blue-600 hover:text-blue-800"
												onclick={() => startEdit(user)}
											>
												Edit
											</button>

											{#if user.user_id !== currentUser.id}
												<form
													method="POST"
													action="?/removeUser"
													use:enhance={() => {
														if (!confirm('Are you sure you want to remove this user?')) {
															return { action: () => {} };
														}

														return ({ result }) => {
															handleRemoveUserSuccess(result);
														};
													}}
												>
													<input type="hidden" name="userId" value={user.user_id} />
													<input type="hidden" name="locationOwnerId" value={user.id} />
													<button type="submit" class="text-red-600 hover:text-red-800">
														Remove
													</button>
												</form>
											{:else}
												<span class="text-gray-400" title="Cannot remove yourself">Remove</span>
											{/if}
										</div>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{:else}
			<p class="text-gray-500">No users have access to this location yet.</p>
		{/if}

		<div class="mt-6 border-t pt-4">
			<h3 class="mb-2 text-lg font-medium">Add User</h3>

			<form
				method="POST"
				action="?/addUser"
				class="max-w-md w-full"
				use:enhance={() => {
					isAdding = true;

					return ({ result }) => {
						handleAddUserSuccess(result);
					};
				}}
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
						<span>Apply same permission to all devices in this location (x{deviceCount} devices)</span>
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
