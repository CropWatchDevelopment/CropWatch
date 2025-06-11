<script lang="ts">
	import { page } from '$app/stores';
import { enhance } from '$app/forms';
import { success, error } from '$lib/stores/toast.svelte.js';
import { formValidation } from '$lib/actions/formValidation';
	import type { DeviceOwnerWithProfile } from '$lib/models/DeviceOwner';

	let { data } = $props();
	
	let device = $derived(data.device);
	let deviceOwners = $derived(data.deviceOwners as DeviceOwnerWithProfile[]);
	let currentUserId = $derived(data.ownerId);

	// Permission levels (lower numbers = higher permissions)
	const PERMISSION_LEVELS = {
		1: 'Admin',
		2: 'Editor', 
		3: 'Viewer'
	};

	// Form states
	let newUserEmail = $state('');
	let newUserPermissionLevel = $state(3); // Default to Viewer (lowest permission)
	let isAddingUser = $state(false);

	function getPermissionName(level: number): string {
		return PERMISSION_LEVELS[level as keyof typeof PERMISSION_LEVELS] || `Level ${level}`;
	}

	function isDeviceOwner(userId: string): boolean {
		return device?.user_id === userId;
	}

	function canManagePermissions(): boolean {
		if (!currentUserId) return false;
		return isDeviceOwner(currentUserId) || deviceOwners.some(
			owner => owner.user_id === currentUserId && owner.permission_level <= 1 // Admin level or higher
		);
	}
</script>

<div class="flex flex-col gap-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold">Device Permissions</h1>
			<p class="text-muted-foreground text-sm">
				Manage who has access to {device?.name || 'this device'} and their permission levels.
			</p>
		</div>
	</div>

	

	<!-- Current Users List -->
	<div class="bg-card rounded-lg border">
		<div class="p-4 border-b">
			<h3 class="text-lg font-semibold">Current Users</h3>
		</div>
		<div class="divide-y">
			{#if deviceOwners.length === 0}
				<div class="p-4 text-center text-muted-foreground">
					No additional users have access to this device.
				</div>
			{:else}
				{#each deviceOwners as owner (owner.id)}
					<div class="p-4 flex items-center justify-between">
						<div class="flex items-center gap-3">
							<div class="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
								<span class="text-sm font-medium">
									{owner.profile?.full_name?.charAt(0) || owner.profile?.email?.charAt(0) || 'U'}
								</span>
							</div>
							<div>
								<div class="font-medium">
									{owner.profile?.full_name || owner.profile?.email || `User ${owner.user_id}`}
									{#if isDeviceOwner(owner.user_id)}
										<span class="text-xs bg-primary text-primary-foreground px-2 py-1 rounded ml-2">
											Owner
										</span>
									{/if}
								</div>
								<div class="text-sm text-muted-foreground">
									{owner.profile?.email || ''}
								</div>
							</div>
						</div>
						
						<div class="flex items-center gap-2">
							<span class="text-sm font-medium px-3 py-1 bg-secondary rounded">
								{getPermissionName(owner.permission_level)}
							</span>
							
							{#if canManagePermissions() && !isDeviceOwner(owner.user_id)}
								<div class="flex gap-1">
									<!-- Update Permission Form -->
                                                                       <form
                                                                              method="POST"
                                                                              action="?/updateDevicePermission"
                                                                              class="inline"
                                                                              use:enhance={({ formElement, formData, action, cancel, submitter }) => {
                                                                                      return async ({ result, update }) => {
                                                                                              if (result.type === 'success' && result.data?.success) {
                                                                                                      success((result.data as any).message || 'Permission updated successfully');
                                                                                                      await update();
                                                                                              } else if (result.type === 'success' && result.data?.error) {
                                                                                                      error((result.data as any).error);
                                                                                              } else {
                                                                                                      error('Failed to update permission');
                                                                                              }
                                                                                      };
                                                                              }}
                                                                              use:formValidation
                                                                       >
                                                                               <input type="hidden" name="deviceOwnerId" value={owner.id} />
                                                                               <select
                                                                               name="permissionLevel"
                                                                               required
                                                                               class="text-xs px-2 py-1 border rounded"
                                                                               onchange={(e) => {
                                                                               const form = e.currentTarget.closest('form');
                                                                               if (form) form.requestSubmit();
                                                                               }}
                                                                               >
                                                                               {#each Object.entries(PERMISSION_LEVELS) as [level, name]}
                                                                               <option value={level} selected={owner.permission_level == parseInt(level)}>
                                                                               {name}
                                                                               </option>
                                                                               {/each}
                                                                               </select>
                                                                               <button type="submit" class="hidden" aria-hidden="true">Update</button>
                                                                       </form>
								</div>
							{/if}
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</div>

	<!-- Permission Levels Reference -->
	<div class="bg-muted rounded-lg p-4">
		<h4 class="font-semibold mb-2">Permission Levels</h4>
		<div class="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
			<div>
				<span class="font-medium">Admin (Level 1):</span>
				<p class="text-muted-foreground">Full access including user management</p>
			</div>
			<div>
				<span class="font-medium">Editor (Level 2):</span>
				<p class="text-muted-foreground">Can modify device settings and configurations</p>
			</div>
			<div>
				<span class="font-medium">Viewer (Level 3):</span>
				<p class="text-muted-foreground">Can view device data and settings</p>
			</div>
		</div>
	</div>
</div>