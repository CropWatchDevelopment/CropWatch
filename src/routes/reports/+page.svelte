<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Icon from '$lib/components/Icon.svelte';
	import { AppPage } from '$lib/components/layout';
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
	import type { ReportDeviceRelations, ReportRow } from './report-row';
	import ADD_ICON from '$lib/images/icons/add.svg';
	import EDIT_ICON from '$lib/images/icons/edit.svg';
	import { getAppContext } from '$lib/appContext.svelte';
	import { ApiService } from '$lib/api/api.service';
	import { formatDateTime } from '$lib/i18n/format';

	type ReportApiRow = ReportDeviceRelations & { created_at: string };

	let loading = $state(true);
	let deletedReportIds = $state<string[]>([]);
	let app = getAppContext();

	const columns: CwColumnDef<ReportRow>[] = [
		{ key: 'name', header: m.common_name(), sortable: true },
		{ key: 'device_name', header: m.reports_for_device(), sortable: true },
		{ key: 'dev_eui', header: m.devices_dev_eui_label() },
		{ key: 'location_name', header: m.nav_locations(), sortable: true }
	];

	const tableKey = $derived(deletedReportIds.join(','));

	function handleReportDeleted(reportId: string) {
		if (deletedReportIds.includes(reportId)) return;
		deletedReportIds = [...deletedReportIds, reportId];
	}

	function sortReports(rows: ReportRow[], column: string, direction: 'asc' | 'desc'): ReportRow[] {
		const dir = direction === 'asc' ? 1 : -1;
		return [...rows].sort((a, b) => {
			const aVal = (a as unknown as Record<string, unknown>)[column];
			const bVal = (b as unknown as Record<string, unknown>)[column];
			if (aVal == null && bVal == null) return 0;
			if (aVal == null) return dir;
			if (bVal == null) return -dir;
			return String(aVal).localeCompare(String(bVal)) * dir;
		});
	}

	async function loadData(query: CwTableQuery): Promise<CwTableResult<ReportRow>> {
		const search = query.search?.trim() || '';
		const api = new ApiService({ authToken: app.accessToken });
		const reports = await api.getReports({ name: search || undefined });

		const deletedIds = new Set(deletedReportIds);
		let rows: ReportRow[] = reports
			.map((report) => {
				const r = report as typeof report & ReportApiRow;
				const deviceOwners = r.cw_devices?.cw_device_owners ?? [];
				return {
					...r,
					permission_level:
						deviceOwners.find(
							(o) =>
								o.user_id === app.session?.sub &&
								o.permission_level != null &&
								o.permission_level <= 3
						)?.permission_level ?? null,
					created_at: formatDateTime(r.created_at),
					location_name:
						r.cw_devices?.cw_locations?.name ?? m.reports_unknown_location(),
					device_name: r.cw_devices?.name ?? m.reports_unknown_device()
				};
			})
			.filter((r) => !deletedIds.has(r.report_id));

		if (query.sort) {
			rows = sortReports(rows, query.sort.column, query.sort.direction);
		}

		const total = rows.length;
		const skip = (query.page - 1) * query.pageSize;
		rows = rows.slice(skip, skip + query.pageSize);

		loading = false;
		return { rows, total };
	}
</script>

<svelte:head>
	<title>{m.reports_page_title()}</title>
</svelte:head>

<AppPage>
	<CwButton variant="secondary" onclick={() => goto(resolve('/'))}>
		&larr; {m.action_back_to_dashboard()}
	</CwButton>

	<CwCard title={m.reports_weekly_reports()} class="min-h-0 flex-1">
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
								class="reports-page__device-link ml-2 text-sm hover:underline"
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
						{#if row.permission_level != null && row.permission_level <= 3}
							<ReportHistoryDialog report_id={row.report_id} dev_eui={row.dev_eui} />
						{/if}
						{#if row.permission_level != null && row.permission_level <= 2}
							<CwButton
								variant="secondary"
								onclick={() => {
									goto(resolve('/reports/[report_id]/edit', { report_id: row.report_id }));
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
							goto(resolve('/reports/new/edit'));
						}}
					>
						<Icon src={ADD_ICON} alt={m.reports_create_page_title()} />
					</CwButton>
				{/snippet}
			</CwDataTable>
		{/key}
	</CwCard>
</AppPage>

<style>
	.reports-page__device-link {
		color: var(--cw-info-500);
	}
</style>
