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

	let { data }: { data: { rules: RulesDto[] } } = $props();
    let loading = $state(true);

	const columns: CwColumnDef<RulesDto>[] = [
		{ key: 'name', header: 'Name', sortable: true },
		{ key: 'dev_eui', header: 'Device EUI' },
		{ key: 'created_at', header: 'Created' }
	];

	async function loadData(query: CwTableQuery): Promise<CwTableResult<RulesDto>> {
		const rows = data.rules ?? [];
        loading = false;
		return { rows, total: rows.length };
	}
</script>

<CwCard title="Configured Rules" class="min-h-0 flex-1 p-4">
	<CwDataTable {columns} {loadData} {loading} actionsHeader="Actions" rowKey="id">
		{#snippet rowActions(row: RulesDto)}
			<CwButton
                class="mr-2"
                size="sm"
                variant="info"
                onclick={() => {
                    goto(`/rules/${row.id}`);
                }}
            >
                Details
            </CwButton>
            <CwButton
                size="sm"
                variant="primary"
                onclick={() => {
                    goto(`/rules/edit/${row.id}`);
                }}
            >
                Edit
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
