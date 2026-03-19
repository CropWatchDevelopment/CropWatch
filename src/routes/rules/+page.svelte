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

	type RuleRow = RulesDto & { location_name: string };

	let { data }: { data: { rules: RuleRow[] } } = $props();
	let loading = $state(false);

	const columns: CwColumnDef<RuleRow>[] = [
		{ key: 'name', header: m.common_name(), sortable: true },
		{ key: 'dev_eui', header: 'Device EUI' },
		{ key: 'created_at', header: m.common_created() },
		{ key: 'location_name', header: m.nav_locations() }
	];

	async function loadData(query: CwTableQuery): Promise<CwTableResult<RuleRow>> {
		void query;
		const rows = data.rules ?? [];
		return { rows, total: rows.length };
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
					<CwButton variant="info" size="md" onclick={() => goto(`/rules/${row.id}`)}>
						<img src={EYE_ICON} alt={m.rules_view_rule()} />
						{m.action_view()}
					</CwButton>
					<CwButton variant="primary" size="md" onclick={() => goto(`/rules/edit/${row.id}`)}>
						<img src={EDIT_ICON} alt={m.rules_edit_rule()} />
						{m.action_edit()}
					</CwButton>
					<DeleteRuleDialog ruleGroupId={row.ruleGroupId} ruleName={row.name} />
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
	</CwCard>
</div>
