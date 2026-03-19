<script lang="ts">
	import {
	CwButton,
		CwCard,
		CwDataTable,
		type CwColumnDef,
		type CwTableQuery,
		type CwTableResult
	} from '@cropwatchdevelopment/cwui';
	import ReportHistoryDialog from './ReportHistoryDialog.svelte';
	import DeleteReportDialog from './DeleteReportDialog.svelte';
	import type { ReportRow } from './report-row';
	import { goto } from '$app/navigation';
	import { m } from '$lib/paraglide/messages.js';

	let { data }: { data: { reports: ReportRow[] } } = $props();
	let loading = $state(true);
	let deletedReportIds = $state<string[]>([]);

	const columns: CwColumnDef<ReportRow>[] = [
		{ key: 'name', header: m.common_name(), sortable: true },
		{ key: 'device_name', header: m.reports_for_device(), sortable: true },
		{ key: 'dev_eui', header: 'Device EUI' },
		{ key: 'location_name', header: m.nav_locations(), sortable: true }
	];

	const visibleReports = $derived.by(() => {
		const deletedIds = new Set(deletedReportIds);
		return (data.reports ?? []).filter((report) => !deletedIds.has(report.report_id));
	});

	const tableKey = $derived(
		visibleReports
			.map((report) => `${report.report_id}:${report.name}:${report.created_at}`)
			.join('|')
	);

	function handleReportDeleted(reportId: string) {
		if (deletedReportIds.includes(reportId)) return;
		deletedReportIds = [...deletedReportIds, reportId];
	}

	async function loadData(query: CwTableQuery): Promise<CwTableResult<ReportRow>> {
		void query;
		const rows = visibleReports;
		loading = false;
		return { rows, total: rows.length };
	}
</script>

<svelte:head>
	<title>{m.reports_page_title()}</title>
</svelte:head>

<CwButton variant="secondary" size="sm" onclick={() => goto('/')}>
	{m.action_back_to_dashboard()}
</CwButton>
<div class="overflow-y-auto p-4">
	<CwCard title={m.reports_weekly_reports()} class="min-h-0 flex-1 p-4">
		{#key tableKey}
			<CwDataTable
				{columns}
				{loadData}
				{loading}
				groupBy="location_name"
				rowActionsHeader="Actions"
				rowKey="id"
			>
				{#snippet cell(row: ReportRow, col: CwColumnDef<ReportRow>, defaultValue: string)}
					{#if col.key === 'device_name'}
						<a
							href={`/locations/${row.cw_devices?.cw_locations?.location_id}/devices/${row.dev_eui}`}
							class="ml-2 text-sm text-blue-500 hover:underline"
						>
							{row.cw_devices?.name ?? m.reports_unknown_device()}
						</a>
					{:else}
						{defaultValue}
					{/if}
				{/snippet}

				{#snippet rowActions(row: ReportRow)}
					<div class="flex flex-row gap-2">
						<ReportHistoryDialog dev_eui={row.dev_eui} />
						<DeleteReportDialog
							reportId={row.report_id}
							reportName={row.name}
							onDeleted={handleReportDeleted}
						/>
					</div>
				{/snippet}
			</CwDataTable>
		{/key}
	</CwCard>
</div>
