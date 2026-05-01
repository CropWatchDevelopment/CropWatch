<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Icon from '$lib/components/Icon.svelte';
	import { AppPage } from '$lib/components/layout';
	import { listRuleTemplates, readRuleTemplateApiError } from '$lib/rules-new/rule-template-client';
	import type { RuleTemplateDto } from '$lib/rules-new/rule-template.types';
	import { getRuleSubjectOptions, getRuleTemplateActionTypeOptions } from '$lib/i18n/options';
	import {
		CwButton,
		CwCard,
		CwChip,
		CwDataTable,
		type CwColumnDef,
		type CwTableQuery,
		type CwTableResult
	} from '@cropwatchdevelopment/cwui';
	import { m } from '$lib/paraglide/messages.js';
	import ADD_ICON from '$lib/images/icons/add.svg';
	import EDIT_ICON from '$lib/images/icons/edit.svg';
	import DeleteRuleTemplateDialog from './DeleteRuleTemplateDialog.svelte';

	type RuleTemplateRow = RuleTemplateDto & {
		statusLabel: string;
		assignmentSummary: string;
		criteriaSummary: string;
		actionSummary: string;
		createdAtLabel: string;
		triggeredCount: number;
	};

	const SUBJECT_OPTIONS = getRuleSubjectOptions();
	const ACTION_TYPE_OPTIONS = getRuleTemplateActionTypeOptions();
	const columns: CwColumnDef<RuleTemplateRow>[] = [
		{ key: 'name', header: m.common_name(), sortable: true },
		{ key: 'statusLabel', header: m.rules_new_status(), sortable: true },
		{ key: 'assignmentSummary', header: m.rules_new_assigned_devices() },
		{ key: 'criteriaSummary', header: m.rules_conditions() },
		{ key: 'actionSummary', header: m.rules_new_actions() },
		{ key: 'triggeredCount', header: m.rules_new_triggered_devices(), sortable: true },
		{ key: 'createdAtLabel', header: m.common_created(), sortable: true }
	];

	let loading = $state(true);
	let deletedTemplateIds = $state<number[]>([]);
	let tableKey = $derived(deletedTemplateIds.join(','));

	async function loadData(query: CwTableQuery): Promise<CwTableResult<RuleTemplateRow>> {
		try {
			const templates = await listRuleTemplates(
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
			throw new Error(readRuleTemplateApiError(error, m.rules_new_load_failed()));
		} finally {
			loading = false;
		}
	}

	function handleDeleted(templateId: number) {
		if (deletedTemplateIds.includes(templateId)) return;
		deletedTemplateIds = [...deletedTemplateIds, templateId];
	}

	function toRow(template: RuleTemplateDto): RuleTemplateRow {
		const triggeredCount = template.assignments.filter(
			(assignment) => assignment.state?.isTriggered
		).length;

		return {
			...template,
			statusLabel: template.isActive ? m.rules_new_active() : m.rules_new_inactive(),
			assignmentSummary: summarizeAssignments(template),
			criteriaSummary: summarizeCriteria(template),
			actionSummary: summarizeActions(template),
			createdAtLabel: template.createdAt
				? new Date(template.createdAt).toLocaleString()
				: m.common_not_available(),
			triggeredCount
		};
	}

	function summarizeAssignments(template: RuleTemplateDto): string {
		if (template.assignments.length === 0) return m.rules_new_no_assignments();

		const labels = template.assignments.map((assignment) =>
			assignment.deviceName ? `${assignment.deviceName} (${assignment.devEui})` : assignment.devEui
		);

		return summarizeList(labels);
	}

	function summarizeCriteria(template: RuleTemplateDto): string {
		if (template.criteria.length === 0) return m.common_not_available();

		return summarizeList(
			template.criteria.map((criterion) => {
				const subjectLabel =
					SUBJECT_OPTIONS.find((option) => option.value === criterion.subject)?.label ??
					criterion.subject;
				return `${subjectLabel} ${criterion.operator} ${criterion.triggerValue}`;
			})
		);
	}

	function summarizeActions(template: RuleTemplateDto): string {
		if (template.actions.length === 0) return m.common_not_available();

		return summarizeList(
			template.actions.map((action) => {
				const label =
					ACTION_TYPE_OPTIONS.find((option) => option.value === action.actionType)?.label ??
					action.actionType;
				return label;
			})
		);
	}

	function summarizeList(items: string[]): string {
		const visible = items.slice(0, 2).join(', ');
		const remaining = items.length - 2;
		return remaining > 0
			? m.rules_new_summary_more({ summary: visible, count: String(remaining) })
			: visible;
	}

	function sortRows(
		rows: RuleTemplateRow[],
		column: string,
		direction: 'asc' | 'desc'
	): RuleTemplateRow[] {
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
	<title>{m.rules_new_page_title()}</title>
</svelte:head>

<AppPage>
	<CwButton variant="secondary" onclick={() => goto(resolve('/'))}>
		&larr; {m.action_back_to_dashboard()}
	</CwButton>

	<CwCard title={m.rules_new_configured_templates()}>
		{#key tableKey}
			<CwDataTable {columns} {loadData} {loading} rowActionsHeader={m.common_actions()} rowKey="id">
				{#snippet cell(
					row: RuleTemplateRow,
					col: CwColumnDef<RuleTemplateRow>,
					defaultValue: string
				)}
					{#if col.key === 'statusLabel'}
						<CwChip
							label={row.statusLabel}
							tone={row.isActive ? 'success' : 'warning'}
							variant="soft"
							size="sm"
						/>
					{:else if col.key === 'triggeredCount'}
						<CwChip
							label={String(row.triggeredCount)}
							tone={row.triggeredCount > 0 ? 'danger' : 'secondary'}
							variant="soft"
							size="sm"
						/>
					{:else}
						{defaultValue}
					{/if}
				{/snippet}

				{#snippet rowActions(row: RuleTemplateRow)}
					<div class="rules-new-page__actions">
						<CwButton
							variant="secondary"
							size="md"
							onclick={() => goto(resolve('/rules-new/edit/[id]', { id: String(row.id) }))}
						>
							<Icon src={EDIT_ICON} alt={m.action_edit()} />
						</CwButton>
						<DeleteRuleTemplateDialog
							templateId={row.id}
							ruleName={row.name}
							onDeleted={handleDeleted}
						/>
					</div>
				{/snippet}

				{#snippet toolbarActions()}
					<CwButton variant="primary" onclick={() => goto(resolve('/rules-new/create'))}>
						<Icon src={ADD_ICON} alt={m.rules_new_create_template()} />
						{m.rules_new_create_template()}
					</CwButton>
				{/snippet}
			</CwDataTable>
		{/key}
	</CwCard>
</AppPage>

<style>
	.rules-new-page__actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--cw-space-2);
	}
</style>
