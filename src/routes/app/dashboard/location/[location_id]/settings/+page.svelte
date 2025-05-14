<script lang="ts">
	import { enhance } from '$app/forms';
	import { error as errorToast, success } from '$lib/stores/toast.svelte';

	export let data;

	const { location, locationUsers, deviceCount, permissionTypes, currentUser } = data;

	let newUserEmail = '';
	let newUserPermission = 3; // Default to Viewer
	let applyPermissionToDevices = false;
	let isAdding = false;

	let editingUser: {
		id: number;
		user_id: string;
		permission_level: number;
		applyToDevices: boolean;
	} | null = null;

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
	<title>Location Settings - {location.name}</title>
</svelte:head>
asdfasdf
<div class="container mx-auto px-4 py-8">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-2xl font-bold">Location Settings: {location.name}</h1>
		<a href="/dashboard/location/{location.location_id}" class="text-blue-500 hover:text-blue-700">
			Back to Location
		</a>
	</div>

	<div class="mb-8 rounded-lg bg-foreground-light dark:bg-foreground-dark p-6 shadow-lg">
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
												on:click={cancelEdit}
											>
												Cancel
											</button>
										</div>
									{:else}
										<div class="flex gap-2">
											<button
												type="button"
												class="text-blue-600 hover:text-blue-800"
												on:click={() => startEdit(user)}
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
				class="max-w-md"
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
						<span>Apply same permission to all devices in this location ({deviceCount})</span>
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

	<div class="rounded-lg bg-foreground-light dark:bg-foreground-dark p-6 shadow-lg">
		<h2 class="mb-4 text-xl font-bold">About Permissions</h2>

		<div class="prose max-w-none">
			<h3>Location Permissions</h3>
			<p>Users can have one of four permission levels for any location:</p>
			<ul>
				<li>
					<strong>Admin (1):</strong> Full control over the location, including managing users and all
					devices
				</li>
				<li>
					<strong>User (2):</strong> Can use and modify location settings except for user permissions
				</li>
				<li><strong>Viewer (3):</strong> Can only view location data but not make changes</li>
				<li><strong>Disabled (4):</strong> No access to the location</li>
			</ul>

			<h3>Device Permissions</h3>
			<p>
				When a user is added to a location, they are automatically added to all devices in that
				location with the "Disabled" permission level by default. You can choose to apply the same
				permission level to all devices by checking the "Apply to all devices" option.
			</p>
		</div>
	</div>
</div>
