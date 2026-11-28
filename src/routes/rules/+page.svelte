<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { backHref } from '#lib/navigation/backTo.ts';
	import { resolve } from '$app/paths';
	import { apiErrorMessage } from '#lib/api/api-error.ts';
	import Icon from '#lib/components/Icon.svelte';
	import { AppPage } from '#lib/components/layout/index.ts';
	import type { RuleTemplateDto } from '#lib/rules/rule-template.types.ts';
	import { getRuleSubjectOptions } from '#lib/i18n/options.ts';
	import { getServices } from '#lib/services/context.ts';
	import { labelFor } from '#lib/sensor-labels/index.ts';
	import {
		CwButton,
		CwCard,
		CwDataTable,
		isCwPhoneView,
		type CwColumnDef,
		type CwTableQuery,
		type CwTableResult
	} from '@cropwatchdevelopment/cwui';
	import { cwDataTableLabels } from '#lib/i18n/cwuiLabels.ts';
	import { m } from '#lib/paraglide/messages.js';
	import { sortByColumn } from '#lib/utils/sortByColumn.ts';
	import { SvelteMap } from 'svelte/reactivity';
	import ADD_ICON from '#lib/images/icons/add.svg';
	import EDIT_ICON from '#lib/images/icons/edit.svg';
	import DeleteRuleTemplateDialog from './DeleteRuleTemplateDialog.svelte';
	import { actionTypeLabel } from './rule-action-types.ts';
	import { describeSchedule } from './rule-schedule-text.ts';
	import { describeRuleStatus, formatRuleInstant, ruleStatusOf } from './rule-status.ts';
	import RuleRunToggle from './RuleRunToggle.svelte';
	import RuleStatusCell from './RuleStatusCell.svelte';
	import ViewRuleAlertHistory from './ViewRuleAlertHistory.svelte';

	type RuleTemplateRow = RuleTemplateDto & {
		statusLabel: string;
		locationName: string;
		assignmentSummary: string;
		criteriaSummary: string;
		actionSummary: string;
		createdAtLabel: string;
		triggeredCount: number;
	};

	const SUBJECT_OPTIONS = getRuleSubjectOptions();
	const columns: CwColumnDef<RuleTemplateRow>[] = [
		{ key: 'name', header: m.common_name(), sortable: true },
		{ key: 'statusLabel', header: m.rules_new_status(), sortable: true },
		{ key: 'assignmentSummary', header: m.rules_new_assigned_devices() },
		// { key: 'locationName', header: m.nav_locations(), sortable: true },
		{ key: 'criteriaSummary', header: m.rules_conditions(), align: 'left' },
		{ key: 'actionSummary', header: m.rules_new_actions() },
		// { key: 'triggeredCount', header: m.rules_new_triggered_devices(), sortable: true },
		{ key: 'createdAtLabel', header: m.common_created(), sortable: true }
	];

	let loading = $state(true);
	// The table shows its rows as cards below this width (its own breakpoint).
	let tableWidth = $state(0);
	// In a narrow table the date is the first column to go: with it, the row's
	// buttons (start or pause, edit, history, delete) would need a sideways scroll.
	const NARROW_TABLE_PX = 1040;
	let visibleColumns = $derived(
		tableWidth > 0 && tableWidth < NARROW_TABLE_PX
			? columns.filter((column) => column.key !== 'createdAtLabel')
			: columns
	);
	let deletedTemplateIds = $state<number[]>([]);
	let tableKey = $derived(deletedTemplateIds.join(','));
	// Rules started or paused from a row: shown at once, without reloading the
	// table (which would lose the page and the sort). The next load replaces them.
	const changedRules = new SvelteMap<number, RuleTemplateDto>();
	const { rules } = getServices();

	async function loadData(query: CwTableQuery): Promise<CwTableResult<RuleTemplateRow>> {
		try {
			const templates = await rules.getRuleTemplates(
				{ search: query.search?.trim() || undefined },
				{ signal: query.signal }
			);
			changedRules.clear();
			const deletedIds = new Set(deletedTemplateIds);
			let rows = templates.filter((template) => !deletedIds.has(template.id)).map(toRow);

			if (query.sort) {
				rows = sortByColumn(rows, query.sort.column, query.sort.direction);
			}

			const total = rows.length;
			const skip = (query.page - 1) * query.pageSize;
			rows = rows.slice(skip, skip + query.pageSize);

			return { rows, total };
		} catch (error) {
			throw new Error(apiErrorMessage(error, m.rules_new_load_failed()), { cause: error });
		} finally {
			loading = false;
		}
	}

	function handleDeleted(templateId: number) {
		deletedTemplateIds = [...deletedTemplateIds, templateId];
	}

	function toRow(template: RuleTemplateDto): RuleTemplateRow {
		const triggeredCount = template.assignments.filter(
			(assignment) => assignment.state?.isTriggered
		).length;

		return {
			...template,
			statusLabel: describeRuleStatus(ruleStatusOf(template)).label,
			locationName: summarizeLocations(template),
			assignmentSummary: summarizeAssignments(template),
			criteriaSummary: summarizeCriteria(template),
			actionSummary: summarizeActions(template),
			createdAtLabel: template.createdAt
				? new Date(template.createdAt).toLocaleString()
				: m.common_not_available(),
			triggeredCount
		};
	}

	function summarizeLocations(template: RuleTemplateDto): string {
		// A Date/Time rule has no devices, so no location: they get a group of their own.
		if (template.triggerKind === 'schedule') return m.rules_dt_group();
		const names = template.assignments
			.map((assignment) => assignment.locationName)
			.filter((name): name is string => !!name && name.trim().length > 0);
		const unique = [...new Set(names)];
		if (unique.length === 0) return m.rules_new_unknown_location();
		return unique.join(', ');
	}

	function summarizeAssignments(template: RuleTemplateDto): string {
		if (template.triggerKind === 'schedule') return m.rules_dt_no_devices();
		if (template.assignments.length === 0) return m.rules_new_no_assignments();

		const labels = template.assignments.map((assignment) =>
			assignment.deviceName ? `${assignment.deviceName} (${assignment.devEui})` : assignment.devEui
		);

		return summarizeList(labels);
	}

	function summarizeCriteria(template: RuleTemplateDto): string {
		// A Date/Time rule: when it runs, and (while it runs) the next time.
		if (template.triggerKind === 'schedule') {
			if (!template.schedule) return m.common_not_available();
			const when = describeSchedule(template.schedule);
			return template.schedule.nextFireAt
				? `${when} · ${m.rules_dt_next_run({ date: formatRuleInstant(template.schedule.nextFireAt) })}`
				: when;
		}
		if (template.criteria.length === 0) return m.common_not_available();

		return summarizeList(
			template.criteria.map((criterion) => {
				const subjectLabel =
					SUBJECT_OPTIONS.find((option) => option.value === criterion.subject)?.label ??
					labelFor(criterion.subject).label();
				return `${subjectLabel} ${criterion.operator} ${criterion.triggerValue}`;
			})
		);
	}

	function summarizeActions(template: RuleTemplateDto): string {
		if (template.actions.length === 0) return m.common_not_available();

		return summarizeList(
			template.actions.map((action) =>
				actionTypeLabel(
					action.actionTypeName ?? action.actionTypeValue ?? String(action.actionType)
				)
			)
		);
	}

	function summarizeList(items: string[]): string {
		const visible = items.slice(0, 2).join(', ');
		const remaining = items.length - 2;
		return remaining > 0
			? m.rules_new_summary_more({ summary: visible, count: String(remaining) })
			: visible;
	}
