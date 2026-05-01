<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import {
		deleteRuleTemplate,
		readRuleTemplateApiError
	} from '$lib/rules-new/rule-template-client';
	import { CwButton, CwDialog, useCwToast } from '@cropwatchdevelopment/cwui';
	import { m } from '$lib/paraglide/messages.js';
	import TRASH_ICON from '$lib/images/icons/trash.svg';

	interface Props {
		templateId: number;
		ruleName: string;
		onDeleted?: (templateId: number) => void | Promise<void>;
	}

	let { templateId, ruleName, onDeleted }: Props = $props();

	const toast = useCwToast();
	let open = $state(false);
	let deleting = $state(false);

	async function handleDelete() {
		if (deleting) return;
		deleting = true;

		try {
			await deleteRuleTemplate(templateId);
			open = false;
			await onDeleted?.(templateId);
			toast.add({
				tone: 'success',
				message: m.rules_new_deleted_success({ name: ruleName }),
				duration: 4000,
				dismissible: true
			});
		} catch (error) {
			toast.add({
				tone: 'danger',
				message: readRuleTemplateApiError(error, m.rules_new_delete_failed()),
				duration: 5000,
				dismissible: true
			});
		} finally {
			deleting = false;
		}
	}
</script>

<CwButton variant="danger" size="md" disabled={deleting} onclick={() => (open = true)}>
	<Icon src={TRASH_ICON} alt={m.action_delete()} />
</CwButton>

<CwDialog bind:open title={m.rules_new_delete_template()}>
	<p>{m.rules_delete_confirmation({ name: ruleName })}</p>

	{#snippet actions()}
		<div class="rules-new-delete-dialog__actions">
			<CwButton variant="secondary" size="md" disabled={deleting} onclick={() => (open = false)}>
				{m.action_cancel()}
			</CwButton>
			<CwButton
				variant="danger"
				size="md"
				loading={deleting}
				disabled={deleting}
				onclick={handleDelete}
			>
				{m.action_delete()}
			</CwButton>
		</div>
	{/snippet}
</CwDialog>

<style>
	.rules-new-delete-dialog__actions {
		display: flex;
		justify-content: flex-end;
		gap: var(--cw-space-2);
	}

	@media (max-width: 639px) {
		.rules-new-delete-dialog__actions {
			flex-direction: column;
		}
	}
</style>
