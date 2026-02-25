<script lang="ts">
	import {
		CwButton,
		CwChip,
		CwDataTable,
		type CwColumnDef,
		type CwTableResult
	} from '@cropwatchdevelopment/cwui';
	import type { ActionData, PageData } from './$types';
	import LocationEditPermissions from './LocationEditPermissions.svelte';
	import LocationPermissions from './LocationPermissions.svelte';

	let { data, form }: { data: PageData; form: ActionData | null } = $props();
	let permissions = $derived(data.permissions ?? []);

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
			{#if row.permission_level === 1}
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
        <CwButton variant="primary" onclick={() => {}}>Edit</CwButton>
        <CwButton variant="danger" onclick={() => alert(`Delete ${row.email}`)}>Delete</CwButton>
    {/snippet}
</CwDataTable>
<pre>{JSON.stringify(data.locationOwners, null, 2)}</pre>
