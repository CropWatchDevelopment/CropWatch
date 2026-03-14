<script lang="ts">
	import {
		CwButton,
		CwCard,
		CwDataTable,
		type CwColumnDef,
		type CwTableQuery,
		type CwTableResult
	} from '@cropwatchdevelopment/cwui';
	import type { ReportDto } from '$lib/api/api.dtos';
	import { goto } from '$app/navigation';
	import ReportHistoryDialog from './ReportHistoryDialog.svelte';

	let { data }: { data: { reports: ReportDto[] } } = $props();
	let loading = $state(true);

	const columns: CwColumnDef<ReportDto>[] = [
		{ key: 'name', header: 'Name', sortable: true },
		{ key: 'dev_eui', header: 'Device EUI' },
		{ key: 'created_at', header: 'Created' }
	];

	async function loadData(query: CwTableQuery): Promise<CwTableResult<ReportDto>> {
		const rows = data.reports ?? [];
		loading = false;
		return { rows, total: rows.length };
	}
</script>

<svelte:head>
	<title>Reports - CropWatch</title>
</svelte:head>

<CwCard title="Weekly Reports" class="min-h-0 flex-1 p-4">
	<div class="overflow-y-scroll">
		<CwDataTable {columns} {loadData} {loading} rowActionsHeader="Actions" rowKey="id">
			{#snippet rowActions(row: ReportDto)}
				<ReportHistoryDialog dev_eui={row.dev_eui} />
			{/snippet}
		</CwDataTable>
	</div>
</CwCard>
