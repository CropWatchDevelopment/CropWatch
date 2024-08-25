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

	type rule = Tables<'cw_rules'>;
	type ruleCriteria = Tables<'cw_rule_criteria'>[];
	let subCriteria: ruleCriteria[] = []; // Use the newly defined type

	let ruleName = '';
	let babylonNotifierType = '';
	let isTriggered = false;
	let ruleGroupId = '';
	const devEui: string = $page.params.dev_eui;
	let profileId = '';
	let emailArray: string[] = [];
	let emailToAdd = '';
	let operators = [
		{ label: '>', value: '>' },
		{ label: '<', value: '<' },
		{ label: '=', value: '= (not recommended)' }
	];
	let subjects: [{ label: string; value: string }] | [] = [];
	let latestData;

	$: allValuesEntered = ruleName.length > 0 && (babylonNotifierType && babylonNotifierType.length > 0) && emailArray.length > 0 && subCriteria.length > 0;

	const babylonNotifierOptions = [
		{ label: 'Email', value: '1' },
		{ label: 'SMS', value: '2' },
		{ label: 'Webhook', value: '3' }
	];

	const addSubCriterion = () => {
		mdiCloseCircle;
		const newCriterion: ruleCriteria = {
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
		subCriteria = [...subCriteria, newCriterion];
	};

	const removeSubCriterion = (index: number) => {
		subCriteria.splice(index, 1);
		subCriteria = subCriteria;
	};

	const submitRule = async () => {
		const ruleData = {
			name: ruleName,
			babylon_notifier_type: babylonNotifierType,
			action_recipient: emailArray.join(','),
			is_triggered: isTriggered,
			ruleGroupId: ruleGroupId,
			dev_eui: devEui,
			profile_id: profileId,
			sub_criteria: subCriteria
		};

		console.log('submitted rule', ruleData);

		const response = await fetch(`/api/v1/rules/${devEui}`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(ruleData)
		});

		if (response.ok) {
			notificationStore.NotificationTimedOpen({
				title: 'Rule Created!',
				description: 'Rule Successfully Created.',
				timeout: 2000,
				icon: '✅',
				buttonText: 'OK'
			});
			state = 'list';
			goto(`/app/devices/${$page.params.dev_eui}/settings?page=rules`);
		} else {
			notificationStore.NotificationTimedOpen({
				title: 'Failed to Create Rule.',
				description: 'An error occurred.',
				timeout: 2000,
				icon: '❌',
				buttonText: 'OK'
			});
		}
	};

	onMount(async () => {
		const latestDataPromise = await fetch(`/api/v1/devices/${$page.params.dev_eui}/latest-data`);
		const allData = await latestDataPromise.json();
		latestData = convertObject(allData, true);
		delete latestData.created_at;
		for (let key of Object.keys(latestData)) {
			subjects.push({ label: key, value: key });
		}
		subjects = subjects;
	});
</script>

<div class="px-4">
	<DarkCard title={$_('devices.rules.addRule')}>
		<div class="flex flex-col gap-2">
			<div class="flex flex-row justify-between gap-2">
				<TextField label={$_('devices.rules.ruleName')} bind:value={ruleName} required />
				<SelectField
					label={$_('devices.rules.notifierType')}
					bind:value={babylonNotifierType}
					options={babylonNotifierOptions}
					required
				/>
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
			{#each subCriteria as subCriterion, index}
				<DarkCard2>
					<div class="my-2 flex flex-col gap-2 text-white">
						<div class="flex flex-row gap-4">
							<SelectField
								label={$_('devices.rules.sensorValue')}
								bind:value={subCriterion.subject}
								options={subjects}
								clearable={false}
								required
							/>
							<SelectField
								label={$_('devices.rules.operator')}
								bind:value={subCriterion.operator}
								options={operators}
								classes={{ field: { input: 'text-center' } }}
							/>
							<NumberStepper
								label={$_('devices.rules.triggerValue')}
								bind:value={subCriterion.trigger_value}
								class="w-full"
							/>
						</div>
						<NumberStepper
							label={$_('devices.rules.resetValue')}
							bind:value={subCriterion.reset_value}
							class="w-full"
						/>

						<Button
							icon={mdiMinusCircle}
							on:click={() => removeSubCriterion(index)}
							variant="fill"
							color="danger"
						>
						{$_('devices.rules.removeCriterion')}
						</Button>
					</div>
				</DarkCard2>
			{/each}
			<Button on:click={addSubCriterion} icon={mdiPlusCircle} variant="fill" color="primary"
				>{$_('devices.rules.addSubCriterion')}</Button
			>

			<Button
				on:click={submitRule}
				disabled={(subCriteria.length > 1) || !allValuesEntered}
				icon={mdiFloppy}
				variant="fill"
				color={subCriteria.length < 1 ? "warning" : "success"}>
				{#if subCriteria.length < 1}
				{$_('devices.rules.addAtLeastOneCriterion')}
				{:else}
				{$_('app.save')}
				{/if}
				</Button>
		</div>
	</DarkCard>
</div>
