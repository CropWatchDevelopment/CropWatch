<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { applyAction, deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import {
		CwButton,
		CwDataTable,
		CwDropdown,
		useCwToast,
		type CwColumnDef,
		type CwTableResult,
		type CwTableQuery
	} from '@cropwatchdevelopment/cwui';
	import { cwDataTableLabels, cwDropdownLabels } from '$lib/i18n/cwuiLabels';
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
	const toast = useCwToast();
	// CropWatch staff rows are filtered out server-side (the API omits
	// @cropwatch.io owners for non-staff requesters), so no client filter here.
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
		try {
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
			// A refused action still answers HTTP 200: only the result says how it went.
			const result = deserialize(await response.text());
			if (result.type === 'success') {
				await invalidateAll();
				editingPermissionId = null;
				return;
			}

			await applyAction(result);
			if (result.type === 'failure') {
				const message = result.data?.message;
				toast.add({
					tone: 'danger',
					message:
						typeof message === 'string' && message.trim()
							? message.trim()
							: m.locations_user_permission_level_update_failed()
				});
			}
		} catch (error) {
			console.error('Error updating permission level:', error);
			toast.add({ tone: 'danger', message: m.locations_user_permission_level_update_failed() });
		}
		// Not saved: the row stays in edit mode, to retry or cancel.
	};
</script>

{#key permissionsKey}
	<CwDataTable
		id="location-edit-permissions-table"
		labels={cwDataTableLabels()}
		{loadData}
		rowKey="id"
		rowActionsHeader={m.common_actions()}
		columns={[
			{ key: 'id', header: m.common_id() },
			{ key: 'email', header: m.auth_email_label() },
			{ key: 'name', header: m.common_name() },
			{ key: 'permission_level', header: m.locations_permission_level() }
		]}
	>
		{#snippet cell(row: Permission, col: CwColumnDef<Permission>, defaultValue: string)}
			{#if col.key === 'permission_level'}
				{#if editingPermissionId === row.id}
					<CwDropdown
						labels={cwDropdownLabels()}
						id={`location-edit-permissions-row-${row.id}-level-select`}
						options={getPermissionLevelOptions()}
						bind:value={row.permission_level}
						placeholder={m.locations_choose_permission_level()}
					/>
				{:else}
					{getPermissionLevelLabel(row.permission_level)}
				{/if}
			{:else}
				{defaultValue}
			{/if}
		{/snippet}
		{#snippet rowActions(row: Permission)}
			<span class="flex flex-row gap-2">
				{#if editingPermissionId === row.id}
					<CwButton
						id={`location-edit-permissions-row-${row.id}-save-button`}
						variant="primary"
						onclick={() => {
							savePermissionLevelUpdate(row);
						}}>{m.action_save_changes()}</CwButton
					>
					<CwButton
						id={`location-edit-permissions-row-${row.id}-delete-button`}
						variant="danger"
						onclick={() => {
							selectedRow = row;
							openDeletePermissionDialog = true;
						}}>{m.action_delete()}</CwButton
					>
					<CwButton
						id={`location-edit-permissions-row-${row.id}-cancel-button`}
						variant="primary"
						onclick={() => {
							selectedRow = null;
							editingPermissionId = null;
						}}>{m.action_cancel()}</CwButton
					>
				{:else}
					<CwButton
						id={`location-edit-permissions-row-${row.id}-edit-button`}
						variant="primary"
						onclick={() => {
							editingPermissionId = row.id;
						}}
					>
						<Icon src={EDIT_ICON} alt={m.action_edit()} />
					</CwButton>
				{/if}
			</span>
		{/snippet}
	</CwDataTable>
{/key}

<DeletePermissionDialog bind:openDeletePermissionDialog {location_id} {selectedRow} />
