<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { formValidation } from '$lib/actions/formValidation';
	import Button from '$lib/components/UI/buttons/Button.svelte';
	import Select from '$lib/components/UI/form/Select.svelte';
	import Dialog from '$lib/components/UI/overlay/Dialog.svelte';
	import type { DeviceWithType } from '$lib/models/Device';
	import type { LocationUser } from '$lib/models/LocationUser';
	import { error as errorToast, success as successToast } from '$lib/stores/toast.svelte';
	import MaterialIcon from '../icons/MaterialIcon.svelte';

	type Props = {
		data: { device?: DeviceWithType; ownerId: string };
		ownerList: LocationUser[];
		canDelete: boolean;
	};

	let { data, ownerList, canDelete = false }: Props = $props();
	let device = $derived(data.device);
	let currentUserId = $derived(data.ownerId);
	let showingRemoveConfirmation = $state(false);
	let updatingUser: boolean = $state(false);
	let updatingUserId: string | undefined = $state();
	let removingUser: boolean = $state(false);
	let removingUserId: string | undefined = $state();

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
			ownerList.some(
				(owner) => owner.user_id === currentUserId && (owner.permission_level as number) <= 1 // Admin level or higher
			)
		);
	}

	const removeUser = async () => {
		removingUser = true;

		try {
			const formData = new FormData();

			formData.append('userId', removingUserId as string);

			const response = await fetch('?/removeUser', { method: 'POST', body: formData });

			if (response.ok) {
				await invalidateAll();
				successToast('User removed successfully');
			} else {
				errorToast('An error occurred while removing the user');
			}
		} catch {
			errorToast('An error occurred while removing the user');
		}

		removingUser = false;
	};
</script>

<section class="form-container bg-card !gap-0 rounded-lg">
	<div class="border-b border-gray-300 pb-4 dark:border-neutral-400">
		<h3 class="text-lg font-semibold">Current Users</h3>
	</div>
	<div class="divide-y">
		{#if !ownerList || ownerList?.length === 0}
			<div class="text-muted-foreground p-4 text-center">
				No additional users have access to this device.
			</div>
		{:else}
			{#each ownerList as owner (owner.id)}
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
									use:enhance={() => {
										updatingUserId = owner.user_id;
										updatingUser = true;

										return async ({ result, update }) => {
											if (result.type === 'success' && result.data?.success) {
												await update({ invalidateAll: true });
												successToast(
													(result.data as any).message || 'Permission updated successfully'
												);
											} else if (result.type === 'success' && result.data?.error) {
												errorToast((result.data as any).error);
											} else {
												errorToast('Failed to update permission');
											}

											updatingUser = false;
										};
									}}
									use:formValidation
								>
									<input type="hidden" name="ownerId" value={owner.id} />
									{#if updatingUser && updatingUserId === owner.user_id}
										Updating...
									{:else}
										<Select
											name="permissionLevel"
											required
											onchange={(e) => {
												const form = (e.currentTarget as HTMLElement)?.closest('form');
												if (form) form.requestSubmit();
											}}
										>
											{#each Object.entries(PERMISSION_LEVELS) as [level, name]}
												<option value={level} selected={owner.permission_level == parseInt(level)}>
													{name}
												</option>
											{/each}
										</Select>
									{/if}
									<button type="submit" class="hidden" aria-hidden="true">Update</button>
								</form>
							</div>
						{:else}
							<span
								class="bg-primary/60 dark:bg-primary/30 text-gray rounded px-3 py-1 text-sm dark:text-white"
							>
								{getPermissionName(owner.permission_level as number)}
							</span>
						{/if}
						{#if canDelete}
							{@const disabled = removingUser && removingUserId === owner.user_id}
							<Button
								type="submit"
								variant="secondary"
								iconic
								{disabled}
								onclick={(event) => {
									event.preventDefault();
									showingRemoveConfirmation = true;
									removingUserId = owner.user_id;
								}}
							>
								{#if disabled}
									Removing...
								{:else}
									<MaterialIcon name="delete" />
								{/if}
							</Button>
						{/if}
					</div>
				</div>
			{/each}
		{/if}
	</div>
</section>

<Dialog bind:open={showingRemoveConfirmation}>
	{#snippet title()}
		Remove User
	{/snippet}
	{#snippet body()}
		Are you sure you want to remove this user?
	{/snippet}
	{#snippet footer()}
		<Button
			variant="secondary"
			onclick={() => {
				showingRemoveConfirmation = false;
			}}
		>
			Cancel
		</Button>
		<Button
			variant="danger"
			onclick={() => {
				showingRemoveConfirmation = false;
				removeUser();
			}}
		>
			Remove
		</Button>
	{/snippet}
</Dialog>
