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
	import { m } from '$lib/paraglide/messages.js';
	import DeleteRuleDialog from './DeleteRuleDialog.svelte';
	import ViewRuleDialog from './ViewRuleDialog.svelte';

	type RuleRow = RulesDto & { location_name: string };

	let { data }: { data: { rules: RuleRow[] } } = $props();
	let loading = $state(false);
	let deletedRuleGroupIds = $state<string[]>([]);
	let rules = $derived(
		(data.rules ?? []).filter((rule) => !deletedRuleGroupIds.includes(rule.ruleGroupId))
	);
	let tableKey = $derived(rules.map((rule) => rule.ruleGroupId).join('|'));

	const columns: CwColumnDef<RuleRow>[] = [
		{ key: 'name', header: m.common_name(), sortable: true },
		{ key: 'dev_eui', header: 'Device EUI' },
		{ key: 'created_at', header: m.common_created() },
		{ key: 'location_name', header: m.nav_locations() }
	];

	async function loadData(query: CwTableQuery): Promise<CwTableResult<RuleRow>> {
		void query;
		const rows = rules;
		return { rows, total: rows.length };
	}

	function handleRuleDeleted(ruleGroupId: string) {
		if (deletedRuleGroupIds.includes(ruleGroupId)) return;
		deletedRuleGroupIds = [...deletedRuleGroupIds, ruleGroupId];
	}
</script>

<svelte:head>
	<title>{m.rules_page_title()}</title>
</svelte:head>

<CwButton variant="secondary" size="sm" onclick={() => goto('/')}>
	{m.action_back_to_dashboard()}
</CwButton>
<div class="overflow-y-auto p-4">
	<CwCard title={m.rules_configured_rules()} class="min-h-0 flex-1">
		{#key tableKey}
			<CwDataTable
				{columns}
				{loadData}
				{loading}
				rowActionsHeader={m.common_actions()}
				rowKey="id"
				class="w-full"
			>
				{#snippet rowActions(row: RuleRow)}
					<div class="flex w-full flex-row gap-2">
						<ViewRuleDialog {row} />
						<CwButton variant="primary" size="md" onclick={() => goto(`/rules/edit/${row.id}`)}>
							<img src={EDIT_ICON} alt={m.rules_edit_rule()} />
							{m.action_edit()}
						</CwButton>
						<DeleteRuleDialog
							ruleGroupId={row.ruleGroupId}
							ruleName={row.name}
							onDeleted={handleRuleDeleted}
						/>
					</div>
				{/snippet}
				{#snippet toolbarActions()}
					<CwButton
						variant="primary"
						onclick={() => {
							goto('/rules/create');
						}}
					>
						{m.rules_create_new_rule()}
					</CwButton>
				{/snippet}
			</CwDataTable>
		{/key}
	</CwCard>
</div>
