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
	import { getAppContext } from '$lib/appContext.svelte';
	import { ApiService } from '$lib/api/api.service';

	type RuleRow = RulesDto & {
		device_name: string;
		location_name: string;
		permission_level: number | null;
	};

	let { data }: { data: { rules: RuleRow[] } } = $props();
	let loading = $state(false);
	let deletedRuleGroupIds = $state<string[]>([]);
	let tableKey = $derived(deletedRuleGroupIds.join(','));
	let app = getAppContext();

	const columns: CwColumnDef<RuleRow>[] = [
		{ key: 'name', header: m.common_name(), sortable: true },
		{ key: 'device_name', header: 'Device Name' },
		{ key: 'location_name', header: m.nav_locations() },
		{ key: 'created_at', header: m.common_created() },
		{ key: 'last_triggered', header: 'Last Triggered', sortable: true },
		{ key: 'trigger_count', header: 'Trigger Count', sortable: true }
	];

	function sortRules(rows: RuleRow[], column: string, direction: 'asc' | 'desc'): RuleRow[] {
		const dir = direction === 'asc' ? 1 : -1;
		return [...rows].sort((a, b) => {
			const aVal = (a as unknown as Record<string, unknown>)[column];
			const bVal = (b as unknown as Record<string, unknown>)[column];
			if (aVal == null && bVal == null) return 0;
			if (aVal == null) return dir;
			if (bVal == null) return -dir;
			if (column === 'trigger_count') return (Number(aVal) - Number(bVal)) * dir;
			return String(aVal).localeCompare(String(bVal)) * dir;
		});
	}

	async function loadData(query: CwTableQuery): Promise<CwTableResult<RuleRow>> {
		const search = query.search?.trim() || '';
		const api = new ApiService({ authToken: app.accessToken });
		const rules = await api.getRules({ name: search || undefined });

		const deletedIds = new Set(deletedRuleGroupIds);
		let rows: RuleRow[] = rules
			.map((rule) => {
				const deviceRecord =
					rule.cw_devices && typeof rule.cw_devices === 'object'
						? (rule.cw_devices as Record<string, unknown>)
						: null;
				const deviceOwners = Array.isArray(deviceRecord?.cw_device_owners)
					? (deviceRecord.cw_device_owners as Array<{
							user_id?: string | null;
							permission_level?: number | null;
						}>)
					: [];
				const locationRecord =
					deviceRecord?.cw_locations && typeof deviceRecord.cw_locations === 'object'
						? (deviceRecord.cw_locations as Record<string, unknown>)
						: null;

				return {
					...rule,
					device_name:
						deviceRecord?.name && typeof deviceRecord.name === 'string'
							? deviceRecord.name
							: '',
					location_name:
						typeof locationRecord?.name === 'string' && locationRecord.name.trim().length > 0
							? locationRecord.name
							: '',
					permission_level:
						deviceOwners.find((o) => o.user_id === app.session?.sub)?.permission_level ?? null,
					created_at: new Date(rule.created_at),
					last_triggered: rule.last_triggered ? new Date(rule.last_triggered) : null
				} as unknown as RuleRow;
			})
			.filter((r) => !deletedIds.has(r.ruleGroupId));

		if (query.sort) {
			rows = sortRules(rows, query.sort.column, query.sort.direction);
		}

		const total = rows.length;
		const skip = (query.page - 1) * query.pageSize;
		rows = rows.slice(skip, skip + query.pageSize);

		return { rows, total };
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
