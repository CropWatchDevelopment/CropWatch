<script lang="ts">
	import type { SupabaseClient } from '@supabase/supabase-js';
	import { getToastContext } from '$lib/components/toast';
	import CWPermissionRowItem, {
		type PermissionUser,
		type PermissionLevel
	} from './CWPermissionRowItem.svelte';
	import CWButton from './CWButton.svelte';
	import CWDialog from './CWDialog.svelte';
	import CWAddUserDialog from './CWAddUserDialog.svelte';
	import CWLocationPermissionItem from './CWLocationPermissionItem.svelte';

	/**
	 * Location permission object from the database
	 */
	export interface LocationPermission {
		user_id: string;
		permission_level: number;
		is_active: boolean;
		profiles: {
			id: string;
			email: string;
			full_name: string;
			avatar_url?: string | null;
		};
	}

	interface Props {
		/** Supabase client for database operations */
		supabase: SupabaseClient;
		/** Location ID for this permission group */
		locationId: number;
		/** Current permissions for this location */
		permissions: LocationPermission[];
		/** Current viewer user id (for gating) */
		currentUserId?: string;
		/** Current viewer permission level for this location */
		currentUserPermissionLevel?: number;
		/** Available permission levels */
		permissionLevels?: PermissionLevel[];
		/** Whether the current user can edit permissions */
		canEdit?: boolean;
		/** Whether the current user can remove users */
		canRemove?: boolean;
		/** Callback when permissions are updated */
		onPermissionsChange?: () => void | Promise<void>;
	}

	let {
		supabase,
		locationId,
		permissions = [],
		currentUserId = '',
		currentUserPermissionLevel = undefined,
		permissionLevels = [
			{ id: 1, name: 'Admin' },
			{ id: 2, name: 'Editor' },
			{ id: 3, name: 'Viewer' },
			{ id: 4, name: 'Disabled' }
		],
		canEdit = true,
		canRemove = true,
		onPermissionsChange
	}: Props = $props();

	const toast = getToastContext();

	// Dialog states
	let showAddUserDialog = $state(false);
	let showEditUserDialog = $state(false);
	let showRemoveUserDialog = $state(false);

	// Loading states
	let updatingUser = $state(false);
	let removingUser = $state(false);

	// Form states for edit/remove dialogs
	let selectedUser = $state<PermissionUser | null>(null);
	let editUserPermission = $state(1);

	const viewerPermissionLevel = $derived(
		currentUserPermissionLevel ??
			(currentUserId
				? (permissions.find((p) => p.user_id === currentUserId)?.permission_level ?? 4)
				: 4)
	);

	const canManagePermissions = $derived(canEdit && viewerPermissionLevel <= 2);
	const canRemoveUsers = $derived(canRemove && viewerPermissionLevel <= 1);

	// Transform permissions to PermissionUser format
	const permissionUsers = $derived<PermissionUser[]>(
		permissions.map((p) => ({
			id: p.user_id,
			user_id: p.user_id,
			full_name: p.profiles.full_name,
			email: p.profiles.email,
			avatar_url: p.profiles.avatar_url ?? null,
			permission_level: p.permission_level,
			permission_name: permissionLevels.find((l) => l.id === p.permission_level)?.name ?? 'Unknown',
			is_active: p.is_active
		}))
	);

	// Get existing user IDs for the add dialog
	const existingUserIds = $derived(permissions.map((p) => p.user_id));

	function openEditUserDialog(user: PermissionUser) {
		selectedUser = user;
		editUserPermission = user.permission_level;
		showEditUserDialog = true;
	}

	function openRemoveUserDialog(user: PermissionUser) {
		selectedUser = user;
		showRemoveUserDialog = true;
	}

	async function updateUserPermission() {
		if (!selectedUser) return;

		updatingUser = true;

		try {
			const { error } = await supabase
				.from('cw_location_owners')
				.update({ permission_level: editUserPermission })
				.eq('location_id', locationId)
				.eq('user_id', selectedUser.user_id);

			if (error) {
				console.error('Error updating permission:', error);
				toast.error('Failed to update permission.', { title: 'Update failed' });
				return;
			}

			showEditUserDialog = false;
			selectedUser = null;
			toast.success('Permission updated.', { title: 'Permissions saved' });
			await onPermissionsChange?.();
		} catch (error) {
			console.error('Error updating permission:', error);
			toast.error('Failed to update permission.', { title: 'Update failed' });
		} finally {
			updatingUser = false;
		}
	}

	async function removeUser() {
		if (!selectedUser) return;

		removingUser = true;

		try {
			const { error } = await supabase
				.from('cw_location_owners')
				.update({ is_active: false })
				.eq('location_id', locationId)
				.eq('user_id', selectedUser.user_id);

			if (error) {
				console.error('Error removing user:', error);
				toast.error('Failed to remove user.', { title: 'Remove failed' });
				return;
			}

			showRemoveUserDialog = false;
			selectedUser = null;
			toast.success('User removed from location.', { title: 'User removed' });
			await onPermissionsChange?.();
		} catch (error) {
			console.error('Error removing user:', error);
			toast.error('Failed to remove user.', { title: 'Remove failed' });
		} finally {
			removingUser = false;
		}
	}

	async function handlePermissionChange(user: PermissionUser, newLevel: number) {
		try {
			const { error } = await supabase
				.from('cw_location_owners')
				.update({ permission_level: newLevel })
				.eq('location_id', locationId)
				.eq('user_id', user.user_id);

			if (error) {
				console.error('Error updating permission:', error);
				toast.error('Failed to update permission.', { title: 'Update failed' });
				return;
			}

			toast.success('Permission updated.', { title: 'Permissions saved' });
			await onPermissionsChange?.();
		} catch (error) {
			console.error('Error updating permission:', error);
			toast.error('Failed to update permission.', { title: 'Update failed' });
		}
	}
