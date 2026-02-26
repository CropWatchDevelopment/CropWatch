<script lang="ts">
	import {
		CwButton,
		CwChip,
		CwDataTable,
		CwDialog,
		CwDropdown,
		type CwColumnDef,
		type CwTableResult
	} from '@cropwatchdevelopment/cwui';
	import type { ActionData, PageData } from './$types';
	import DeletePermissionDialog from './DeletePermissionDialog.svelte';
	import { page } from '$app/state';

	let { data, form }: { data: PageData; form: ActionData | null } = $props();
	let permissions = $derived(data.permissions ?? []);
	let openDeletePermissionDialog = $state(false);
	let selectedRow = $state<any>(null);
	let location_id = $state(page.params.location_id);
	let editingPermissionId = $state<number | null>(null);

	const loadData = async (): Promise<CwTableResult> => {
		data.permissions =
			data.locationOwners?.map((owner) => ({
				id: owner.id,
				email: owner.profiles?.email,
				name: owner.profiles?.full_name,
				permission_level: owner.permission_level
			})) ?? [];

		return {
			rows: permissions,
			total: permissions.length
		};
	};

	const savePermissionLevelUpdate = async (row) => {
		const response = await fetch(`?/updateUserPermissionLevel`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: new URLSearchParams({
				permission_level: String(row.permission_level),
				email: String(row.email),
				location_id: String(location_id)
			})
		});

		if (response.ok) {
			// Optionally, you can reload the permissions data here to reflect any changes from the server
			await loadData();
		} else {
			
		}
		editingPermissionId = null;
	}
</script>

<CwDataTable
	{loadData}
	rowKey="id"
	columns={[
		{ key: 'id', header: 'ID' },
		{ key: 'email', header: 'Email' },
		{ key: 'name', header: 'Name' },
		{ key: 'permission_level', header: 'Permission Level' }
	]}
	rows={permissions}
>
	{#snippet cell(row: any, col: CwColumnDef<any>, defaultValue: string)}
		{#if col.key === 'permission_level'}
			{#if editingPermissionId === row.id}
				<CwDropdown
					options={[
						{ label: 'Admin', value: 1 },
						{ label: 'Manager', value: 2 },
						{ label: 'Viewer', value: 3 },
						{ label: 'Disabled', value: 4 }
					]}
					bind:value={row.permission_level}
					placeholder="Choose a permission level…"
				/>
			{:else if row.permission_level === 1}
				Admin
			{:else if row.permission_level === 2}
				Manager
			{:else if row.permission_level === 3}
				Viewer
			{:else}
				Disabled
			{/if}
		{:else}
			{defaultValue}
		{/if}
	{/snippet}
	{#snippet rowActions(row: any)}
		{#if editingPermissionId === row.id}
			<CwButton
				variant="primary"
				onclick={() => {
					savePermissionLevelUpdate(row);
				}}>Save Changes</CwButton
			>
		{:else}
			<CwButton
				variant="primary"
				onclick={() => {
					editingPermissionId = row.id;
				}}>Edit</CwButton
			>
		{/if}

		<CwButton
			variant="danger"
			onclick={() => {
				selectedRow = row;
				openDeletePermissionDialog = true;
			}}>Delete</CwButton
		>
	{/snippet}
</CwDataTable>

<DeletePermissionDialog bind:openDeletePermissionDialog {location_id} {selectedRow} />
