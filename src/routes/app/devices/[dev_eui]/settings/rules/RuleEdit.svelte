<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import DarkCard from '$lib/components/ui/Cards/DarkCard.svelte';
	import DarkCard2 from '$lib/components/ui/Cards/DarkCard2.svelte';
	import { convertObject } from '$lib/components/ui/utilities/ConvertSensorDataObject';
	import { isValidEmail } from '$lib/components/ui/utilities/isValidEmail';
	import { notificationStore } from '$lib/stores/notificationStore';
	import type { Tables } from '$lib/types/supabaseSchema';
	import {
		mdiAccountPlus,
		mdiCloseCircle,
		mdiEmail,
		mdiFloppy,
		mdiMinusCircle,
		mdiPlusCircle
	} from '@mdi/js';
	import { onMount } from 'svelte';
	import { Button, TextField, SelectField, ListItem, NumberStepper } from 'svelte-ux';
	import { _ } from 'svelte-i18n';

	export let state: string;
	export let editing: Tables<'cw_rules'>; // Pass in the entire rule when editing
	export let criteria: Tables<'cw_rule_criteria'>[]; // Pass in the criteria when editing
	debugger;
	const allCriteria = criteria;
	let emailArray: string[] = editing.action_recipient.split(',');

	let operators = [
		{ label: '>', value: '>' },
		{ label: '<', value: '<' },
		{ label: '=', value: '= (not recommended)' }
	];
	let subjects: [{ label: string; value: string }] | [] = [];
	let latestData;
	let emailToAdd = '';

	const babylonNotifierOptions = [
		{ label: 'Email', value: '1' },
		{ label: 'SMS', value: '2' },
		{ label: 'Webhook', value: '3' }
	];

	const addSubCriterion = () => {
		mdiCloseCircle;
		const newCriterion = {
			subject: '',
			operator: '',
			trigger_value: 100,
			reset_value: -100,
			id: 0,
			created_at: '',
			ruleGroupId: '',
			parent_id: '',
			criteria_id: 0
		};
		editing.criteria = [...editing.criteria, newCriterion];
	};

	// const removeSubCriterion = (index: number) => {
	// 	subCriteria.splice(index, 1);
	// 	subCriteria = subCriteria;
	// };

	const submitRule = async () => {
		const ruleData = {
			name: editing?.name,
			babylon_notifier_type: editing.babylonNotifierType,
			action_recipient: emailArray.join(','),
			is_triggered: editing.isTriggered,
			ruleGroupId: editing.ruleGroupId,
			dev_eui: editing.devEui,
			profile_id: editing.profileId,
			id: editing?.id,
			sub_criteria: editing?.criteria
		};

		console.log('submitted rule', ruleData);

		const response = await fetch(`/api/v1/rules/${editing.devEui}`, {
			method: 'PUT', // Use PUT for edit, POST for create
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(ruleData)
		});

		if (response.ok) {
			notificationStore.NotificationTimedOpen({
				title: editing ? 'Rule Updated!' : 'Rule Created!',
				description: editing ? 'Rule Successfully Updated.' : 'Rule Successfully Created.',
				timeout: 2000,
				icon: '✅',
				buttonText: 'OK'
			});
			state = 'list';
		} else {
			notificationStore.NotificationTimedOpen({
				title: 'Failed to Submit Rule.',
				description: 'An error occurred.',
				timeout: 2000,
				icon: '❌',
				buttonText: 'OK'
			});
		}
	};
	let bbb = babylonNotifierOptions.find((o) => o.value == editing.babylon_notifier_type)?.label;

	onMount(async () => {
		const latestDataPromise = await fetch(`/api/v1/devices/${$page.params.dev_eui}/latest-data`);
		const allData = await latestDataPromise.json();
		latestData = convertObject(allData);
		delete latestData.created_at;
		for (let key of Object.keys(latestData)) {
			subjects.push({ label: key, value: key });
		}
		subjects = subjects;
	});
</script>