</script>

<div class="space-y-4">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h3 class="text-lg font-semibold text-slate-100">Permissions</h3>
			<p class="mt-1 text-sm text-slate-400">Manage user access to this location</p>
		</div>
		{#if canManagePermissions}
			<CWButton variant="primary" size="sm" onclick={() => (showAddUserDialog = true)}>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-4 w-4"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
					/>
				</svg>
				Add User
			</CWButton>
		{/if}
	</div>

	<!-- User List -->
	{#if permissionUsers.length === 0}
		<div class="flex flex-col items-center justify-center py-12 text-center">
			<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-8 w-8 text-slate-400"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
					/>
				</svg>
			</div>
			<p class="text-slate-400">No users have access to this location</p>
			<p class="mt-1 text-sm text-slate-500">Add a user to grant them access</p>
		</div>
	{:else}
		<div class="space-y-2">
			{#each permissionUsers as user (user.user_id)}
				<CWLocationPermissionItem
					{user}
					{supabase}
					{currentUserId}
					currentUserPermissionLevel={viewerPermissionLevel}
					permissionLevels={permissionLevels.map((p) => ({
						id: p.id as 1 | 2 | 3 | 4,
						name: p.name,
						description:
							p.id === 1
								? 'Full control. Can add/remove devices and manage members.'
								: p.id === 2
									? 'Can edit names, alerts, and reports. Cannot move or delete devices.'
									: p.id === 3
										? 'View-only access.'
										: 'No access.'
					}))}
					onPermissionChange={handlePermissionChange}
					onRemove={canRemoveUsers ? openRemoveUserDialog : undefined}
				/>
			{/each}
		</div>
	{/if}
</div>

<!-- Add User Dialog -->
<CWAddUserDialog
	bind:open={showAddUserDialog}
	{supabase}
	{locationId}
	{existingUserIds}
	{permissionLevels}
	onUserAdded={onPermissionsChange}
/>

<!-- Edit User Permission Dialog -->
<CWDialog bind:open={showEditUserDialog} title="Edit User Permission">
	<div class="space-y-4">
		<p class="text-sm text-slate-400">
			Update permission level for <strong class="text-slate-200">{selectedUser?.full_name}</strong>.
		</p>

		<div>
			<label for="edit-permission" class="mb-1 block text-sm font-medium text-slate-300"
				>Permission Level</label
			>
			<select
				id="edit-permission"
				bind:value={editUserPermission}
				class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
			>
				{#each permissionLevels as level (level.id)}
					<option value={level.id}>{level.name}</option>
				{/each}
			</select>
		</div>

		<div class="flex justify-end gap-2 pt-2">
			<CWButton variant="ghost" onclick={() => (showEditUserDialog = false)}>Cancel</CWButton>
			<CWButton variant="primary" loading={updatingUser} onclick={updateUserPermission}>
				Update Permission
			</CWButton>
		</div>
	</div>
</CWDialog>

<!-- Remove User Dialog -->
<CWDialog bind:open={showRemoveUserDialog} title="Remove User">
	<div class="space-y-4">
		<p class="text-slate-300">
			Are you sure you want to remove <strong class="text-slate-100"
				>{selectedUser?.full_name}</strong
			> from this location?
		</p>
		<p class="text-sm text-slate-400">
			This will revoke their access to this location. They will no longer be able to view or manage
			devices here.
		</p>

		<div class="flex justify-end gap-2 pt-2">
			<CWButton variant="ghost" onclick={() => (showRemoveUserDialog = false)}>Cancel</CWButton>
			<CWButton variant="danger" loading={removingUser} onclick={removeUser}>Remove User</CWButton>
		</div>
	</div>
</CWDialog>
