<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { backHref } from '$lib/navigation/backTo';
	import { resolve } from '$app/paths';
	import { readApiErrorMessage } from '$lib/api/api-error';
	import { ApiService } from '$lib/api/api.service';
	import { getAppContext } from '$lib/appContext.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { AppPage } from '$lib/components/layout';
	import type { ReportTemplateDto } from '$lib/api/api.dtos';
	import {
		CwButton,
		CwCard,
		CwChip,
		CwDataTable,
		type CwColumnDef,
		type CwTableQuery,
		type CwTableResult
	} from '@cropwatchdevelopment/cwui';
	import { cwDataTableLabels } from '$lib/i18n/cwuiLabels';
	import { m } from '$lib/paraglide/messages.js';
	import ADD_ICON from '$lib/images/icons/add.svg';
	import EDIT_ICON from '$lib/images/icons/edit.svg';
	import DeleteReportTemplateDialog from './DeleteReportTemplateDialog.svelte';
	import ViewReportHistoryDialog from './ViewReportHistoryDialog.svelte';

	type ReportTemplateRow = ReportTemplateDto & {
		statusLabel: string;
		locationName: string;
		assignmentSummary: string;
		recipientSummary: string;
		cadenceSummary: string;
		createdAtLabel: string;
	};

	const columns: CwColumnDef<ReportTemplateRow>[] = [
		{ key: 'name', header: m.common_name(), sortable: true },
		{ key: 'statusLabel', header: m.reports_new_status(), sortable: true },
		{ key: 'assignmentSummary', header: m.reports_new_assigned_devices() },
		{ key: 'locationName', header: m.nav_locations(), sortable: true },
		{ key: 'recipientSummary', header: m.reports_new_recipients() },
		{ key: 'cadenceSummary', header: m.reports_new_cadence() },
		{ key: 'createdAtLabel', header: m.common_created(), sortable: true }
	];

	let loading = $state(true);
	let deletedTemplateIds = $state<number[]>([]);
	let tableKey = $derived(deletedTemplateIds.join(','));
	let app = getAppContext();

	async function loadData(query: CwTableQuery): Promise<CwTableResult<ReportTemplateRow>> {
		try {
			const api = new ApiService({ authToken: app.accessToken });
			const templates = await api.getReportTemplates(
				{ search: query.search?.trim() || undefined },
				{ signal: query.signal }
			);
			const deletedIds = new Set(deletedTemplateIds);
			let rows = templates.filter((template) => !deletedIds.has(template.id)).map(toRow);

			if (query.sort) {
				rows = sortRows(rows, query.sort.column, query.sort.direction);
			}

			const total = rows.length;
			const skip = (query.page - 1) * query.pageSize;
			rows = rows.slice(skip, skip + query.pageSize);

			return { rows, total };
		} catch (error) {
			throw new Error(readApiErrorMessage(error, m.reports_new_load_failed()));
		} finally {
			loading = false;
		}
	}

	function handleDeleted(templateId: number) {
		if (deletedTemplateIds.includes(templateId)) return;
		deletedTemplateIds = [...deletedTemplateIds, templateId];
	}

	function toRow(template: ReportTemplateDto): ReportTemplateRow {
		return {
			...template,
			statusLabel: template.isActive ? m.reports_new_active() : m.reports_new_inactive(),
			locationName: summarizeLocations(template),
			assignmentSummary: summarizeAssignments(template),
			recipientSummary: summarizeRecipients(template),
			cadenceSummary: summarizeCadence(template),
			createdAtLabel: template.createdAt
				? new Date(template.createdAt).toLocaleString()
				: m.common_not_available()
		};
	}

	function summarizeLocations(template: ReportTemplateDto): string {
		const names = template.assignments
			.map((assignment) => assignment.locationName)
			.filter((name): name is string => !!name && name.trim().length > 0);
		const unique = [...new Set(names)];
		if (unique.length === 0) return m.reports_unknown_location();
		return unique.length === 1 ? unique[0] : unique.join(', ');
	}

	function summarizeAssignments(template: ReportTemplateDto): string {
		if (template.assignments.length === 0) return m.reports_new_no_assignments();

		const labels = template.assignments.map((assignment) =>
			assignment.deviceName ? `${assignment.deviceName} (${assignment.devEui})` : assignment.devEui
		);

		return summarizeList(labels);
	}

	function summarizeRecipients(template: ReportTemplateDto): string {
		if (template.recipients.length === 0) return m.common_not_available();

		return summarizeList(
			template.recipients.map(
				(recipient) => recipient.email ?? recipient.name ?? String(recipient.communicationMethod)
			)
		);
	}

	function summarizeCadence(template: ReportTemplateDto): string {
		const flags: string[] = [];
		for (const schedule of template.schedule) {
			if (!schedule.isActive) continue;
			if (schedule.endOfDay) flags.push(m.reports_new_cadence_daily());
			if (schedule.endOfWeek) flags.push(m.reports_new_cadence_weekly());
			if (schedule.endOfMonth) flags.push(m.reports_new_cadence_monthly());
		}
		const unique = [...new Set(flags)];
		return unique.length > 0 ? unique.join(', ') : m.common_not_available();
	}

	function summarizeList(items: string[]): string {
		const visible = items.slice(0, 2).join(', ');
		const remaining = items.length - 2;
		return remaining > 0
			? m.reports_new_summary_more({ summary: visible, count: String(remaining) })
			: visible;
	}

	function sortRows(
		rows: ReportTemplateRow[],
		column: string,
		direction: 'asc' | 'desc'
	): ReportTemplateRow[] {
		const dir = direction === 'asc' ? 1 : -1;

		return [...rows].sort((a, b) => {
			const left = (a as unknown as Record<string, unknown>)[column];
			const right = (b as unknown as Record<string, unknown>)[column];

			if (typeof left === 'number' && typeof right === 'number') {
				return (left - right) * dir;
			}

			return String(left ?? '').localeCompare(String(right ?? '')) * dir;
		});
	}
