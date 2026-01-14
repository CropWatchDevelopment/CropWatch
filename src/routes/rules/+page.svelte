<script lang="ts">
	import { resolve } from '$app/paths';
	import CWButton from '$lib/components/CWButton.svelte';
	import CWBackButton from '$lib/components/CWBackButton.svelte';
	import CWTable from '$lib/components/CWTable.svelte';
	import type { PageData } from './$types';
	import { page } from '$app/stores';

	let { data }: { data: PageData } = $props();

	type RuleItem = (typeof data.rules)[number];

	const currentPath = $derived($page.url.pathname);

	const ruleItems = $derived(
		data.rules.map((rule) => ({
			...rule,
			device_label: `${rule.device_name} (${rule.dev_eui ?? 'Unassigned'})`,
			last_triggered_fmt: rule.last_triggered ? new Date(rule.last_triggered).toLocaleString() : '—'
		}))
	);

	const statusBadges = {
		Triggered: { dotClass: 'bg-amber-400', badgeClass: 'bg-amber-500/15 text-amber-200' },
		Idle: { dotClass: 'bg-emerald-400', badgeClass: 'bg-emerald-500/15 text-emerald-200' }
	};

	const ruleColumns = [
		{
			key: 'name',
			label: 'Rule',
			type: 'stacked',
			secondaryKey: 'ruleGroupId',
			sortable: true,
			href: (item: RuleItem) => resolve(`/rules/${item.ruleGroupId}/edit-rule`)
		},
		{
			key: 'device_label',
			label: 'Device',
			value: 'device_label',
			sortable: true,
			href: (item: RuleItem) =>
				resolve(
					`/locations/location/${item.location_id ?? ''}/devices/device/${item.dev_eui ?? ''}?prev=${currentPath}`
				)
		},
		{
			key: 'is_triggered',
			label: 'Status',
			type: 'badge',
			badges: statusBadges,
			value: (item: RuleItem) => (item.is_triggered ? 'Triggered' : 'Idle')
		},
		{
			key: 'trigger_count',
			label: 'Triggered',
			type: 'number',
			align: 'right'
		},
		{
			key: 'conditions',
			label: 'Conditions',
			value: 'conditions'
		},
		{
			key: 'actions',
			label: 'Actions',
			type: 'buttons',
			align: 'right',
			buttons: [
				{
					label: 'Edit',
					variant: 'ghost',
					onClick: (row: unknown) => {
						const item = row as RuleItem;
						const url = resolve(`/rules/${item.ruleGroupId}/edit-rule`);
						if (typeof window !== 'undefined') window.location.href = url;
					}
				}
			]
		}
	];
</script>

<div class="min-h-screen p-6">
	<div class="mb-6 flex flex-wrap items-center justify-between gap-3">
		<div>
			<CWBackButton fallback="/" label="Back to Dashboard" class="mb-2" />
			<p class="text-sm uppercase tracking-wide text-slate-400">Rules</p>
			<h1 class="text-2xl font-semibold text-slate-100">Automation rules</h1>
			<p class="text-sm text-slate-400">
				View your rules, see their status, and quickly jump to edit.
			</p>
		</div>
	</div>

	<div class="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg">
		<svelte:boundary>
			<CWTable
				items={ruleItems}
				columns={ruleColumns}
				storageKey="rules-table"
				pageSize={12}
				class="text-sm"
			>
				{#snippet empty()}
					<div class="flex flex-col items-center justify-center py-12 text-center">
						<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-8 w-8 text-slate-400"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								stroke-width="2"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
								/>
							</svg>
						</div>
						<p class="text-slate-400">No rules yet</p>
						<p class="mt-1 text-sm text-slate-400">Create a rule to see it listed here.</p>
					</div>
				{/snippet}
			</CWTable>

			{#snippet failed(error, reset)}
				<div class="flex flex-col items-center justify-center py-12 text-center">
					<div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-rose-900/30">
						<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
						</svg>
					</div>
					<p class="text-rose-300 font-medium">Failed to load rules table</p>
					<p class="mt-1 text-sm text-slate-400">{(error as Error)?.message || 'An unexpected error occurred'}</p>
					<button onclick={reset} class="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm transition-colors">
						Try again
					</button>
				</div>
			{/snippet}
		</svelte:boundary>
	</div>
</div>
