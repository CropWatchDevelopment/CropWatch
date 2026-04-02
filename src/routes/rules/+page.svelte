<script lang="ts">
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
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { RulesDto } from '$lib/interfaces/rule.interface';
	import EDIT_ICON from '$lib/images/icons/edit.svg';
	import ADD_ICON from '$lib/images/icons/add.svg';
	import { m } from '$lib/paraglide/messages.js';
	import DeleteRuleDialog from './DeleteRuleDialog.svelte';
	import ViewRuleDialog from './ViewRuleDialog.svelte';

	type RuleRow = RulesDto & {
		device_name: string;
		location_name: string;
		permission_level: number | null;
	};

	let { data }: { data: { rules: RuleRow[] } } = $props();
	let loading = $state(false);
	let deletedRuleGroupIds = $state<string[]>([]);
	let rules = $derived(
		(data.rules ?? []).filter((rule) => !deletedRuleGroupIds.includes(rule.ruleGroupId))
	);
	let tableKey = $derived(rules.map((rule) => rule.ruleGroupId).join('|'));

	const columns: CwColumnDef<RuleRow>[] = [
		{ key: 'name', header: m.common_name(), sortable: true },
		{ key: 'device_name', header: 'Device Name' },
		{ key: 'location_name', header: m.nav_locations() },
		{ key: 'created_at', header: m.common_created() },
		{ key: 'last_triggered', header: 'Last Triggered', sortable: true },
		{ key: 'trigger_count', header: 'Trigger Count', sortable: true }
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

<AppPage>
	<CwButton variant="secondary" onclick={() => goto(resolve('/'))}>
		&larr; {m.action_back_to_dashboard()}
	</CwButton>

	<CwCard title={m.rules_configured_rules()} class="min-h-0 flex-1">
		{#key tableKey}
			<CwDataTable
				{columns}
				{loadData}
				{loading}
				groupBy="device_name"
				rowActionsHeader={m.common_actions()}
				rowKey="id"
				class="w-full"
			>
				{#snippet cell(row: RuleRow, col: CwColumnDef<RuleRow>, defaultValue: string)}
					{#if col.key === 'created_at'}
						{new Date(row.created_at).toLocaleString()}
					{:else if col.key === 'last_triggered'}
						{row.last_triggered
							? new Date(row.last_triggered).toLocaleString()
							: m.common_not_available()}
					{:else}
						{defaultValue}
					{/if}
				{/snippet}
				{#snippet rowActions(row: RuleRow)}
					<div class="flex w-full flex-row justify-end gap-2">
						{#if row.permission_level != null && row.permission_level <= 3}
							<ViewRuleDialog {row} />
						{/if}
						{#if row.permission_level != null && row.permission_level <= 2}
							<CwButton
								variant="primary"
								size="md"
								onclick={() => goto(resolve('/rules/edit/[id]', { id: String(row.id) }))}
							>
								<Icon src={EDIT_ICON} alt={m.action_edit()} />
							</CwButton>
							<DeleteRuleDialog
								ruleGroupId={row.ruleGroupId}
								ruleName={row.name}
								onDeleted={handleRuleDeleted}
							/>
						{/if}
					</div>
				{/snippet}
				{#snippet toolbarActions()}
					<CwButton
						variant="primary"
						onclick={() => {
							goto(resolve('/rules/create'));
						}}
					>
						<Icon src={ADD_ICON} alt={m.rules_create_new_rule()} />
						{m.rules_create_new_rule()}
					</CwButton>
				{/snippet}
			</CwDataTable>
		{/key}
	</CwCard>
</AppPage>
