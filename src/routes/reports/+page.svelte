<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Icon from '$lib/components/Icon.svelte';
	import {
		CwButton,
		CwCard,
		CwDataTable,
		type CwColumnDef,
		type CwTableQuery,
		type CwTableResult
	} from '@cropwatchdevelopment/cwui';
	import { m } from '$lib/paraglide/messages.js';
	import ReportHistoryDialog from './ReportHistoryDialog.svelte';
	import DeleteReportDialog from './DeleteReportDialog.svelte';
	import type { ReportRow } from './report-row';
	import ADD_ICON from '$lib/images/icons/add.svg';
	import EDIT_ICON from '$lib/images/icons/edit.svg';
	import { getAppContext } from '$lib/appContext.svelte';

	let { data }: { data: { reports: ReportRow[] } } = $props();
	let loading = $state(true);
	let deletedReportIds = $state<string[]>([]);
	let app = getAppContext();

	const columns: CwColumnDef<ReportRow>[] = [
		{ key: 'name', header: m.common_name(), sortable: true },
		{ key: 'device_name', header: m.reports_for_device(), sortable: true },
		{ key: 'dev_eui', header: m.devices_dev_eui_label() },
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

<CwButton variant="secondary" fullWidth={true} class="mt-2" onclick={() => goto('/')}>
	&larr; {m.action_back_to_dashboard()}
</CwButton>
<div class="overflow-y-auto p-4">
	<CwCard title={m.reports_weekly_reports()} class="min-h-0 flex-1 p-4">
		{#key tableKey}
			<CwDataTable
				{columns}
				{loadData}
				{loading}
				groupBy="location_name"
				rowActionsHeader={m.common_actions()}
				rowKey="id"
			>
				{#snippet cell(row: ReportRow, col: CwColumnDef<ReportRow>, defaultValue: string)}
					{#if col.key === 'device_name'}
						{#if row.cw_devices?.cw_locations?.location_id}
							<a
								href={resolve('/locations/[location_id]/devices/[dev_eui]', {
									location_id: String(row.cw_devices.cw_locations.location_id),
									dev_eui: row.dev_eui
								})}
								class="ml-2 text-sm text-[color:var(--cw-info-500,#0ea5e9)] hover:underline"
							>
								{row.cw_devices?.name ?? m.reports_unknown_device()}
							</a>
						{:else}
							<span class="ml-2 text-sm">{row.cw_devices?.name ?? m.reports_unknown_device()}</span>
						{/if}
					{:else}
						{defaultValue}
					{/if}
				{/snippet}

				{#snippet rowActions(row: ReportRow)}
					<div class="flex flex-row gap-2">
						{#if row.permission_level <= 3}
							<ReportHistoryDialog report_id={row.report_id} dev_eui={row.dev_eui} />
						{/if}
						{#if row.permission_level <= 2}
							<CwButton
								variant="secondary"
								onclick={() => {
									goto(`/reports/${row.report_id}/edit`);
								}}
							>
								<Icon src={EDIT_ICON} alt="Edit" />
							</CwButton>
						{/if}
						{#if row.user_id === app.session?.sub}
							<DeleteReportDialog
								reportId={row.report_id}
								reportName={row.name}
								onDeleted={handleReportDeleted}
							/>
						{/if}
					</div>
				{/snippet}

				{#snippet toolbarActions()}
					<CwButton
						variant="secondary"
						onclick={() => {
							goto(resolve('/reports/create'));
						}}
					>
						<Icon src={ADD_ICON} alt={m.reports_create_page_title()} />
					</CwButton>
				{/snippet}
			</CwDataTable>
		{/key}
	</CwCard>
</div>
