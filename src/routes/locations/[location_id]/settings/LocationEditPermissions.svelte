<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { invalidateAll } from '$app/navigation';
	import {
		CwButton,
		CwDataTable,
		CwDropdown,
		type CwColumnDef,
		type CwTableResult,
		type CwTableQuery
	} from '@cropwatchdevelopment/cwui';
	import type { LocationOwnerDto } from '$lib/api/api.dtos';
	import { getPermissionLevelLabel, getPermissionLevelOptions } from '$lib/i18n/options';
	import { m } from '$lib/paraglide/messages.js';
	import DeletePermissionDialog from './DeletePermissionDialog.svelte';
	import { page } from '$app/state';
	import EDIT_ICON from '$lib/images/icons/edit.svg';
	import {
		mapLocationOwnersToPermissionRows,
		type PermissionRow as Permission
	} from './location-permission-rows';

	let { data }: { data: { locationOwners: LocationOwnerDto[] } } = $props();
	let permissions = $derived(mapLocationOwnersToPermissionRows(data.locationOwners));
	let openDeletePermissionDialog = $state(false);
	let selectedRow = $state<Permission | null>(null);
	let location_id = $state(page.params.location_id);
	let editingPermissionId = $state<number | null>(null);
	let permissionsKey = $derived(
		permissions
			.map(
				(permission) =>
					`${permission.id}:${permission.email}:${permission.name}:${permission.permission_level}`
			)
			.join('|')
	);

	const loadData = async (query: CwTableQuery): Promise<CwTableResult<Permission>> => {
		void query;
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
			await invalidateAll();
		}
		editingPermissionId = null;
	};
</script>

{#key permissionsKey}
	<CwDataTable
		{loadData}
		rowKey="id"
		rowActionsHeader="Actions"
		columns={[
			{ key: 'id', header: 'ID' },
			{ key: 'email', header: m.auth_email_label() },
			{ key: 'name', header: m.common_name() },
			{ key: 'permission_level', header: m.locations_permission_level() }
		]}
	>
		{#snippet cell(row: Permission, col: CwColumnDef<Permission>, defaultValue: string)}
			{#if col.key === 'permission_level'}
				{#if editingPermissionId === row.id}
					<CwDropdown
						options={getPermissionLevelOptions(m.permission_level_viewer())}
						bind:value={row.permission_level}
						placeholder={m.locations_choose_permission_level()}
					/>
				{:else}
					{getPermissionLevelLabel(row.permission_level, m.permission_level_viewer())}
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
					}}>{m.action_save_changes()}</CwButton
				>
				<CwButton
					variant="danger"
					onclick={() => {
						selectedRow = row;
						openDeletePermissionDialog = true;
					}}>{m.action_delete()}</CwButton
				>
				<CwButton
					variant="primary"
					onclick={() => {
						selectedRow = null;
						editingPermissionId = null;
					}}>{m.action_cancel()}</CwButton
				>
			{:else}
				<CwButton
					variant="primary"
					onclick={() => {
						editingPermissionId = row.id;
					}}
				>
					<Icon src={EDIT_ICON} alt={m.action_edit()} />
				</CwButton>
			{/if}
		{/snippet}
	</CwDataTable>
{/key}

<DeletePermissionDialog bind:openDeletePermissionDialog {location_id} {selectedRow} />
