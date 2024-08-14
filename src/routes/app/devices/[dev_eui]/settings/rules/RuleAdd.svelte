<script lang="ts">
	import { page } from '$app/stores';
	import DarkCard from '$lib/components/ui/Cards/DarkCard.svelte';
	import DarkCard2 from '$lib/components/ui/Cards/DarkCard2.svelte';
	import { convertObject } from '$lib/components/ui/utilities/ConvertSensorDataObject';
	import { isValidEmail } from '$lib/components/ui/utilities/isValidEmail';
	import { notificationStore } from '$lib/stores/notificationStore';
	import type { Tables } from '$lib/types/supabaseSchema';
	import { mdiAccountPlus, mdiCloseCircle, mdiEmail, mdiFloppy, mdiMinusCircle, mdiPlusCircle } from '@mdi/js';
	import { onMount } from 'svelte';
	import { Button, TextField, SelectField, Checkbox, ListItem, NumberStepper } from 'svelte-ux';

	type rule = Tables<'cw_rules'>;
	type ruleCriteria = Tables<'cw_rule_criteria'>[];
	let subCriteria: ruleCriteria[] = []; // Use the newly defined type

	let ruleName = '';
	let babylonNotifierType = '';
	let actionRecipient = '';
	let isTriggered = false;
	let ruleGroupId = '';
	let devEui = '';
	let profileId = '';
	let emailArray: string[] = [];
	let emailToAdd = '';
	let operators = [
		{ label: '=', value: '=' },
		{ label: '>', value: '>' },
		{ label: '<', value: '<' }
	];
	let subjects: [{ label: string; value: string }] | [] = [];
	let latestData;

	const babylonNotifierOptions = [
		{ label: 'Email', value: '1' },
		{ label: 'SMS', value: '2' },
		{ label: 'Webhook', value: '3' }
	];

	const addSubCriterion = () => {
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
			action_recipient: actionRecipient,
			is_triggered: isTriggered,
			ruleGroupId: ruleGroupId,
			dev_eui: devEui,
			profile_id: profileId,
			sub_criteria: subCriteria
		};

		const response = await fetch('/api/rules', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(ruleData)
		});

		if (response.ok) {
			alert('Rule added successfully!');
		} else {
			alert('Failed to add rule.');
		}
	};

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

<div class="px-4">
	<DarkCard title="Add New Rule">
		<div class="flex flex-col gap-2">
			<div class="flex flex-row justify-between gap-2">
				<TextField label="Rule Name" bind:value={ruleName} required />
				<SelectField
					label="Notifier Type"
					bind:value={babylonNotifierType}
					options={babylonNotifierOptions}
					required
				/>
			</div>

			<div class="flex flex-row gap-2">
				<TextField
					label="Action Recipient"
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
								title: 'Email Already Added!',
								description: 'List cannot contain duplicates',
								timeout: 2000,
								icon: '❌',
								buttonText: 'OK'
							});
							return false;
						}
						if (!isValidEmail(emailToAdd)) {
							notificationStore.NotificationTimedOpen({
								title: 'Email Address NOT valid!',
								description: 'Please enter a valid email address',
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
					<p>Added Email List:</p>
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
							<p>Please add at least 1 email address</p>
						{/if}
					</ul>
				</div>
			</DarkCard2>

			<input type="hidden" bind:value={devEui} required />

			<div class="px-10">
				<hr />
			</div>

			<h2>Criteria</h2>
			{#each subCriteria as subCriterion, index}
				<DarkCard2>
					<div class="my-2 flex flex-col gap-2 text-white">
						<div class="flex flex-row gap-4">
							<SelectField
								label="Sensor Value"
								bind:value={subCriterion.subject}
								options={subjects}
								required
							/>
							<SelectField
								label="Operator"
								bind:value={subCriterion.operator}
								options={operators}
								classes={{ field: { input: 'text-center' } }}
							/>
							<NumberStepper
								label="Trigger Value"
								bind:value={subCriterion.trigger_value}
								class="w-full"
							/>
						</div>
						<NumberStepper
							label="Reset Value"
							bind:value={subCriterion.reset_value}
							class="w-full"
						/>

						<Button icon={mdiMinusCircle} on:click={() => removeSubCriterion(index)} variant="fill" color="danger">
							Remove Criterion
						</Button>
					</div>
				</DarkCard2>
			{/each}
			<Button on:click={addSubCriterion} icon={mdiPlusCircle} variant="fill" color="primary">Add Sub Criterion</Button>

			<Button on:click={submitRule} icon={mdiFloppy} variant="fill" color="success">Submit Rule</Button>
		</div>
	</DarkCard>
</div>
