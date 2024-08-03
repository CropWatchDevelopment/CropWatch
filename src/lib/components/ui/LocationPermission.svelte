<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from '@zerodevx/svelte-toast';
	import { mdiAccount, mdiPlus, mdiTrashCan } from '@mdi/js';
	import { PermissionNumberToName } from '$lib/utilities/permissionNumberToName';
	import { page } from '$app/stores';
	import { Button, ListItem } from 'svelte-ux';

	export let location_id: number = +$page.params.location_id;
	let permission_level: number = 3;
	let email: string = '';
	let locationPermissions = [];

	// Fetch permissions on mount
	onMount(async () => {
		await fetchPermissions();
	});

	const fetchPermissions = async () => {
		const response = await fetch(`/api/v1/locations/${location_id}/permissions`);
		if (response.ok) {
			locationPermissions = await response.json();
			sortPermissions();
		} else {
			toast.push('Failed to load permissions', {
				theme: {
					'--toastBackground': 'red',
					'--toastColor': 'black'
				}
			});
		}
	};

	const sortPermissions = () => {
		locationPermissions.sort((a, b) => {
			if (a.permission_level !== b.permission_level) {
				return a.permission_level - b.permission_level;
			}
			return a.profiles.email.localeCompare(b.profiles.email);
		});
	};

	const addPermission = async () => {
		const formData = new FormData();
		formData.append('email', email);
		formData.append('location_id', location_id.toString());
		formData.append('permission_level', permission_level.toString());

		const response = await fetch(`/api/v1/locations/${location_id}/permissions`, {
			method: 'POST',
			body: formData
		});

		if (response.ok) {
			toast.push('User Permission Added Successfully!', {
				theme: {
					'--toastBackground': 'green',
					'--toastColor': 'black'
				}
			});
			await fetchPermissions();
		} else {
			const result = await response.json();
			toast.push(result.statusText ?? 'Failed to add User Permission', {
				theme: {
					'--toastBackground': 'red',
					'--toastColor': 'black'
				}
			});
		}
	};

	const deletePermission = async (id: number) => {
		const response = await fetch(`/api/v1/locations/${location_id}/permissions?id=${id}`, {
			method: 'DELETE'
		});

		if (response.ok) {
			toast.push('User Permission Deleted Successfully!', {
				theme: {
					'--toastBackground': 'green',
					'--toastColor': 'black'
				}
			});
			locationPermissions = locationPermissions.filter((permission) => permission.id !== id);
			sortPermissions();
		} else {
			toast.push('Failed to delete User Permission', {
				theme: {
					'--toastBackground': 'red',
					'--toastColor': 'black'
				}
			});
		}
	};
</script>

<div class="flex flex-col m-4 gap-2">
	<form on:submit|preventDefault={addPermission}>
		<input type="hidden" name="location_id" value={location_id} />
		<div>
			<label for="email" class="text-surface-100">Email:</label>
			<input
				type="email"
				id="email"
				bind:value={email}
				required
				class="border rounded p-2 w-full"
			/>
		</div>
		<div>
			<label for="role" class="text-surface-100">Role:</label>
			<select id="role" bind:value={permission_level} class="border rounded p-2 w-full">
				<option value="1">Admin</option>
				<option value="2">User</option>
				<option value="3">Viewer</option>
			</select>
		</div>
		<button
			type="submit"
			class="mt-2 w-full bg-blue-500 text-white py-2 rounded flex items-center justify-center"
		>
			<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={mdiPlus} />
			</svg>
			Add Permission
		</button>
	</form>

	<p class="text-surface-100 mt-5 mb-2">The following users have access:</p>
	<ul>
		{#each locationPermissions as permission}
			{#if !permission.profiles.email.includes('cropwatch.io')}
				<ListItem
					title={permission.profiles.email}
					icon={mdiAccount}
					avatar={{ class: 'bg-surface-content/50 text-surface-100/90' }}
				>
					<div slot="subheading">
						{#if permission.permission_level === 1}
							<span class="text-red-500 font-bold"
								>{PermissionNumberToName(permission.permission_level)}</span
							>
						{:else if permission.permission_level === 2}
							<span class="text-blue-500 font-bold"
								>{PermissionNumberToName(permission.permission_level)}</span
							>
						{:else}
							<span class="text-green-500 font-bold"
								>{PermissionNumberToName(permission.permission_level)}</span
							>
						{/if}
					</div>
					<div slot="actions">
						<Button
							variant="outline"
							icon={mdiTrashCan}
							color="danger"
							on:click={() => deletePermission(permission.id)}
						/>
					</div>
				</ListItem>
			{/if}
		{/each}
	</ul>
</div>
