<script lang="ts">
	import DarkCard from '$lib/components/ui/Cards/DarkCard.svelte';
	import DarkCard2 from '$lib/components/ui/Cards/DarkCard2.svelte';
	import { isValidEmail } from '$lib/components/ui/utilities/isValidEmail';
	import { notificationStore } from '$lib/stores/notificationStore';
	import { mdiAccountPlus, mdiContentSaveEdit, mdiCheckCircle, mdiCloseCircle, mdiEmail } from '@mdi/js';
	import { Button, TextField, SelectField, ListItem } from 'svelte-ux';
	import { _ } from 'svelte-i18n';
	import SuperDebug, { superForm } from 'sveltekit-superforms';
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { generateCustomUUIDv4 } from '$lib/components/ui/utilities/generateCustomUUIDv4.js';
	import { zod } from 'sveltekit-superforms/adapters';
	import { RuleAddSchema } from '$lib/forms/AddRule.schema.js';

	export let data;

	const { form, errors, delayed, enhance, validate } = superForm(data.form, {
		dataType: 'json',
		delayMs: 500,
		timeoutMs: 5000,
		validators: zod(RuleAddSchema),
		onUpdate({ form }) {
			if (form.message) {
				notificationStore.NotificationTimedOpen({
					title: 'Success!',
					description: form.message.text,
					buttonText: 'Close',
					timeout: 5000,
					icon: mdiCheckCircle
				});
                document.location = (`/app/devices/${$page.params.dev_eui}/settings?page=rules`);
			}
		}
	});


	let emailArray: string[] = data.form.data.action_recipient ? data.form.data.action_recipient.split(',') : [];
	let emailToAdd = '';
	let emailValidate: string[] = [];

	let operators = [
		{ label: '=', value: '=' },
		{ label: '>', value: '>' },
		{ label: '>=', value: '>=' },
		{ label: '<', value: '<' },
		{ label: '<=', value: '<=' }
	];

	const babylonNotifierOptions = [
		{ label: 'Email', value: 1 },
		{ label: 'LINE', value: 2, disabled: true },
		{ label: 'Webhook', value: 3 },
		{ label: 'Relay', value: 4 }
	];

	const addNewCriterion = () => {
        // data.form?.data?.ruleGroupId = $form.ruleGroupId;
		$form.cw_rule_criteria.push({
			subject: '',
			operator: '>',
			trigger_value: 0,
			reset_value: -10,
			ruleGroupId: data.form.data.ruleGroupId ? $form.ruleGroupId : generateCustomUUIDv4(),
		});
		$form.cw_rule_criteria = $form.cw_rule_criteria;
	};

	// Only add new criterion on mount if we are adding a new rule
	onMount(async () => {
		if (data.isNew) {
			addNewCriterion();
		}
		
	});

	const validateForm = async () => {
		emailValidate = await validate('action_recipient');
	}

	// Function to validate reset value based on the selected operator
	const validateResetValue = (criterion) => {
		if (criterion.operator === '>' || criterion.operator === '>=') {
			if (criterion.reset_value >= criterion.trigger_value) {
				notificationStore.NotificationTimedOpen({
					title: 'Invalid Reset Value',
					description: 'Reset value must be less than the trigger value for the selected operator.',
					timeout: 3000,
					icon: '❌',
					buttonText: 'OK'
				});
				criterion.reset_value = criterion.trigger_value - 1;
			}
		} else if (criterion.operator === '<' || criterion.operator === '<=') {
			if (criterion.reset_value <= criterion.trigger_value) {
				notificationStore.NotificationTimedOpen({
					title: 'Invalid Reset Value',
					description:
						'Reset value must be greater than the trigger value for the selected operator.',
					timeout: 3000,
					icon: '❌',
					buttonText: 'OK'
				});
				criterion.reset_value = criterion.trigger_value + 1;
			}
		}
	};
</script>

