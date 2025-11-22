<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { formValidation } from '$lib/actions/formValidation';
	import Button from '$lib/components/UI/buttons/Button.svelte';
	import Select from '$lib/components/UI/form/Select.svelte';
	import TextInput from '$lib/components/UI/form/TextInput.svelte';
	import { error as errorToast, success as successToast } from '$lib/stores/toast.svelte';
	import type { ActionResult } from '@sveltejs/kit';
	import { _ } from 'svelte-i18n';

	type NewUserFormDataProps = {
		email: string;
		permission: string; // Cannot be number
		allDevices: boolean;
	};

	const newUserFormDataPlaceholder: NewUserFormDataProps = {
		email: '',
		permission: '3', // Default to Viewer
		allDevices: false
	};

	const permissionMap: Record<string, string> = {
		1: 'Admin',
		2: 'User',
		3: 'Viewer',
		4: 'Disabled'
	};

	let { deviceCount } = $props<{ deviceCount: number }>();

	let newUserFormData: NewUserFormDataProps = $state({ ...newUserFormDataPlaceholder });
	let addingUser = $state(false);

	const handleAddUserSuccess = async (result: ActionResult) => {
		if (result.type === 'success') {
			if (result.data?.success) {
				// Refresh the page data to show updated user list
				await invalidateAll();
				newUserFormData = { ...newUserFormDataPlaceholder };
				successToast('User added successfully');
			} else {
				errorToast((result.data?.error as string) || 'Failed to add user');
			}
		} else {
			errorToast('An error occurred');
		}

		addingUser = false;
	};
</script>

<div class="mt-6">
	<h3 class="mb-2 text-lg font-medium">{$_('Add New User')}</h3>

	<form
		method="POST"
		action="?/addUser"
		class="form-container !grid w-full grid-cols-1 gap-4 xl:grid-cols-2"
		use:enhance={() => {
			addingUser = true;

			return ({ result }) => {
				handleAddUserSuccess(result);
			};
		}}
		use:formValidation
	>
		<div>
			<label for="email" class="mb-1 block font-medium">{$_('Email Address')}</label>
			<TextInput
				type="email"
				id="email"
				name="email"
				required
				placeholder="user@example.com"
				class="w-full"
				bind:value={newUserFormData.email}
			/>
		</div>

		<div>
			<label for="permissionLevel" class="mb-1 block font-medium">{$_('Permission Level')}</label>
			<Select
				id="permissionLevel"
				name="permissionLevel"
				required
				class="border-border w-full rounded-md px-3 py-2"
				bind:value={newUserFormData.permission}
			>
				{#each Object.entries(permissionMap) as [level, label]}
					<option value={level}>{label}</option>
				{/each}
			</Select>
			<p class="text-text-muted mt-1 text-sm">
				<strong>{$_('Admin:')}</strong>
				{$_('Full control over location and devices')}<br />
				<strong>{$_('User:')}</strong>
				{$_('Can use and configure devices')}<br />
				<strong>{$_('Viewer:')}</strong>
				{$_('Can only view data')}<br />
				<strong>{$_('Disabled:')}</strong>
				{$_('No access')}
			</p>
		</div>

		<div>
			<label class="flex items-center gap-2">
				<input
					type="checkbox"
					name="applyToDevices"
					value="true"
					bind:checked={newUserFormData.allDevices}
				/>
				<span>
					{$_('Apply same permission to all devices in this location')} (x{deviceCount} devices)
				</span>
			</label>
			<p class="mt-1 text-sm text-gray-500">
				{$_('If unchecked, user will be added with "Disabled" permission to all devices.')}
			</p>
		</div>

		<div>
			<Button variant="primary" type="submit" disabled={addingUser || !newUserFormData.email}>
				{addingUser ? $_('Adding...') : $_('Add User')}
			</Button>
		</div>
	</form>
</div>
