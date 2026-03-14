<script lang="ts">
	import {
		CwButton,
		CwCard,
		CwDataTable,
		type CwColumnDef,
		type CwTableQuery,
		type CwTableResult
	} from '@cropwatchdevelopment/cwui';
	import { goto } from '$app/navigation';
	import type { RulesDto } from '$lib/interfaces/rule.interface';
	import EYE_ICON from '$lib/images/icons/eye.svg';
	import EDIT_ICON from '$lib/images/icons/edit.svg';

	let { data }: { data: { rules: RulesDto[] } } = $props();
	let loading = $state(false);

	const columns: CwColumnDef<RulesDto>[] = [
		{ key: 'name', header: 'Name', sortable: true },
		{ key: 'dev_eui', header: 'Device EUI' },
		{ key: 'created_at', header: 'Created' }
	];

	async function loadData(query: CwTableQuery): Promise<CwTableResult<RulesDto>> {
		void query;
		const rows = data.rules ?? [];
		return { rows, total: rows.length };
	}
</script>

<Svelte:head>
	<title>Rules - CropWatch</title>
</Svelte:head>

<div class="overflow-y-auto p-4">
<CwCard title="Configured Rules" class="min-h-0 flex-1">
	<CwDataTable {columns} {loadData} {loading} rowActionsHeader="Actions" rowKey="id" class="w-full">
		{#snippet rowActions(row: RulesDto)}
			<CwButton
				variant="info"
				size="md"
				onclick={() => goto(`/rules/${row.id}`)}
			>
				<img src={EYE_ICON} alt="View Rule" width="24" height="24" />
			</CwButton>
			<CwButton
				variant="primary"
				size="md"
				onclick={() => goto(`/rules/edit/${row.id}`)}
			>
				<img src={EDIT_ICON} alt="Edit Rule" width="24" height="24" />
			</CwButton>
		{/snippet}
		{#snippet toolbarActions()}
			<CwButton
				variant="primary"
				onclick={() => {
					goto('/rules/create');
				}}
			>
				Create New Rule
			</CwButton>
		{/snippet}
	</CwDataTable>
</CwCard>
</div>