<form method="post" use:enhance>
	<div class="px-4">
		<DarkCard
			title={data.form.data.ruleGroupId ? $_('devices.rules.editRule') : $_('devices.rules.addRule')}
		>
			<div class="flex flex-col gap-2">
				<div class="flex flex-row justify-between gap-2">
					<TextField
						label={$_('devices.rules.ruleName')}
						bind:value={$form.name}
						name="name"
						aria-invalid={$errors.name ? 'true' : undefined}
						errors={$errors.name}
						required
					/>
					<SelectField
						label={$_('devices.rules.notifierType')}
						bind:value={$form.babylon_notifier_type}
						name="babylon_notifier_type"
						options={babylonNotifierOptions}
						required
						aria-invalid={$errors.babylon_notifier_type ? 'true' : undefined}
						errors={$errors.babylon_notifier_type}
					/>
				</div>

				<div class="flex flex-row gap-2">
					<TextField
						label={$_('devices.rules.actionRecipient')}
						type="email"
						bind:value={emailToAdd}
						class="w-full"
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
							$form.action_recipient = emailArray.join(',');
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
												$form.action_recipient = emailArray.join(',');
											}}
											classes={{ icon: 'text-red-500' }}
										/>
									</div>
								</ListItem>
							{/each}
							{#if emailValidate.length > 0}
								<p class="text-red-400 font-extrabold">{$_('devices.rules.pleaseAddAtLeastOneEmail')}</p>
							{/if}
						</ul>
					</div>
				</DarkCard2>

				<div class="px-10">
					<hr />
				</div>

				<h2>{$_('devices.rules.criteria')}</h2>
				{#each $form.cw_rule_criteria as criterion, i}
					<div>
						<h3>{$_('devices.rules.criteria')} {0 + 1}</h3>
						<div class="grid grid-cols-3 gap-2">
							<input type="hidden" name="id" value={criterion.ruleGroupId} />
							<SelectField
								label={$_('devices.rules.subject')}
								name="cw_rule_criteria"
								options={data.subjects}
								bind:value={criterion.subject}
								errors={$errors.cw_rule_criteria?.[i]?.subject}
								aria-invalid={$errors.cw_rule_criteria?.[i]?.subject ? 'true' : undefined}
								required
							/>
							<SelectField
								label={$_('devices.rules.operator')}
								name="cw_rule_criteria"
								options={operators}
								bind:value={criterion.operator}
								errors={$errors.cw_rule_criteria?.[i]?.operator}
								aria-invalid={$errors.cw_rule_criteria?.[i]?.operator ? 'true' : undefined}
								required
								on:change={() => validateResetValue($form.cw_rule_criteria[i])}
							/>
							<TextField
								label={$_('devices.rules.triggerValue')}
								name="cw_rule_criteria"
								type="decimal"
								bind:value={criterion.trigger_value}
								aria-invalid={$errors.cw_rule_criteria?.[i]?.trigger_value ? 'true' : undefined}
								errors={$errors.cw_rule_criteria?.[i]?.trigger_value}
								required
								on:change={() => validateResetValue(criterion)}
							/>
						</div>
						<div class="mt-2">
							<TextField
								label={$_('devices.rules.resetValue')}
								name="cw_rule_criteria"
								type="decimal"
								bind:value={criterion.reset_value}
								aria-invalid={$errors.cw_rule_criteria?.[i]?.reset_value ? 'true' : undefined}
								errors={$errors.cw_rule_criteria?.[i]?.reset_value}
								required
								on:change={() => validateResetValue($form.cw_rule_criteria[i])}
							/>
						</div>
					</div>
				{/each}

				<div>
					<input type="hidden" name="action_recipient" value={$form.action_recipient} />
					<input type="hidden" name="ruleGroupId" value={$form.ruleGroupId ? $form.ruleGroupId : generateCustomUUIDv4()} />
					<input type="hidden" name="dev_eui" value={$page.params.dev_eui} />
					<input type="hidden" name="cw_rule_criteria" value={$form.cw_rule_criteria} />
					<Button type="submit" on:click={() => validateForm()} icon={mdiContentSaveEdit} variant="fill" loading={$delayed} color="primary">
						{$_(data.form.data.ruleGroupId ? 'app.update' : 'app.save')}
					</Button>
				</div>
			</div>
		</DarkCard>
	</div>
</form>
<!-- {#if $appStore.debugMode} -->
	<SuperDebug data={$form} />
<!-- {/if} -->
