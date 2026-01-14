<script lang="ts">
	import type { SupabaseClient } from '@supabase/supabase-js';
	import CWButton from './CWButton.svelte';
	import CWDialog from './CWDialog.svelte';
	import type { PermissionLevel } from './CWPermissionRowItem.svelte';
	import { getToastContext } from '$lib/components/toast';

	interface Props {
		/** Whether the dialog is open */
		open: boolean;
		/** Supabase client for database operations */
		supabase: SupabaseClient;
		/** Location ID for this permission group */
		locationId: number;
		/** User IDs that already have permissions (to filter from search results) */
		existingUserIds?: string[];
		/** Available permission levels */
		permissionLevels?: PermissionLevel[];
		/** Callback when dialog is closed */
		onClose?: () => void;
		/** Callback when user is successfully added */
		onUserAdded?: () => void | Promise<void>;
	}

	let {
		open = $bindable(false),
		supabase,
		locationId,
		existingUserIds = [],
		permissionLevels = [
			{ id: 1, name: 'Admin' },
			{ id: 2, name: 'Editor' },
			{ id: 3, name: 'Viewer' },
			{ id: 4, name: 'Disabled' }
		],
		onClose,
		onUserAdded
	}: Props = $props();

	// Loading states
	let addingUser = $state(false);
	let searchingUser = $state(false);

	// Form states
	let newUserEmail = $state('');
	let newUserPermission = $state(1);
	let applyToAllDevices = $state(false);

	// Search results
	let searchResults = $state<{ id: string; email: string; full_name: string }[]>([]);
	let selectedNewUser = $state<{ id: string; email: string; full_name: string } | null>(null);
	let searchError = $state('');

	const toast = getToastContext();

	// Device count for this location
	let deviceCount = $state(0);

	// Reset form when dialog opens
	$effect(() => {
		if (open) {
			resetForm();
			fetchDeviceCount();
		}
	});

	function resetForm() {
		newUserEmail = '';
		newUserPermission = 1;
		applyToAllDevices = false;
		searchResults = [];
		selectedNewUser = null;
		searchError = '';
	}

	function handleClose() {
		open = false;
		onClose?.();
	}

	async function fetchDeviceCount() {
		const { count } = await supabase
			.from('cw_devices')
			.select('*', { count: 'exact', head: true })
			.eq('location_id', locationId);

		deviceCount = count ?? 0;
	}

	async function searchUsers() {
		if (!newUserEmail || newUserEmail.length < 3) {
			searchResults = [];
			return;
		}

		searchingUser = true;
		searchError = '';

		try {
			const { data, error } = await supabase
				.from('profiles')
				.select('id, email, full_name')
				.ilike('email', `%${newUserEmail}%`)
				.limit(5);

			if (error) {
				searchError = 'Error searching for users';
				searchResults = [];
			} else {
				// Filter out users who already have permission
				searchResults = (data ?? []).filter((u) => !existingUserIds.includes(u.id));
			}
		} catch {
			searchError = 'Error searching for users';
			searchResults = [];
		} finally {
			searchingUser = false;
		}
	}

	function selectUser(user: { id: string; email: string; full_name: string }) {
		selectedNewUser = user;
		newUserEmail = user.email;
		searchResults = [];
	}

	function clearSelectedUser() {
		selectedNewUser = null;
		newUserEmail = '';
	}

	async function addUser() {
		if (!selectedNewUser) return;

		addingUser = true;

		try {
			const response = await fetch('/api/private/location/create-location-user', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					user_id: selectedNewUser.id,
					location_id: locationId,
					permission_level: newUserPermission,
					is_active: true,
					apply_to_devices: applyToAllDevices
				})
			});

			const result = await response.json().catch(() => null);
			if (!response.ok || result?.success === false) {
				const message = result?.error ?? 'Failed to add user to location.';
				throw new Error(message);
			}

			toast.success('User added to location.', { title: 'Success' });

			handleClose();
			await onUserAdded?.();
		} catch (error) {
			console.error('Error adding user:', error);
			toast.error(
				error instanceof Error ? error.message : 'Failed to add user to location.',
				{ title: 'Unable to add user' }
			);
		} finally {
			addingUser = false;
		}
	}
