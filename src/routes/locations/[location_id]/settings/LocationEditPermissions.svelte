<script lang="ts">
	import {
		CwButton,
		CwChip,
		CwDataTable,
		CwDialog,
		CwDropdown,
		type CwColumnDef,
		type CwTableResult,
		type CwTableQuery
	} from '@cropwatchdevelopment/cwui';
	import type { LocationOwnerDto } from '$lib/api/api.dtos';
	import DeletePermissionDialog from './DeletePermissionDialog.svelte';
	import { page } from '$app/state';

	interface Permission {
		id: number;
		email: string;
		name: string;
		permission_level: string;
	}

	interface SettingsPageData {
		locationId: number | null;
		locationName: string;
		locationOwners: LocationOwnerDto[];
		permissions?: Permission[];
		[key: string]: unknown;
	}

	let { data, form }: { data: SettingsPageData; form: Record<string, unknown> | null } = $props();
	let permissions = $derived(data.permissions ?? []);
	let openDeletePermissionDialog = $state(false);
	let selectedRow = $state<Permission | null>(null);
	let location_id = $state(page.params.location_id);
	let editingPermissionId = $state<number | null>(null);

	const loadData = async (_query: CwTableQuery): Promise<CwTableResult<Permission>> => {
		data.permissions =
			data.locationOwners?.map((owner) => {
				const profiles = owner.profiles as { email?: string; full_name?: string } | undefined;
				return {
					id: owner.id,
					email: profiles?.email ?? '',
					name: profiles?.full_name ?? '',
					permission_level: String(owner.permission_level ?? 4)
				};
			}) ?? [];

		return {
			rows: permissions,
			total: permissions.length
		};
	};

	const savePermissionLevelUpdate = async (row: Permission) => {
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
			await loadData({} as CwTableQuery);
		} else {
		}
		editingPermissionId = null;
	};
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
>
	{#snippet cell(row: Permission, col: CwColumnDef<Permission>, defaultValue: string)}
		{#if col.key === 'permission_level'}
			{#if editingPermissionId === row.id}
				<CwDropdown
					options={[
						{ label: 'Admin', value: '1' },
						{ label: 'Manager', value: '2' },
						{ label: 'Viewer', value: '3' },
						{ label: 'Disabled', value: '4' }
					]}
					bind:value={row.permission_level}
					placeholder="Choose a permission level…"
				/>
			{:else if row.permission_level === '1'}
				Admin
			{:else if row.permission_level === '2'}
				Manager
			{:else if row.permission_level === '3'}
				Viewer
			{:else}
				Disabled
			{/if}
		{:else}
			{defaultValue}
		{/if}
	{/snippet}
	{#snippet rowActions(row: Permission)}
		{#if editingPermissionId === row.id}
			<CwButton
				variant="primary"
				onclick={() => {
					savePermissionLevelUpdate(row);
				}}>Save Changes</CwButton
			>
			<CwButton
				variant="danger"
				onclick={() => {
					selectedRow = row;
					openDeletePermissionDialog = true;
				}}>Delete</CwButton
			>
			<CwButton
				variant="primary"
				onclick={() => {
					selectedRow = null;
					editingPermissionId = null;
				}}>Cancel</CwButton
			>
		{:else}
			<CwButton
				variant="primary"
				onclick={() => {
					editingPermissionId = row.id;
				}}>Edit</CwButton
			>
		{/if}
	{/snippet}
</CwDataTable>

<DeletePermissionDialog bind:openDeletePermissionDialog {location_id} {selectedRow} />