</script>

<svelte:head>
	<title>{m.rules_new_page_title()}</title>
</svelte:head>

<AppPage>
	<CwButton
		id="rules-back-button"
		variant="secondary"
		onclick={() => goto(resolve(backHref(page.url, '/') as '/'))}
	>
		&larr; {m.action_back_to_dashboard()}
	</CwButton>

	<CwCard title={m.rules_new_configured_templates()}>
		<div bind:clientWidth={tableWidth}>
			{#key tableKey}
				<CwDataTable
					id="rules-table"
					labels={cwDataTableLabels()}
					columns={visibleColumns}
					{loadData}
					{loading}
					groupBy="locationName"
					rowActionsHeader={m.common_actions()}
					rowKey="id"
				>
					{#snippet cell(
						row: RuleTemplateRow,
						col: CwColumnDef<RuleTemplateRow>,
						defaultValue: string
					)}
						{#if col.key === 'statusLabel'}
							<RuleStatusCell
								status={ruleStatusOf(changedRules.get(row.id) ?? row)}
								tooltipPosition={isCwPhoneView(tableWidth) ? 'bottom' : 'right'}
							/>
						{:else if col.key === 'criteriaSummary'}
							<span class="rules-new-page__truncate" title={row.criteriaSummary}>
								{row.criteriaSummary}
							</span>
						{:else}
							{defaultValue}
						{/if}
					{/snippet}

					{#snippet rowActions(row: RuleTemplateRow)}
						<div class="rules-new-page__actions">
							<RuleRunToggle
								templateId={row.id}
								ruleName={row.name}
								running={(changedRules.get(row.id) ?? row).isActive}
								onChanged={(rule) => changedRules.set(rule.id, rule)}
							/>
							<CwButton
								id={`rules-row-${row.id}-edit-button`}
								variant="secondary"
								size="sm"
								onclick={() => goto(resolve('/rules/edit/[id]', { id: String(row.id) }))}
							>
								<Icon src={EDIT_ICON} alt={m.action_edit()} />
							</CwButton>
							<ViewRuleAlertHistory templateId={row.id} ruleName={row.name} />
							<DeleteRuleTemplateDialog
								templateId={row.id}
								ruleName={row.name}
								onDeleted={handleDeleted}
							/>
						</div>
					{/snippet}

					{#snippet toolbarActions()}
						<CwButton
							id="rules-add-button"
							variant="primary"
							onclick={() => goto(resolve('/rules/create'))}
						>
							<Icon src={ADD_ICON} alt={m.rules_new_create_template()} />
						</CwButton>
					{/snippet}
				</CwDataTable>
			{/key}
		</div>
	</CwCard>
</AppPage>

<style>
	/* Up to two lines, so a long condition (a Date/Time rule's days, time and
	   next run) stays readable without pushing the row's buttons out of the table. */
	.rules-new-page__truncate {
		display: -webkit-box;
		min-width: 11rem;
		max-width: 24rem;
		overflow: hidden;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
	}

	.rules-new-page__actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--cw-space-1);
	}
</style>
