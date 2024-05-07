<script lang="ts">
	import type { Tables } from '../../../../../database.types';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import Rules from '$lib/components/rules/Rules.svelte';
	import { toast } from '@zerodevx/svelte-toast';
	import Back from '$lib/components/ui/Back.svelte';
	import activeImage from '$lib/images/UI/cw-10.svg';
	import RulesImage from '$lib/images/UI/cw_rules.svg';
	import RulesDeviceImage from '$lib/images/UI/cw_rule.svg';
	import { _ } from 'svelte-i18n';
	import { Button, Card, Dialog, Header, Menu, MenuItem, Toggle } from 'svelte-ux';
	import { mdiChartBar, mdiDotsHorizontal, mdiPencil, mdiPlusCircle, mdiTrashCan } from '@mdi/js';
	import { goto } from '$app/navigation';

	let rules: Promise<Tables<'cw_rules'>[]> = browser
		? fetch(`/api/v1/devices/${$page.params.dev_eui}/rules`, { method: 'GET' }).then((r) => {
				const result = r.json();
				return result;
			})
		: Promise.resolve([]);

	let device: Promise<any> = browser
		? fetch(`/api/v1/devices/${$page.params.dev_eui}/type`, { method: 'GET' }).then((r) => {
				const result = r.json();
				return result;
			})
		: Promise.resolve([]);

	const deleteRule = (id: number) => {
		fetch(`/api/v1/devices/${$page.params.dev_eui}/rules?rule-id=${id}`, {
			method: 'DELETE'
		}).then((r) => {
			if (r.ok) {
				toast.push(`Rule Deleted Successfully`, {
					theme: {
						'--toastBackground': 'green',
						'--toastColor': 'black'
					}
				});
				rules = browser
					? fetch(`/api/v1/devices/${$page.params.dev_eui}/rules`, { method: 'GET' }).then((r) =>
							r.json()
						)
					: Promise.resolve([]);
			} else {
				toast.push(`Failed to delete Rule`, {
					theme: {
						'--toastBackground': 'red',
						'--toastColor': 'black'
					}
				});
			}
		});
	};

	let selectedRule: Tables<'cw_rules'> | undefined = undefined;
	let openDialog: boolean = false;
	let deleteConfirmOpen: boolean = false;
	let selectedRuleId: number = -1;
</script>

<div class="flex flex-row bg-emerald-300 p-4 text-center justify-center">
	<img src={RulesImage} alt="rules icon" class="w-12" />
	<p class="text-surface-100 text-3xl ml-2">Rules and custom alerts</p>
</div>

<div class="mt-4 mx-2 flex justify-between">
	<Back />
</div>

<div class="m-6">
	<div class="flex flex-row text-surface-100 text-2xl items-center">
		<img src={activeImage} alt="device" class="w-14 h-14 mr-4" />

		{#await device}
			Loading Device Name...
		{:then dev}
			{dev.name}
		{/await}
	</div>

	<h1 class="text-surface-100 text-xl mt-4">{$_('rules.description')}</h1>

	<div class="w-full flex flex-row justify-end mt-5">
		<Button
			on:click={() => goto('rules/create-rule')}
			icon={mdiPlusCircle}
			class="flex-row-reverse"
			color="success"
		>
			<span class="text-surface-100">{$_('rules.new_rule')}</span>
		</Button>
	</div>

	{#await rules}
		<p>Loading Rules...</p>
	{:then allRules}
		{#if allRules && allRules.length === 0}<p class="my-4 text-surface-100">
				{$_('rules.no_rules_created')}
			</p>{/if}
		<div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
			{#each allRules as rule}
				<Card class="bg-gradient-to-r from-cyan-600 to-sky-300 p-3 rounded-lg">
					<Header>
						<div slot="title">
							<img src={RulesDeviceImage} alt="rule icon" class="w-16" />
						</div>
						<div slot="actions">
							<Toggle let:on={open} let:toggle>
								<Button
									on:click={toggle}
									icon={mdiDotsHorizontal}
									variant="outline"
									rounded="full"
									size="sm"
								>
									<Menu {open} on:close={toggle}>
										<MenuItem
											icon={mdiPencil}
											on:click={() => {
												selectedRule = rule;
												openDialog = true;
											}}>{$_('rules.edit_rule')}</MenuItem
										>

										<MenuItem icon={mdiChartBar} disabled>
											{$_('rules.rule_statistics')} (Future)
										</MenuItem>

										<MenuItem
											icon={mdiTrashCan}
											color="danger"
											on:click={() => {
												deleteConfirmOpen = true;
												selectedRuleId = rule.id;
											}}>{$_('rules.delete_rule')}</MenuItem
										>
									</Menu>
								</Button>
							</Toggle>
						</div>
					</Header>
					<p class="text-surface-100 mt-3 ml-1">{rule.name}</p>
				</Card>
			{/each}
		</div>
	{/await}
</div>

<dialog open={openDialog}>
	{#if selectedRule}
		{JSON.stringify(selectedRule)}
		<Rules existingRule={selectedRule} bind:dialogOpen={openDialog} />
	{/if}
	<button
		type="button"
		on:click={() => {
			selectedRule = undefined;
			openDialog = false;
		}}>Close</button
	>
</dialog>

<Dialog
	open={deleteConfirmOpen}
	on:close={() => {
		deleteConfirmOpen = false;
		selectedRuleId = -1;
	}}
>
	<div slot="title">Are you sure?</div>
	<div class="px-6 py-3">This will permanently delete the item and can not be undone.</div>
	<div slot="actions">
		<Button
			on:click={() => {
				deleteRule(selectedRuleId);
			}}
			variant="fill"
			color="danger"
		>
			Yes, delete item
		</Button>
		<Button>Cancel</Button>
	</div>
</Dialog>