</script>

<svelte:head>
	<title>{m.reports_new_page_title()}</title>
</svelte:head>

<AppPage>
	<CwButton id="reports-back-button" variant="secondary" onclick={() => goto(backHref(page.url, resolve('/')))}>
		&larr; {m.action_back_to_dashboard()}
	</CwButton>

	<CwCard title={m.reports_new_configured_templates()}>
		{#key tableKey}
			<CwDataTable
				id="reports-table"
				labels={cwDataTableLabels()}
				{columns}
				{loadData}
				{loading}
				groupBy="locationName"
				rowActionsHeader={m.common_actions()}
				rowKey="id"
			>
				{#snippet cell(
					row: ReportTemplateRow,
					col: CwColumnDef<ReportTemplateRow>,
					defaultValue: string
				)}
					{#if col.key === 'statusLabel'}
						<CwChip
							label={row.statusLabel}
							tone={row.isActive ? 'success' : 'warning'}
							variant="soft"
							size="sm"
						/>
					{:else}
						{defaultValue}
					{/if}
				{/snippet}

				{#snippet rowActions(row: ReportTemplateRow)}
					<div class="reports-new-page__actions">
						<CwButton
							id={`reports-row-${row.id}-edit-button`}
							variant="secondary"
							size="md"
							onclick={() => goto(resolve('/reports/edit/[id]', { id: String(row.id) }))}
						>
							<Icon src={EDIT_ICON} alt={m.action_edit()} />
						</CwButton>
						<ViewReportHistoryDialog templateId={row.id} reportName={row.name} />
						<DeleteReportTemplateDialog
							templateId={row.id}
							reportName={row.name}
							onDeleted={handleDeleted}
						/>
					</div>
				{/snippet}

				{#snippet toolbarActions()}
					<CwButton id="reports-add-button" variant="primary" onclick={() => goto(resolve('/reports/create'))}>
						<Icon src={ADD_ICON} alt={m.reports_new_create_template()} />
					</CwButton>
				{/snippet}
			</CwDataTable>
		{/key}
	</CwCard>
</AppPage>

<style>
	.reports-new-page__actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--cw-space-2);
	}
</style>
