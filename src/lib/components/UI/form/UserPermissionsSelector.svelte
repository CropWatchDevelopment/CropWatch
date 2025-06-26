<script lang="ts">
	import { enhance } from '$app/forms';
	import { formValidation } from '$lib/actions/formValidation';
	import Button from '$lib/components/UI/buttons/Button.svelte';
	import Select from '$lib/components/UI/form/Select.svelte';
	import { error, success } from '$lib/stores/toast.svelte.js';

	let { data, ownersList, onDelete = $bindable(), canDelete = false } = $props();
	let device = $derived(data.device);
	let currentUserId = $derived(data.ownerId);

	// Permission levels (lower numbers = higher permissions)
	const PERMISSION_LEVELS = {
		1: 'Admin',
		2: 'Editor',
		3: 'Viewer',
		255: 'Disabled'
	};

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
			ownersList.some(
				(owner) => owner.user_id === currentUserId && owner.permission_level <= 1 // Admin level or higher
			)
		);
	}
</script>

<section class="form-container bg-card !gap-0 rounded-lg">
	<div class="border-b border-gray-300 pb-4 dark:border-neutral-400">
		<h3 class="text-lg font-semibold">Current Users</h3>
	</div>
	<div class="divide-y">
		{#if !ownersList || ownersList?.length === 0}
			<div class="text-muted-foreground p-4 text-center">
				No additional users have access to this device.
			</div>
		{:else}
			{#each ownersList as owner (owner.id)}
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
									action="?/updatePermission"
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
									<input type="hidden" name="ownerId" value={owner.id} />
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
						{#if canDelete}
							<form action="?/removeUser" method="POST" class="inline">
								<Button type="submit" variant="danger" class="ml-4">🗑️</Button>
								<input type="hidden" name="userId" value={owner.user_id} />
							</form>
						{/if}
					</div>
				</div>
			{/each}
		{/if}
	</div>
</section>
