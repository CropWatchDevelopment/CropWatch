<script lang="ts">
	import { enhance } from '$app/forms';
	import { formValidation } from '$lib/actions/formValidation';
	import Select from '$lib/components/UI/form/Select.svelte';
	import type { DeviceOwnerWithProfile } from '$lib/models/DeviceOwner';
	import { error, success } from '$lib/stores/toast.svelte.js';

	let { data } = $props();

	let device = $derived(data.device);
	let deviceOwners: DeviceOwnerWithProfile[] = $derived([]);
	let currentUserId = $derived(data.ownerId);

	$effect(() => {
		(async () => {
			deviceOwners = await data.deviceOwners;
		})();
	});

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
		return (
			isDeviceOwner(currentUserId) ||
			deviceOwners.some(
				(owner) => owner.user_id === currentUserId && owner.permission_level <= 1 // Admin level or higher
			)
		);
	}
</script>

<svelte:head>
	<title>Permissions - CropWatch</title>
</svelte:head>

<section class="flex flex-col gap-6">
	<header class="flex flex-row items-center justify-between gap-4">
		<div>
			<h1 class="mb-1 text-2xl font-semibold">Permissions</h1>
			<p class="text-sm text-neutral-100">
				Manage who has access to {device?.name || 'this device'} and their permission levels.
			</p>
		</div>
	</header>

	<!-- Current Users List -->
	<section class="form-container bg-card !gap-0 rounded-lg">
		<div class="border-b border-gray-300 pb-4 dark:border-neutral-400">
			<h3 class="text-lg font-semibold">Current Users</h3>
		</div>
		<div class="divide-y">
			{#if deviceOwners.length === 0}
				<div class="text-muted-foreground p-4 text-center">
					No additional users have access to this device.
				</div>
			{:else}
				{#each deviceOwners as owner (owner.id)}
					<div
						class="item-start flex flex-col justify-between gap-3 border-gray-300 p-3 sm:flex-row sm:items-center dark:border-neutral-400"
					>
						<div class="flex items-center gap-3">
							<div
								class="bg-secondary/70 dark:bg-secondary/20 flex h-10 w-10 items-center justify-center rounded-full text-xl
							text-white uppercase"
							>
								<span class="font-medium">
									{owner.profile?.full_name?.charAt(0) || owner.profile?.email?.charAt(0) || 'U'}
								</span>
							</div>
							<div>
								<div class="font-medium">
									{owner.profile?.full_name || owner.profile?.email || `User ${owner.user_id}`}
								</div>
								<div class="text-sm text-neutral-50">
									{owner.profile?.email || ''}
								</div>
							</div>
						</div>

						<div class="flex items-center gap-2">
							{#if isDeviceOwner(owner.user_id)}
								<span
									class="bg-primary/60 dark:bg-primary/30 text-gray rounded px-3 py-1 text-sm dark:text-white"
								>
									Owner
								</span>
							{/if}
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
													success(
														(result.data as any).message || 'Permission updated successfully'
													);
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
										<Select
											name="permissionLevel"
											required
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
										</Select>
										<button type="submit" class="hidden" aria-hidden="true">Update</button>
									</form>
								</div>
							{:else}
								<span
									class="bg-primary/60 dark:bg-primary/30 text-gray rounded px-3 py-1 text-sm dark:text-white"
								>
									{getPermissionName(owner.permission_level)}
								</span>
							{/if}
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</section>

	<!-- Permission Levels Reference -->
	<section class="bg-muted rounded-lg">
		<h3 class="mb-2 text-lg font-semibold">Permission Levels</h3>
		<div class="grid grid-cols-1 gap-2 md:grid-cols-3">
			<div>
				<span class="font-medium">Admin (Level 1):</span>
				<p class="text-muted-foreground text-sm">Full access including user management</p>
			</div>
			<div>
				<span class="font-medium">Editor (Level 2):</span>
				<p class="text-muted-foreground text-sm">Can modify device settings and configurations</p>
			</div>
			<div>
				<span class="font-medium">Viewer (Level 3):</span>
				<p class="text-muted-foreground text-sm">Can view device data and settings</p>
			</div>
		</div>
	</section>
</section>