</script>

<CWDialog bind:open title="Add User">
	<div class="space-y-4">
		<p class="text-sm text-slate-400">Grant a user access to this location.</p>

		<!-- User Search -->
		<div>
			<label for="user-email" class="mb-1 block text-sm font-medium text-slate-300">
				Search User by Email
			</label>
			<div class="relative">
				<input
					id="user-email"
					type="email"
					bind:value={newUserEmail}
					oninput={searchUsers}
					placeholder="user@example.com"
					class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 placeholder-slate-500 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
				/>
				{#if searchingUser}
					<div class="absolute right-3 top-1/2 -translate-y-1/2">
						<svg
							class="h-4 w-4 animate-spin text-slate-400"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
						>
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
					</div>
				{/if}
			</div>

			<!-- Search Results -->
			{#if searchResults.length > 0}
				<div class="mt-2 overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
					{#each searchResults as result (result.id)}
						<button
							type="button"
							class="flex w-full items-center gap-3 border-b border-slate-700 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-slate-700"
							onclick={() => selectUser(result)}
						>
							<div
								class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-600 text-sm font-medium text-slate-200"
							>
								{result.full_name?.charAt(0).toUpperCase() ?? '?'}
							</div>
							<div>
								<p class="font-medium text-slate-200">{result.full_name}</p>
								<p class="text-sm text-slate-400">{result.email}</p>
							</div>
						</button>
					{/each}
				</div>
			{/if}

			{#if searchError}
				<p class="mt-1 text-sm text-red-400">{searchError}</p>
			{/if}
		</div>

		<!-- Selected User Display -->
		{#if selectedNewUser}
			<div class="rounded-xl border border-sky-500/30 bg-sky-500/10 p-3">
				<div class="flex items-center gap-3">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/20 font-medium text-sky-300"
					>
						{selectedNewUser.full_name?.charAt(0).toUpperCase() ?? '?'}
					</div>
					<div class="flex-1">
						<p class="font-medium text-slate-200">{selectedNewUser.full_name}</p>
						<p class="text-sm text-slate-400">{selectedNewUser.email}</p>
					</div>
					<button
						type="button"
						class="p-1 text-slate-400 transition-colors hover:text-slate-200"
						aria-label="Clear selected user"
						onclick={clearSelectedUser}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-5 w-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
			</div>
		{/if}

		<!-- Permission Level -->
		<div>
			<label for="user-permission" class="mb-1 block text-sm font-medium text-slate-300">
				Permission Level
			</label>
			<select
				id="user-permission"
				bind:value={newUserPermission}
				class="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-slate-100 transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
			>
				{#each permissionLevels as level (level.id)}
					<option value={level.id}>{level.name}</option>
				{/each}
			</select>
		</div>

		<!-- Apply to All Devices Option -->
		{#if deviceCount > 0}
			<div class="rounded-xl border border-slate-700 bg-slate-800/50 p-4">
				<label class="flex cursor-pointer items-start gap-3">
					<input
						type="checkbox"
						bind:checked={applyToAllDevices}
						class="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-700 text-sky-500 focus:ring-sky-500 focus:ring-offset-0"
					/>
					<div>
						<p class="font-medium text-slate-200">Apply to all devices</p>
						<p class="mt-0.5 text-sm text-slate-400">
							Also grant this user the same permission level on all {deviceCount} device{deviceCount !==
							1
								? 's'
								: ''} in this location.
						</p>
					</div>
				</label>
			</div>
		{/if}

		<div class="flex justify-end gap-2 pt-2">
			<CWButton variant="ghost" onclick={handleClose}>Cancel</CWButton>
			<CWButton variant="primary" loading={addingUser} onclick={addUser} disabled={!selectedNewUser}>
				Add User
			</CWButton>
		</div>
	</div>
</CWDialog>
