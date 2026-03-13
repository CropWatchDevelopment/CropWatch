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
	let loading = $state(true);

	const columns: CwColumnDef<RulesDto>[] = [
		{ key: 'name', header: 'Name', sortable: true, width: '5rem' },
		{ key: 'dev_eui', header: 'Device EUI', width: '5rem' },
		{ key: 'created_at', header: 'Created', width: '5rem' }
	];

	async function loadData(query: CwTableQuery): Promise<CwTableResult<RulesDto>> {
		const rows = data.rules ?? [];
		loading = false;
		return { rows, total: rows.length };
	}
</script>

<div class="overflow-y-auto p-4">
<CwCard title="Configured Rules" class="min-h-0 flex-1">
	<CwDataTable {columns} {loadData} {loading} rowActionsHeader="Actions" rowKey="id" class="w-full">
		{#snippet rowActions(row: RulesDto)}
			<div style="display:flex; gap:0.5rem; justify-content:flex-end;">
				<CwButton
					variant="info"
					onclick={() => {
						goto(`/rules/${row.id}`);
					}}
				>
					<img src={EYE_ICON} alt="View Rule" /> View
				</CwButton>
				<CwButton
					variant="primary"
					onclick={() => {
						goto(`/rules/edit/${row.id}`);
					}}
				>
					<img src={EDIT_ICON} alt="edit" /> Edit
				</CwButton>
			</div>
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
