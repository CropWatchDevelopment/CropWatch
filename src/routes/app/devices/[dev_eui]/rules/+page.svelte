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
	import { Button, Card, Header, Menu, MenuItem, Toggle } from 'svelte-ux';
	import { mdiDotsHorizontal, mdiDotsVertical, mdiPencil, mdiPlusCircle, mdiTrashCan } from '@mdi/js';
	import { goto } from '$app/navigation';

	export let data;

	const rules: Promise<Tables<'cw_rules'>[]> = browser
		? fetch(`/api/v1/devices/${$page.params.dev_eui}/rules`, { method: 'GET' }).then((r) =>
				r.json()
			)
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
</script>

<div class="flex flex-row bg-emerald-300 p-4 text-center justify-center">
	<img src={RulesImage} alt="rules icon" class="w-12" />
	<p class="text-surface-100 text-3xl ml-2">Rules and custom alerts</p>
</div>

<div class="mt-4 mx-2 flex justify-between">
	<Back />
</div>

<div class="m-6">
	<div class="flex flex-row">
		<img src={activeImage} alt="device" class="w-14 h-14 mr-4" />
	</div>

	<h1 class="text-surface-100 text-3xl mt-4">{$_('rules.description')}</h1>

	<div class="w-full flex flex-row justify-end mt-5">
		<Button
			on:click={() => goto('rules/create-rule')}
			icon={mdiPlusCircle}
			class="flex-row-reverse"
			color="success"
		>
			<span class="text-white">{$_('rules.new_rule')}</span>
		</Button>
	</div>

	{#await rules}
		<p>Loading Rules...</p>
	{:then allRules}
		<p class="my-4 text-white">{$_('rules.no_rules_created')}</p>
		<div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8">
			{#each allRules as rule}
				<Card class="bg-gradient-to-r from-cyan-600 to-sky-300 p-3 rounded-lg">
					<Header>
						<div slot="title">
							<img src={RulesDeviceImage} alt="rule icon" class="w-16" />
						</div>
						<div slot="actions">
							<Toggle let:on={open} let:toggle>
								<Button on:click={toggle} icon={mdiDotsHorizontal} variant="outline" rounded="full" size="sm">
									<Menu {open} on:close={toggle}>
										<MenuItem
											icon={mdiPencil}
											on:click={() => {
												selectedRule = rule;
												openDialog = true;
											}}>Edit</MenuItem
										>
										<MenuItem icon={mdiTrashCan} on:click={() => deleteRule(rule.id)}>Delete</MenuItem>
									</Menu>
								</Button>
							</Toggle>
						</div>
					</Header>
					<p class="text-white mt-3 ml-1">{rule.name}</p>
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
