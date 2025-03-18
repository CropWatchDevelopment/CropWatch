<script lang="ts">
	import { page } from '$app/stores';
	import { RuleAddSchema } from '$lib/form-schemas/AddRule.schema';
	import { getUserState } from '$lib/state/user-state.svelte';
	import { generateCustomUUIDv4 } from '$lib/utilities/generateCustomUUIDv4';
	import { isValidEmail } from '$lib/utilities/isValidEmail';
	import { validateResetValue } from '$lib/utilities/ValidateResetValue';
	import { mdiAccountPlus, mdiCloseCircle, mdiContentSaveEdit, mdiEmail, mdiPlus } from '@mdi/js';
	import { Button, Card, Dialog, Icon, ListItem, SelectField, TextField, Tooltip } from 'svelte-ux';
	import SuperDebug, { superForm, type FormPath } from 'sveltekit-superforms';
	import { zod } from 'sveltekit-superforms/adapters';

	let { addRuleForm, subjects } = $props();
	let userContext = getUserState();

	let open: boolean = $state(false);

	let emailToAdd: string = $state('');
	let emailArray: string[] = $state([]);
	let emailValidate: string[] | undefined = $state([]);

	let operators = [
		{ label: '=', value: '=' },
		{ label: '>', value: '>' },
		{ label: '>=', value: '>=' },
		{ label: '<', value: '<' },
		{ label: '<=', value: '<=' }
	];

	const babylonNotifierOptions = [{ label: 'Email', value: 1 }];
	const ruleGroupId = generateCustomUUIDv4();

	const { form, errors, delayed, validate, isTainted, enhance } = $state(
		superForm(addRuleForm, {
			dataType: 'json',
			delayMs: 500,
			timeoutMs: 5000,
			validators: zod(RuleAddSchema),
			onUpdate({ form }) {
				if (form.message) {
					// Send Success Toast here
					// document.location = `/app/devices/${$page.params.dev_eui}/settings?page=rules`;
				}
			},
			onSubmit({ validators }) {
				$form.ruleGroupId = ruleGroupId;
				$form.dev_eui = $page.params.dev_eui;
				$form.profile_id = userContext.profile?.id;
				
				if (validators.length > 0) {
					// Send Error Toast here
					console.log('errors', validators);
				}
			}
		})
	);

	const validateForm = async () => {
		emailValidate = await validate('action_recipient');
	};

	const addCriteria = () => {
		$form.cw_rule_criteria.push({
			ruleGroupId: generateCustomUUIDv4(),
			subject: '',
			operator: '',
			trigger_value: '',
			reset_value: ''
		});
		$form.cw_rule_criteria = $form.cw_rule_criteria;
	};
</script>

<Tooltip title="+ Add New Rule" position="bottom">
	<Button icon={mdiPlus} variant="outline" on:click={() => (open = true)} />
</Tooltip>

<Dialog bind:open persistent>
	<div slot="title">
		<Icon data={mdiPlus} />
		Add New Rule
	</div>
	<div id="content">
		<form method="post" action="?/createRule" use:enhance>
			<div class="px-4">
				<div class="flex flex-col gap-2">
					<div class="flex flex-row justify-between gap-2">
						<TextField
							label="Rule Name"
							bind:value={$form.name}
							name="name"
							aria-invalid={$errors.name ? 'true' : undefined}
							errors={$errors.name}
							required
						/>
						<SelectField
							label="Notifier Type"
							bind:value={$form.babylon_notifier_type}
							name="babylon_notifier_type"
							options={babylonNotifierOptions}
							required
							aria-invalid={$errors.babylon_notifier_type ? 'true' : undefined}
							errors={$errors.babylon_notifier_type}
						/>
					</div>

					<div class="flex flex-row gap-2">
						<TextField label="Recipient" type="email" bind:value={emailToAdd} class="w-full" />
						<Button
							icon={mdiAccountPlus}
							variant="fill"
							color="success"
							on:click={() => {
								if (emailArray.includes(emailToAdd)) {
									// Send Toast here
									return false;
								}
								if (!isValidEmail(emailToAdd)) {
									// "Send invalid email toast here"
									return false;
								}
								emailArray.push(emailToAdd);
								emailArray = emailArray;
								emailToAdd = '';
								$form.action_recipient = emailArray.join(',');
							}}
						/>
					</div>
					<Card>
						<div class="text-surface">
							<p class="text-surface-content">Added Emails:</p>
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
								{#if emailValidate && emailValidate.length > 0}
									<p class="font-extrabold text-red-400">Please add at least 1 email address</p>
								{/if}
							</ul>
						</div>
					</Card>

					<div class="px-10">
						<hr />
					</div>

					<h2>Criteria</h2>
					{#each $form.cw_rule_criteria as _, i}
						<div>
							<h3>Rule Criteria #{0 + 1}</h3>
							<div class="grid grid-cols-3 gap-2">
								<input type="hidden" name="id" value={$form.cw_rule_criteria[i].ruleGroupId} />
								<SelectField
									label="Subject"
									options={subjects.map((subject: string) => ({ label: subject, value: subject }))}
									bind:value={$form.cw_rule_criteria[i].subject}
									required
								/>
								<SelectField
									label="Operator"
									options={operators}
									bind:value={$form.cw_rule_criteria[i].operator}
									required
									on:change={() => validateResetValue($form.cw_rule_criteria[i])}
								/>
								<TextField
									label="Trigger Value"
									type="decimal"
									bind:value={$form.cw_rule_criteria[i].trigger_value}
									required
									on:change={() => validateResetValue($form.cw_rule_criteria[i].trigger_value)}
								/>
							</div>
							<div class="mt-2">
								<TextField
									label="Reset Value"
									type="decimal"
									bind:value={$form.cw_rule_criteria[i].reset_value}
									required
									on:change={() => validateResetValue($form.cw_rule_criteria[i])}
								/>
							</div>
						</div>
					{/each}

					<div>
						<input type="hidden" name="action_recipient" value={$form.action_recipient} />
						<input
							type="hidden"
							name="ruleGroupId"
							value={$form.ruleGroupId ? $form.ruleGroupId : generateCustomUUIDv4()}
						/>
						<input type="hidden" name="dev_eui" value={$page.params.dev_eui} />
						<input type="hidden" name="cw_rule_criteria" value={$form.cw_rule_criteria} />
						<Button
							type="submit"
							on:click={() => validateForm()}
							icon={mdiContentSaveEdit}
							variant="fill"
							loading={$delayed}
							color="primary"
						>
							Update/Save Rule
						</Button>
					</div>
				</div>
			</div>
		</form>
	</div>
	<div slot="actions">
		{#if $form.cw_rule_criteria.length == 0}
			<Button on:click={() => addCriteria()}>Add Criteria</Button>
		{/if}
		<Button type="submit" variant="fill" color="success">Save Rule</Button>
		<Button on:click={() => (open = false)}>Cancel</Button>
	</div>

	<SuperDebug data={$form} />
</Dialog>
