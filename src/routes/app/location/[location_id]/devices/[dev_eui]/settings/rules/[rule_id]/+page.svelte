<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { generateCustomUUIDv4 } from '$lib/utilities/generateCustomUUIDv4.js';
	import { nameToJapaneseName } from '$lib/utilities/nameToJapanese.js';
	import { mdiAlert, mdiClose, mdiFunction, mdiPlusCircleOutline } from '@mdi/js';
	import {
		Avatar,
		Button,
		Card,
		Field,
		Header,
		Icon,
		Input,
		SelectField,
		TextField
	} from 'svelte-ux';
	import SuperDebug, { superForm } from 'sveltekit-superforms';
	import type { PageData } from './$types';
	import { dev } from '$app/environment';

	/**
	 * Interface for email recipient
	 */
	interface EmailRecipient {
		email: string;
		valid: boolean;
	}

	// Get page data from props
	const { data } = $props<{ data: PageData }>();

	// Initialize new email input field
	let newEmail: string = $state('');

	let messageType = $derived(
		data.notificationTypes ? data.notificationTypes.find((type) => type.id === $form.notifier_type) : 0
	);

	console.log(data.notificationTypes);
	let notificationTypeOptions = $derived(
		data.notificationTypes.map((type) => ({
			value: type.notifier_id,
			label: type.name
		}))
	);

	// Parse existing recipients or initialize empty
	let recipients: EmailRecipient[] = $state(
		data.form.data.action_recipient
			? data.form.data.action_recipient
					.split(',')
					.filter((email) => email.trim() !== '')
					.map((email) => ({ email, valid: isValidEmail(email) }))
			: []
	);

	// Config for superForm - handles validation and submission
	const { form, errors, enhance, submitting, message } = superForm(data.form, {
		onUpdate({ form }) {
			// Keep recipients in sync with form data
			if (form.data.action_recipient !== getRecipientsString()) {
				recipients = form.data.action_recipient
					.split(',')
					.filter((email) => email.trim() !== '')
					.map((email) => ({ email, valid: isValidEmail(email) }));
			}
		},
		onResult({ result }) {
			if (result.type === 'success') {
				// Navigate to settings page with Rules tab active
				goto(
					`/app/location/${$page.params.location_id}/devices/${$page.params.dev_eui}/settings?tab=Rules`
				);
			}
		}
	});

	// Determine if we're creating or editing
	const isNewRule = $page.params.rule_id === 'new';

	/**
	 * Validates email format
	 */
	function isValidEmail(email: string): boolean {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
	}

	/**
	 * Adds a new email to recipients list
	 */
	function addEmail(): void {
		if (!newEmail || !isValidEmail(newEmail)) return;

		// Check for duplicates
		if (recipients.some((r) => r.email === newEmail)) {
			return;
		}

		recipients = [...recipients, { email: newEmail, valid: true }];
		$form.action_recipient = getRecipientsString();
		newEmail = '';
	}

	/**
	 * Removes an email from recipients list
	 */
	function removeEmail(emailIndex: number): void {
		recipients = recipients.filter((_, i) => i !== emailIndex);
		$form.action_recipient = getRecipientsString();
	}

	/**
	 * Gets comma-separated recipient string for form submission
	 */
	function getRecipientsString(): string {
		return recipients.map((r) => r.email).join(',');
	}

	// Available options for the rule configuration
	const subjectOptions = data.SubjectOptions;
	const operatorOptions = [
		{ value: '=', label: '=' },
		{ value: '>', label: '>' },
		{ value: '<', label: '<' },
		{ value: '>=', label: '>=' },
		{ value: '<=', label: '<=' }
	];
</script>

<svelte:head>
	<title>{isNewRule ? 'Create New Rule' : 'Edit Rule'} | CropWatch</title>
</svelte:head>

