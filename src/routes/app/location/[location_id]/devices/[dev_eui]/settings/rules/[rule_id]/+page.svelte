<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { generateCustomUUIDv4 } from '$lib/utilities/generateCustomUUIDv4.js';
	import { nameToJapaneseName } from '$lib/utilities/nameToJapanese.js';
	import { mdiClose, mdiFunction, mdiPlus } from '@mdi/js';
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
	import { superForm, superValidate, type FormPath } from 'sveltekit-superforms';

	let { data } = $props();

	let newEmail = $state('');
	// let form = $state(data.rulesForm.data);
	const { form, errors, enhance, isTainted } = $derived(
		superForm(data.form, {
			// dataType: 'json',
			onResult({ result }) {
				if (result.type === 'success') {
					goto('/app/location/' + $page.params.location_id + '/devices/' + $page.params.dev_eui + '/settings?tab=Rules');
				}
			}
		})
	);

	let action_recipientState = $state($form.action_recipient ?? '');
	let rule_id = $page.params.rule_id;

	function removeRule(index: number) {
		$form.rules = $form.rules.filter((_, i) => i !== index);
	}

	function addEmail() {
		if (newEmail && isValidEmail(newEmail)) {
			const temparray = $form.action_recipient.split(',');
			temparray.push(newEmail);
			action_recipientState = temparray.filter((d) => d != '').join(',');
			newEmail = '';
		}
	}

	function removeEmail(ruleIndex: number, emailIndex: number) {
		$form.action_recipient = $form.action_recipient
			.split(',')
			.filter((_, i) => i !== emailIndex)
			.join(',');
	}

	function isValidEmail(email: string) {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
	}

	const subjectOptions = data.SubjectOptions;

	// Available operators for the dropdown
	const operatorOptions = [
		{ value: '=', label: '=' },
		{ value: '>', label: '>' },
		{ value: '<', label: '<' },
		{ value: '>=', label: '>=' },
		{ value: '<=', label: '<=' }
	];

</script>

<Card>
	<Header title="Rule Configuration" subheading="Subheading" slot="header">
		<div slot="avatar">
			<Avatar class="bg-primary font-bold text-primary-content">
				<Icon data={mdiFunction} />
			</Avatar>
		</div>
	</Header>
	<form class="space-y-8" action={rule_id === 'new' ? "?/createRule" : `?/updateRule`} method="post" use:enhance>
		<input type="hidden" name="dev_eui" bind:value={$page.params.dev_eui} />
		<input type="hidden" name="profile_id" value={data.session?.user.id} />
		<input type="hidden" name="babylon_notifier_type" value="1" />
		<input type="hidden" name="ruleGroupId" value={generateCustomUUIDv4()} />
		<input type="hidden" name="action_recipient" bind:value={action_recipientState} />

		<!-- {#each $form.rules as rule, ruleIndex (ruleIndex)} -->
		<div class="relative p-6 text-primary">
			<!-- {#if $form.rules.length > 1}
			<Button
				type="button"
				class="absolute right-3 top-3 text-red-500 hover:text-red-700"
				on:click={() => removeRule(ruleIndex)}
				icon={mdiClose}
			/>
			{/if} -->

			<h3 class="mb-4 text-lg font-semibold text-primary-content">{nameToJapaneseName('Rule')}</h3>

			<div class="mb-6 grid grid-cols-1 gap-6">
				<!-- Rule Name -->
				<div>
					<TextField
						type="text"
						label="Rule Name"
						class="text-primary-content"
						id="name"
						name="name"
						bind:value={$form.name}
						placeholder="Enter rule name"
					/>
				</div>

				<!-- Email Recipients -->
				<div>
					<div class="flex">
						<TextField
							type="email"
							id="action_recipient_Frontend"
							class="flex-grow text-primary-content"
							bind:value={newEmail}
							label="Action Recipients"
							placeholder="Enter email address"
						>
							<div slot="append">
								<Button
									type="button"
									class="text-primary-content"
									variant="outline"
									icon={mdiPlus}
									on:click={() => addEmail()}>Add</Button
								>
							</div></TextField
						>
					</div>

					{#if action_recipientState.length > 0}
						<div class="mt-2 flex flex-wrap gap-2">
							{#each action_recipientState.split(',') as email, emailIndex}
								<div class="flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm">
									<span class="text-blue-800">{email}</span>
									<Button
										type="button"
										class="ml-2 text-blue-500 hover:text-blue-700 focus:outline-none"
										on:click={() => removeEmail(0, emailIndex)}
										icon={mdiClose}
									/>
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Subject, Operator, and Values -->
				<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
					<div>
						<SelectField
							class="text-primary-content"
							name="subject"
							options={subjectOptions}
							label="Subject"
							bind:value={$form.subject}
						/>
					</div>

					<div>
						<SelectField
							class="text-primary-content"
							options={operatorOptions}
							label="Operator"
							name="operator"
							bind:value={$form.operator}
						/>
					</div>
				</div>

				<div class="grid grid-cols-1 gap-6 md:grid-cols-2">
					<div>
						<Field label="Trigger Value">
							<Input
								type="number"
								id="trigger"
								name="trigger_value"
								bind:value={$form.trigger_value}
								class="w-full text-primary-content"
							/>
						</Field>
					</div>

					<div>
						<Field label="Reset Value" id="reset">
							<Input
								type="number"
								label="Reset Value (Hysteresis)"
								id="reset"
								bind:value={$form.reset_value}
								name="reset_value"
								class="w-full text-primary-content"
							/>
						</Field>
					</div>
				</div>
			</div>
		</div>
		<!-- {/each} -->

		<div class="flex justify-between">
			<!-- <Button
				type="button"
				class="rounded-md bg-green-500 px-4 py-2 text-white hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
				on:click={addRule}
			>
				Add Rule
			</Button> -->

			<Button
				type="submit"
				class="rounded-md bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
			>
				{rule_id == 'new' ? 'Save Rule' : 'Update Rule'}
			</Button>
		</div>
	</form>
</Card>

