<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Spinner from '$lib/components/Spinner.svelte';
	import { success, error as toastError } from '$lib/stores/toast.svelte';
	
	// Page data
	let { data } = $props();
	const { devEui } = $page.params;
	
	// State for managing device and permissions
	let device = $state<any>(null);
	let deviceName = $state<string>('');
	let devicePermissions = $state<DevicePermission[]>([]);
	let permissionLevels = $state<PermissionLevel[]>([]);
	let allUsers = $state<UserProfile[]>([]);
	let loading = $state(true);
	let saving = $state(false);
	let error = $state<string | null>(null);
	
	// Form states for adding a new user
	let selectedUserId = $state('');
	let selectedPermissionLevel = $state(0);
	
	// Types
	interface DevicePermission {
		id: number;
		dev_eui: string;
		user_id: string;
		permission_level: number;
		user?: UserProfile;
		permissionName?: string;
	}
	
	interface PermissionLevel {
		id: number;
		name: string;
		permission_level_id: number;
	}
	
	interface UserProfile {
		id: string;
		email: string;
		full_name: string | null;
		username: string | null;
	}
	
	// Fetch data on mount
	onMount(async () => {
		try {
			await Promise.all([
				fetchDeviceDetails(),
				fetchPermissions(),
				fetchPermissionLevels(),
				fetchUsers()
			]);
			loading = false;
		} catch (err) {
			console.error('Error loading permissions page:', err);
			error = err instanceof Error ? err.message : 'Failed to load permissions';
			loading = false;
		}
	});
	
	// Fetch device details
	async function fetchDeviceDetails() {
		const response = await fetch(`/api/devices/${devEui}`);
		if (!response.ok) {
			throw new Error('Failed to fetch device details');
		}
		device = await response.json();
		deviceName = device.name;
	}
	
	// Fetch existing permissions for this device
	async function fetchPermissions() {
		const response = await fetch(`/api/devices/${devEui}/permissions`);
		if (!response.ok) {
			throw new Error('Failed to fetch device permissions');
		}
		devicePermissions = await response.json();
	}
	
	// Fetch available permission levels
	async function fetchPermissionLevels() {
		const response = await fetch('/api/permissions/levels');
		if (!response.ok) {
			throw new Error('Failed to fetch permission levels');
		}
		permissionLevels = await response.json();
		
		// Set default permission level if available
		if (permissionLevels.length > 0) {
			selectedPermissionLevel = permissionLevels[0].permission_level_id;
		}
		
		// Add permission names to device permissions
		addPermissionNames();
	}
	
	// Fetch all users that can be given permissions
	async function fetchUsers() {
		const response = await fetch('/api/users');
		if (!response.ok) {
			throw new Error('Failed to fetch users');
		}
		allUsers = await response.json();
		
		// Add user details to permissions
		addUserDetails();
	}
	
	// Add user details to permissions
	function addUserDetails() {
		if (devicePermissions.length && allUsers.length) {
			devicePermissions = devicePermissions.map(perm => {
				const user = allUsers.find(u => u.id === perm.user_id);
				return {
					...perm,
					user
				};
			});
		}
	}
	
	// Add permission names to device permissions
	function addPermissionNames() {
		if (devicePermissions.length && permissionLevels.length) {
			devicePermissions = devicePermissions.map(perm => {
				const level = permissionLevels.find(l => l.permission_level_id === perm.permission_level);
				return {
					...perm,
					permissionName: level ? level.name : 'Unknown'
				};
			});
		}
	}
	
	// Handle adding a new user permission
	async function handleAddPermission() {
		if (!selectedUserId) {
			toastError('Please select a user');
			return;
		}
		
		// Check if user already has permission
		if (devicePermissions.some(p => p.user_id === selectedUserId)) {
			toastError('User already has permission for this device');
			return;
		}
		
		saving = true;
		error = null;
		
		try {
			const response = await fetch(`/api/devices/${devEui}/permissions`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					user_id: selectedUserId,
					permission_level: selectedPermissionLevel
				})
			});
			
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Failed to add permission');
			}
			
			// Refresh permissions list
			await fetchPermissions();
			addUserDetails();
			addPermissionNames();
			
			// Reset form
			selectedUserId = $state('')
			
			success('Permission added successfully');
		} catch (err) {
			console.error('Error adding permission:', err);
			error = err instanceof Error ? err.message : 'Failed to add permission';
			toastError(error);
		} finally {
			saving = false;
		}
	}
	
	// Handle updating a user's permission level
	async function updatePermissionLevel(permissionId: number, newLevel: number) {
		saving = true;
		error = null;
		
		try {
			const response = await fetch(`/api/devices/${devEui}/permissions/${permissionId}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					permission_level: newLevel
				})
			});
			
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Failed to update permission');
			}
			
			// Refresh permissions list
			await fetchPermissions();
			addUserDetails();
			addPermissionNames();
			
			success('Permission updated successfully');
		} catch (err) {
			console.error('Error updating permission:', err);
			error = err instanceof Error ? err.message : 'Failed to update permission';
			toastError(error);
		} finally {
			saving = false;
		}
	}
	
	// Handle removing a user's permission
	async function handleRemovePermission(permissionId: number) {
		if (!confirm('Are you sure you want to remove this user\'s access to the device?')) {
			return;
		}
		
		saving = true;
		error = null;
		
		try {
			const response = await fetch(`/api/devices/${devEui}/permissions/${permissionId}`, {
				method: 'DELETE'
			});
			
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.message || 'Failed to remove permission');
			}
			
			// Refresh permissions list
			await fetchPermissions();
			addUserDetails();
			addPermissionNames();
			
			success('Permission removed successfully');
		} catch (err) {
			console.error('Error removing permission:', err);
			error = err instanceof Error ? err.message : 'Failed to remove permission';
			toastError(error);
		} finally {
			saving = false;
		}
	}
	
	// Get available users (users without permissions)
	let availableUsers = $derived(allUsers.filter(user => 
		!devicePermissions.some(perm => perm.user_id === user.id)
	));
	
	// Navigate back to device settings
	function goBackToSettings() {
		goto(`/dashboard/device/${devEui}/settings`);
	}
	
	// Format user display name
	function formatUserName(user: UserProfile | undefined): string {
		if (!user) return 'Unknown User';
		return user.full_name || user.username || user.email || 'Unknown User';
	}
	
	function handleRetry() {
		window.location.reload();
	}
</script>

<svelte:head>
	<title>Device Permissions | IoT Dashboard</title>
</svelte:head>

<div class="permissions-page">
	<div class="page-header">
		<button class="back-button" onclick={goBackToSettings}>
			<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<path d="M19 12H5M12 19l-7-7 7-7"/>
			</svg>
			Back to Settings
		</button>
		<h1>Device Permissions</h1>
		{#if deviceName}
			<h2>{deviceName} <span class="device-id">({devEui})</span></h2>
		{/if}
	</div>

	{#if loading}
		<div class="loading-container">
			<Spinner />
			<p>Loading permissions...</p>
		</div>
	{:else if error}
		<div class="error-message">
			<p>Error: {error}</p>
			<button class="retry-button" onclick={handleRetry}>Retry</button>
		</div>
	{:else}
		<div class="permissions-container">
			<!-- Add new permission form -->
			<div class="permissions-form card">
				<h3>Add User Access</h3>
				<div class="form-content">
					<div class="form-group">
						<label for="user-select">Select User</label>
						<select id="user-select" bind:value={selectedUserId} disabled={saving || availableUsers.length === 0}>
							<option value="">-- Select a user --</option>
							{#each availableUsers as user}
								<option value={user.id}>{formatUserName(user)}</option>
							{/each}
						</select>
						{#if availableUsers.length === 0}
							<p class="form-note">All available users have been assigned permissions</p>
						{/if}
					</div>
					
					<div class="form-group">
						<label for="permission-level">Permission Level</label>
						<select id="permission-level" bind:value={selectedPermissionLevel} disabled={saving}>
							{#each permissionLevels as level}
								<option value={level.permission_level_id}>{level.name}</option>
							{/each}
						</select>
					</div>
					
					<button class="add-button" onclick={handleAddPermission} disabled={saving || !selectedUserId}>
						{#if saving}
							<Spinner size="small" />
						{:else}
							Add User
						{/if}
					</button>
				</div>
			</div>
			
			<!-- Current permissions list -->
			<div class="permissions-list card">
				<h3>Current User Access</h3>
				{#if devicePermissions.length === 0}
					<p class="empty-state">No users have been granted access to this device yet.</p>
				{:else}
					<table>
						<thead>
							<tr>
								<th>User</th>
								<th>Email</th>
								<th>Access Level</th>
								<th>Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each devicePermissions as permission}
								<tr>
									<td>{formatUserName(permission.user)}</td>
									<td>{permission.user?.email || 'N/A'}</td>
									<td>
										<select 
											value={permission.permission_level} 
											onchange={(e) => updatePermissionLevel(permission.id, parseInt(e.target.value))}
											disabled={saving}
										>
											{#each permissionLevels as level}
												<option value={level.permission_level_id}>{level.name}</option>
											{/each}
										</select>
									</td>
									<td>
										<button 
											class="remove-button" 
											onclick={() => handleRemovePermission(permission.id)}
											disabled={saving}
										>
											Remove
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</div>
		</div>
		
		<!-- Permission level descriptions -->
		<div class="permissions-info card">
			<h3>Permission Level Information</h3>
			<div class="info-content">
				<ul>
					{#each permissionLevels as level}
						<li>
							<strong>{level.name}</strong>
							<p>
								{#if level.name === 'Admin'}
									Full access to manage device settings, view data, modify permissions, and delete device
								{:else if level.name === 'Manager'}
									Ability to view data, modify device settings, but cannot change ownership or delete device
								{:else if level.name === 'User'}
									Can view device data and basic settings, but cannot modify device configuration
								{:else if level.name === 'Viewer'}
									Read-only access to view device data
								{:else}
									No description available
								{/if}
							</p>
						</li>
					{/each}
				</ul>
			</div>
		</div>
	{/if}
</div>

<style>
	.permissions-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: 20px;
	}
	
	.page-header {
		margin-bottom: 30px;
	}
	
	.page-header h1 {
		margin-top: 20px;
		margin-bottom: 5px;
		font-size: 28px;
		color: #333;
	}
	
	.page-header h2 {
		margin-top: 5px;
		font-size: 18px;
		font-weight: 500;
		color: #555;
	}
	
	.device-id {
		font-size: 14px;
		color: #777;
		font-weight: normal;
	}
	
	.back-button {
		display: flex;
		align-items: center;
		background: none;
		border: none;
		color: #4CAF50;
		font-size: 14px;
		cursor: pointer;
		padding: 5px 0;
	}
	
	.back-button svg {
		margin-right: 5px;
	}
	
	.card {
		background-color: white;
		border-radius: 8px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
		padding: 20px;
		margin-bottom: 24px;
	}
	
	.card h3 {
		margin-top: 0;
		margin-bottom: 20px;
		padding-bottom: 10px;
		border-bottom: 1px solid #eee;
		font-size: 18px;
		color: #333;
	}
	
	.permissions-container {
		display: grid;
		grid-template-columns: 1fr 2fr;
		gap: 24px;
		margin-bottom: 24px;
	}
	
	.form-group {
		margin-bottom: 16px;
	}
	
	.form-group label {
		display: block;
		margin-bottom: 6px;
		font-weight: 500;
		font-size: 14px;
	}
	
	.form-group select {
		width: 100%;
		padding: 10px;
		border: 1px solid #ccc;
		border-radius: 4px;
		font-size: 14px;
	}
	
	.form-note {
		font-size: 13px;
		color: #777;
		margin-top: 4px;
	}
	
	.add-button, .retry-button {
		background-color: #4CAF50;
		color: white;
		border: none;
		padding: 10px 16px;
		border-radius: 4px;
		cursor: pointer;
		font-size: 14px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	.add-button:disabled {
		background-color: #9e9e9e;
		cursor: not-allowed;
	}
	
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 14px;
	}
	
	table th, table td {
		padding: 12px 10px;
		text-align: left;
	}
	
	table th {
		border-bottom: 1px solid #ddd;
		font-weight: 600;
	}
	
	table td {
		border-bottom: 1px solid #eee;
	}
	
	.remove-button {
		background-color: #f44336;
		color: white;
		border: none;
		padding: 5px 10px;
		border-radius: 4px;
		cursor: pointer;
		font-size: 12px;
	}
	
	.remove-button:disabled {
		background-color: #e57373;
		cursor: not-allowed;
	}
	
	.permissions-info ul {
		padding-left: 0;
		list-style-type: none;
	}
	
	.permissions-info li {
		margin-bottom: 16px;
	}
	
	.permissions-info li strong {
		display: block;
		margin-bottom: 4px;
	}
	
	.permissions-info li p {
		margin: 0;
		color: #555;
		font-size: 14px;
	}
	
	.loading-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 40px 0;
	}
	
	.loading-container p {
		margin-top: 12px;
		color: #555;
	}
	
	.error-message {
		background-color: #ffebee;
		border-left: 4px solid #f44336;
		padding: 16px 20px;
		border-radius: 4px;
		margin-bottom: 20px;
	}
	
	.error-message p {
		margin: 0 0 10px 0;
		color: #d32f2f;
	}
	
	.empty-state {
		text-align: center;
		color: #777;
		padding: 20px 0;
	}
	
	@media (max-width: 768px) {
		.permissions-container {
			grid-template-columns: 1fr;
		}
	}
</style>