{bbb}
<div class="px-4">
	<DarkCard title={`${$_('devices.rules.editRule')}: ${editing.name}`}>
		<div class="flex flex-col gap-2">
			<div class="flex flex-row justify-between gap-2">
				<TextField label={$_('devices.rules.ruleName')} bind:value={editing.name} required />
				{#if bbb}
					<SelectField
						label={$_('devices.rules.notifierType')}
						value={babylonNotifierOptions.find((o) => o.value == editing.babylon_notifier_type)
							?.value}
						options={babylonNotifierOptions}
						required
					/>
				{/if}
			</div>

			<div class="flex flex-row gap-2">
				<TextField
					label={$_('devices.rules.actionRecipient')}
					type="email"
					bind:value={emailToAdd}
					class="w-full"
					required
				/>
				<Button
					icon={mdiAccountPlus}
					variant="fill"
					color="success"
					on:click={() => {
						if (emailArray.includes(emailToAdd)) {
							notificationStore.NotificationTimedOpen({
								title: $_('devices.rules.emailAlreadyAdded'),
								description: $_('devices.rules.emailAlreadyAddedDesc'),
								timeout: 2000,
								icon: '❌',
								buttonText: 'OK'
							});
							return false;
						}
						if (!isValidEmail(emailToAdd)) {
							notificationStore.NotificationTimedOpen({
								title: $_('devices.rules.emailInvalid'),
								description: $_('devices.rules.emailInvalidDesc'),
								timeout: 2000,
								icon: '❌',
								buttonText: 'OK'
							});
							return false;
						}
						emailArray.push(emailToAdd);
						emailArray = emailArray;
						emailToAdd = '';
					}}
				/>
			</div>
			<DarkCard2>
				<div class="text-surface">
					<p class="text-surface-content">{$_('devices.rules.addedEmails')}:</p>
					<ul class="text-secondary">
						{#each emailArray as email}
							<ListItem title={email} icon={mdiEmail}>
								<div slot="actions">
									<Button
										icon={mdiCloseCircle}
										on:click={() => {
											const item = emailArray.findIndex((e) => e == email);
											emailArray.splice(item, 1);
											emailArray = emailArray;
										}}
										classes={{ icon: 'text-red-500' }}
									/>
								</div>
							</ListItem>
						{/each}
						{#if emailArray.length === 0}
							<p class="text-surface-content">{$_('devices.rules.pleaseAddAtLeastOneEmail')}</p>
						{/if}
					</ul>
				</div>
			</DarkCard2>

			<div class="px-10">
				<hr />
			</div>

			<h2>{$_('devices.rules.criteria')}</h2>
			{#each allCriteria as criterion, index}
				<DarkCard2>
					<div class="my-2 flex flex-col gap-2 text-white">
						<div class="flex flex-row gap-4">
							<SelectField
								label={$_('devices.rules.sensorValue')}
								value={subjects.find((s) => s.value == criterion.subject)?.label}
								options={subjects}
								clearable={false}
								required
							/>
							<SelectField
								label={$_('devices.rules.operator')}
								bind:value={criterion.operator}
								options={operators}
								classes={{ field: { input: 'text-center' } }}
								clearable={false}
							/>
							<NumberStepper
								label={$_('devices.rules.triggerValue')}
								bind:value={criterion.trigger_value}
								class="w-full"
							/>
						</div>
						<NumberStepper
							label={$_('devices.rules.resetValue')}
							bind:value={criterion.reset_value}
							class="w-full"
						/>

						<!-- <Button
							icon={mdiMinusCircle}
							on:click={() => removeSubCriterion(index)}
							variant="fill"
							color="danger"
						>
							{$_('devices.rules.removeCriterion')}
						</Button> -->
					</div>
				</DarkCard2>
			{/each}
			<Button on:click={addSubCriterion} icon={mdiPlusCircle} variant="fill" color="primary"
				>{$_('devices.rules.addSubCriterion')}</Button
			>

			<Button on:click={submitRule} icon={mdiFloppy} variant="fill">
				{$_('app.update')}
			</Button>
		</div>
	</DarkCard>
</div>