<div class="container mx-auto p-4">
	<Card>
		<Header
			title={isNewRule ? nameToJapaneseName('Create New Rule') : nameToJapaneseName('Edit Rule')}
			subheading={nameToJapaneseName('Configure notification rules for your device')}
			slot="header"
		>
			<div slot="avatar">
				<Avatar class="bg-primary text-surface-content font-bold">
					<Icon data={mdiFunction} />
				</Avatar>
			</div>
		</Header>

		<form
			class="space-y-8"
			method="POST"
			action={isNewRule ? '?/createRule' : '?/updateRule'}
			use:enhance
		>
			<!-- Hidden fields -->
			<input type="hidden" name="dev_eui" bind:value={$page.params.dev_eui} />
			<input type="hidden" name="profile_id" value={data.session?.user.id} />
			<input type="hidden" name="babylon_notifier_type" value={$form.babylon_notifier_type} />
			<input type="hidden" name="ruleGroupId" value={$form.ruleGroupId || generateCustomUUIDv4()} />
			<input type="hidden" name="action_recipient" bind:value={$form.action_recipient} />

			<!-- Form status messages -->
			{#if $message}
				<div
					class={`rounded-md p-4 ${$message.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}
				>
					<div class="flex items-center">
						<Icon data={mdiAlert} size="1.5rem" class="mr-2" />
						<p>{$message.text}</p>
					</div>
				</div>
			{/if}

			<div class="text-primary relative p-6">
				<h3 class="text-surface-content mb-4 text-lg font-semibold">
					{nameToJapaneseName('Rule Configuration')}
				</h3>

				<div class="mb-6 grid grid-cols-1 gap-6">
					<!-- Rule Name -->
					<TextField
						type="text"
						label={nameToJapaneseName('Rule Name')}
						class="text-surface-content"
						id="name"
						name="name"
						bind:value={$form.name}
						placeholder="Enter rule name"
						error={$errors.name}
						required
					/>

					<SelectField
						class="text-surface-content"
						options={notificationTypeOptions}
						label="Notifier Type"
						placeholder="Select notification type"
						id="babylon_notifier_type"
						name="babylon_notifier_type"
						bind:value={$form.babylon_notifier_type}
						error={$errors.babylon_notifier_type}
						autoPlacement={false}
						placement="bottom-start"
						required
					/>

					<!-- Email Recipients -->
					<div>
						<div class="flex">
							<TextField
								type="email"
								id="action_recipient_input"
								class="text-surface-content flex-grow"
								bind:value={newEmail}
								label={nameToJapaneseName('Action Recipients')}
								placeholder="Enter email address"
								error={recipients.length === 0 ? 'At least one recipient is required' : ''}
							>
								<div slot="append">
									<Button
										type="button"
										class="text-surface-content"
										variant="fill-outline"
										color="primary"
										icon={mdiPlusCircleOutline}
										on:click={addEmail}
										disabled={!newEmail || !isValidEmail(newEmail)}
									>
										Add
									</Button>
								</div>
							</TextField>
						</div>

						{#if recipients.length > 0}
							<div class="mt-2 flex flex-wrap gap-2">
								{#each recipients as recipient, emailIndex}
									<div class="flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm">
										<span class={recipient.valid ? 'text-blue-800' : 'text-red-800'}>
											{recipient.email}
										</span>
										<Button
											type="button"
											class="ml-2 text-blue-500 hover:text-blue-700 focus:outline-none"
											on:click={() => removeEmail(emailIndex)}
											icon={mdiClose}
										/>
									</div>
								{/each}
							</div>
						{/if}
					</div>

					<!-- Subject and Operator -->
					<div class="flex flex-row gap-2.5">
						<b>IF</b>
						<SelectField
							class="text-surface-content"
							name="subject"
							options={subjectOptions}
							label={nameToJapaneseName('Subject')}
							bind:value={$form.subject}
							error={$errors.subject}
							autoPlacement={false}
							placement="bottom-start"
							required
						/>
						<b>IS</b>
						<SelectField
							class="text-surface-content"
							options={operatorOptions}
							label={nameToJapaneseName('Operator')}
							name="operator"
							bind:value={$form.operator}
							error={$errors.operator}
							autoPlacement={false}
							placement="bottom-start"
							required
						/>
						{#if $form.operator === '='}
							<b>TO</b>
						{:else}
							<b>THAN</b>
						{/if}
						<Field label={nameToJapaneseName('Trigger Value')} error={$errors.trigger_value}>
							<Input
								type="number"
								id="trigger_value"
								name="trigger_value"
								bind:value={$form.trigger_value}
								class="text-surface-content w-full"
								required
							/>
						</Field>
					</div>

					<!-- Trigger and Reset Values -->
					<div class="flex flex-row gap-2.5">
						{#if $form.notifier_type}
							<b>THEN A <u>{messageType.name.toUpperCase()}</u> MESSAGE WILL BE SENT, AND</b>
						{/if}
						<b
							>THE RULE WILL NOT SEND ANOTHER MESSAGE UNTIL {nameToJapaneseName($form.subject)} IS</b
						>
						<Field
							label={nameToJapaneseName('Reset Value (Hysteresis)')}
							error={$errors.reset_value}
						>
							<Input
								type="number"
								id="reset_value"
								name="reset_value"
								bind:value={$form.reset_value}
								class="text-surface-content w-full"
								required
							/>
						</Field>
					</div>
				</div>
			</div>

			<div class="flex justify-between px-6 pb-6">
				<Button
					type="button"
					variant="outline"
					color="secondary"
					on:click={() =>
						goto(
							`/app/location/${$page.params.location_id}/devices/${$page.params.dev_eui}/settings?tab=Rules`
						)}
				>
					Cancel
				</Button>

				<Button
					type="submit"
					variant="fill"
					color="primary"
					disabled={$submitting || recipients.length === 0}
				>
					{$submitting ? 'Saving...' : isNewRule ? 'Create Rule' : 'Update Rule'}
				</Button>
			</div>
		</form>
	</Card>
</div>

{#if dev}
	<SuperDebug data={$form} />
{/if}
