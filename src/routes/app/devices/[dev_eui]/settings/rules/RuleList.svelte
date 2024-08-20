<script lang="ts">
	import { page } from '$app/stores';
	import type { Tables } from '$lib/types/supabaseSchema';
	import { mdiEye, mdiPencil, mdiTrashCan } from '@mdi/js';
	import { Button, Dialog, ListItem, Toggle, Tooltip } from 'svelte-ux';
	import { _ } from 'svelte-i18n';

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
				<Tooltip title="{$_('devices.rules.viewRule')}">
					<Button icon={mdiEye} variant="fill" color="info" /></Tooltip
				>
				<Tooltip title="{$_('devices.rules.EditRule')}">
					<Button icon={mdiPencil} variant="fill" color="warning" /></Tooltip
				>
				<Tooltip title="{$_('devices.rules.deleteRule')}">
					<Toggle let:on={open} let:toggle let:toggleOff>
						<Button icon={mdiTrashCan} on:click={toggle} variant="fill" color="danger" />
						<Dialog {open} on:close={toggleOff}>
							<div slot="title">{$_('app.areYouSure')}</div>
							<div class="px-6 py-3">
								<p>{$_('devices.rules.deleteRuleMessage')}</p>
								<p>{$_('devices.rules.deleteRuleMessage2')}</p>
							</div>
							<div slot="actions">
								<Button
									on:click={() => {
										deleteRule(rule.id);
									}}
									variant="fill"
									color="danger"
								>
								{$_('devices.rules.deleteConfirm')}
								</Button>
								<Button>{$_('devices.rules.cancle')}</Button>
							</div>
						</Dialog>
					</Toggle>
				</Tooltip>
			</div>
		</ListItem>
	{/each}
	{#if rules.length === 0}
		<ListItem title="{$_('devices.rules.emptyRules')}" />
	{/if}
</ul>
