<script lang="ts">
	import { page } from '$app/stores';
	import type { Tables } from '$lib/types/supabaseSchema';
	import { mdiEye, mdiPencil, mdiTrashCan } from '@mdi/js';
	import { Button, Dialog, ListItem, Toggle, Tooltip } from 'svelte-ux';

	export let rules: Tables<'cw_rules'>[] = [];

	const deleteRule = async (id: number) => {
		const deleteResult = await fetch(`/api/v1/rules/${$page.params.dev_eui}?id=${id}`, {
			method: 'DELETE'
		});
	};
</script>

<ul>
	{#each rules as rule}
		<ListItem title={rule.name}>
			<div slot="subheading">
				<ul>
					{#each rule.criteria as criteria}
						<li>
							<small>{criteria.subject} {criteria.operator} {criteria.trigger_value}</small>
						</li>
					{/each}
				</ul>
			</div>
			<div slot="actions" class="flex flex-row gap-4">
				<Tooltip title="View rule">
					<Button icon={mdiEye} variant="fill" color="info" /></Tooltip
				>
				<Tooltip title="Edit rule">
					<Button icon={mdiPencil} variant="fill" color="warning" /></Tooltip
				>
				<Tooltip title="Delete rule">
					<Toggle let:on={open} let:toggle let:toggleOff>
						<Button icon={mdiTrashCan} on:click={toggle} variant="fill" color="danger" />
						<Dialog {open} on:close={toggleOff}>
							<div slot="title">Are you sure?</div>
							<div class="px-6 py-3">
								<p>This will permanently delete the item and can not be undone.</p>
								<p>You will no longer recieve alerts for this rule.</p>
							</div>
							<div slot="actions">
								<Button
									on:click={() => {
										deleteRule(rule.id);
									}}
									variant="fill"
									color="danger"
								>
									Yes, delete item
								</Button>
								<Button>Cancel</Button>
							</div>
						</Dialog>
					</Toggle>
				</Tooltip>
			</div>
		</ListItem>
	{/each}
	{#if rules.length === 0}
		<ListItem title="There are no rules configured yet..." />
	{/if}
</ul>
