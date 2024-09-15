<script lang="ts">
	import DarkCard from '$lib/components/ui/Cards/DarkCard.svelte';
	import DarkCard2 from '$lib/components/ui/Cards/DarkCard2.svelte';
	import { isValidEmail } from '$lib/components/ui/utilities/isValidEmail';
	import { notificationStore } from '$lib/stores/notificationStore';
	import {
		mdiAccountPlus,
		mdiCheckCircle,
		mdiCloseCircle,
		mdiEmail,
		mdiFloppy,
		mdiPlusCircle
	} from '@mdi/js';
	import { Button, TextField, SelectField, ListItem, NumberStepper } from 'svelte-ux';
	import { _ } from 'svelte-i18n';
	import SuperDebug, { superForm } from 'sveltekit-superforms';
	import { appStore } from '$lib/stores/app.store.js';
	import { onMount } from 'svelte';

	export let data;
	const { form, errors, delayed, enhance } = superForm(data.form, {
		dataType: 'json',
		delayMs: 500,
		timeoutMs: 5000,
		onUpdate({ form }) {
			if (form.message) {
				localStorage.clear();
				notificationStore.NotificationTimedOpen({
					title: 'Success!',
					description: form.message.text,
					buttonText: 'Close',
					timeout: 5000,
					icon: mdiCheckCircle
				});
			}
		}
	});

	let emailArray: string[] = [];
	let emailToAdd = '';

	let operators = [
		{ label: '=', value: '=' },
		{ label: '>', value: '>' },
		{ label: '>=', value: '>=' },
		{ label: '<', value: '<' },
		{ label: '<=', value: '<=' }
	];

	const babylonNotifierOptions = [
		{ label: 'Email', value: 1 },
		{ label: 'LINE', value: 2 }
	];

	const addNewCriterion = () => {
		$form.cw_rule_criteria.push({
			subject: '',
			operator: '>',
			trigger_value: 0,
			reset_value: -10,
			ruleGroupId: $form.ruleGroupId
		});
		$form.cw_rule_criteria = $form.cw_rule_criteria;
	};

	onMount(() => {
		addNewCriterion();
	})
</script>

<form method="post" use:enhance>
	<div class="px-4">
		<DarkCard title={$_('devices.rules.addRule')}>
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
				{#each $form.cw_rule_criteria as criterion, i}
					<div>
						<h3>{$_('devices.rules.criteria')} {i + 1}</h3>
						<div class="grid grid-cols-3 gap-2">
							<SelectField
								label={$_('devices.rules.subject')}
								name="cw_rule_criteria"
								options={data.subjects}
								bind:value={$form.cw_rule_criteria[i].subject}
								errors={$errors.cw_rule_criteria?.[i]?.subject}
								aria-invalid={$errors.cw_rule_criteria?.[i]?.subject ? 'true' : undefined}
								required
							/>
							<SelectField
								label={$_('devices.rules.operator')}
								name="cw_rule_criteria"
								options={operators}
								bind:value={$form.cw_rule_criteria[i].operator}
								errors={$errors.cw_rule_criteria?.[i]?.operator}
								aria-invalid={$errors.cw_rule_criteria?.[i]?.operator ? 'true' : undefined}
								required
							/>
							<TextField
								label={$_('devices.rules.triggerValue')}
								name="cw_rule_criteria"
								type="decimal"
								bind:value={$form.cw_rule_criteria[i].trigger_value}
								aria-invalid={$errors.cw_rule_criteria?.[i]?.trigger_value ? 'true' : undefined}
								errors={$errors.cw_rule_criteria?.[i]?.trigger_value}
								required
							/>
						</div>
						<TextField
							label={$_('devices.rules.resetValue')}
							name="cw_rule_criteria"
							type="decimal"
							bind:value={$form.cw_rule_criteria[i].reset_value}
							aria-invalid={$errors.cw_rule_criteria?.[i]?.reset_value ? 'true' : undefined}
							errors={$errors.cw_rule_criteria?.[i]?.reset_value}
							required
						/>
					</div>
				{/each}

				<div>
					<!-- <Button
						on:click={() => addNewCriterion()}
						icon={mdiPlusCircle}
						variant="fill"
						color="primary">{$_('devices.rules.addSubCriterion')}</Button
					> -->

					<input type="hidden" name="action_recipient" value={$form.action_recipient} />
					<input type="hidden" name="ruleGroupId" value={$form.ruleGroupId} />
					<input type="hidden" name="dev_eui" value={$form.dev_eui} />
					<input type="hidden" name="cw_rule_criteria" value={$form.cw_rule_criteria} />
					<Button type="submit" icon={mdiFloppy} variant="fill" loading={$delayed} color="primary">
						{$_('app.save')}
					</Button>
				</div>
			</div>
		</DarkCard>
	</div>
</form>
<!-- {#if $appStore.debugMode} -->
	<SuperDebug data={$form} />
<!-- {/if} -->