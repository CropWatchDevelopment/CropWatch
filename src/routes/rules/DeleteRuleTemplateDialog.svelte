<script lang="ts">
	import { apiErrorMessage } from '#lib/api/api-error.ts';
	import { AppNotice } from '#lib/components/layout/index.ts';
	import type { RuleRefDto } from '#lib/rules/rule-template.types.ts';
	import Icon from '#lib/components/Icon.svelte';
	import { getServices } from '#lib/services/context.ts';
	import { CwButton, CwDialog, useCwToast } from '@cropwatchdevelopment/cwui';
	import { m } from '#lib/paraglide/messages.js';
	import TRASH_ICON from '#lib/images/icons/trash.svg';
	import { readRuleDependents } from './rule-dependents.ts';

	interface Props {
		templateId: number;
		ruleName: string;
		onDeleted?: (templateId: number) => void | Promise<void>;
	}

	let { templateId, ruleName, onDeleted }: Props = $props();

	const toast = useCwToast();
	const { rules } = getServices();
	let open = $state(false);
	let deleting = $state(false);
	// Rules that start or pause this one. The API refuses the first delete and
	// lists them; the second click ("Delete anyway") is the confirmation.
	let dependents = $state<RuleRefDto[]>([]);

	async function handleDelete() {
		if (deleting) return;
		deleting = true;

		try {
			await rules.deleteRuleTemplate(templateId, { force: dependents.length > 0 });
			open = false;
			dependents = [];
			await onDeleted?.(templateId);
			toast.add({
				tone: 'success',
				message: m.rules_new_deleted_success({ name: ruleName }),
				duration: 4000,
				dismissible: true
			});
		} catch (error) {
			const blocking = readRuleDependents(error);
			if (blocking.length > 0 && dependents.length === 0) {
				// Not a failure: the dialog now shows who depends on the rule and asks again.
				dependents = blocking;
				return;
			}
			toast.add({
				tone: 'danger',
				message: apiErrorMessage(error, m.rules_new_delete_failed()),
				duration: 5000,
				dismissible: true
			});
		} finally {
			deleting = false;
		}
	}
</script>

<CwButton
	id={`rule-delete-${templateId}-open-button`}
	variant="danger"
	size="sm"
	disabled={deleting}
	onclick={() => {
		dependents = [];
		open = true;
	}}
>
	<Icon src={TRASH_ICON} alt={m.action_delete()} />
</CwButton>

<CwDialog bind:open title={m.rules_new_delete_template()}>
	<p class="rules-new-delete-dialog__text">{m.rules_delete_confirmation({ name: ruleName })}</p>

	{#if dependents.length > 0}
		<AppNotice tone="warning" title={m.rules_delete_dependents_title()} ariaLive="polite">
			<p class="rules-new-delete-dialog__text">{m.rules_delete_dependents_hint()}</p>
			<ul class="rules-new-delete-dialog__list" id={`rule-delete-${templateId}-dependents`}>
				{#each dependents as dependent (dependent.id)}
					<li>
						{dependent.name ?? m.rules_delete_dependents_hidden({ id: String(dependent.id) })}
					</li>
				{/each}
			</ul>
		</AppNotice>
	{/if}

	{#snippet actions()}
		<div class="rules-new-delete-dialog__actions">
			<CwButton
				id={`rule-delete-${templateId}-cancel-button`}
				variant="secondary"
				size="md"
				disabled={deleting}
				onclick={() => (open = false)}
			>
				{m.action_cancel()}
			</CwButton>
			<CwButton
				id={`rule-delete-${templateId}-delete-button`}
				variant="danger"
				size="md"
				loading={deleting}
				disabled={deleting}
				onclick={handleDelete}
			>
				{dependents.length > 0 ? m.rules_delete_anyway() : m.action_delete()}
			</CwButton>
		</div>
	{/snippet}
</CwDialog>

<style>
	/* The dialog is rendered inside the table's actions cell, which does not wrap its text. */
	.rules-new-delete-dialog__text,
	.rules-new-delete-dialog__list {
		margin: 0;
		white-space: normal;
		text-align: start;
	}

	.rules-new-delete-dialog__list {
		padding-inline-start: var(--cw-space-4);
		list-style: disc;
	}

	.rules-new-delete-dialog__actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--cw-space-1);
	}

	@media (max-width: 639px) {
		.rules-new-delete-dialog__actions {
			flex-direction: column;
		}
	}
</style>
