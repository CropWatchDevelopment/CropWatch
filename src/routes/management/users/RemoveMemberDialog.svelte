<script lang="ts">
	import { CwButton, CwDialog, useCwToast } from '@cropwatchdevelopment/cwui';
	import { m } from '$lib/paraglide/messages.js';
	import type { OrgMemberDto } from '$lib/api/api.dtos';
	import { submitPageAction } from '$lib/forms/submit-page-action';

	let { open = $bindable(false), member }: { open?: boolean; member: OrgMemberDto | null } =
		$props();

	const toast = useCwToast();
	let submitting = $state(false);

	async function confirmRemove() {
		if (!member || submitting) return;
		submitting = true;
		try {
			const result = await submitPageAction('remove', { user_id: member.user_id });
			if (result.ok) {
				toast.add({ tone: 'success', message: m.management_removed_done() });
				open = false;
			} else {
				toast.add({ tone: 'danger', message: result.error ?? m.generic_error() });
			}
		} finally {
			submitting = false;
		}
	}
</script>

<CwDialog bind:open title={m.management_remove_title()}>
	{#if member}
		<p>
			{m.management_remove_body({ name: member.full_name ?? member.email ?? member.user_id })}
		</p>
	{/if}

	{#snippet actions()}
		<CwButton variant="ghost" onclick={() => (open = false)}>
			{m.action_cancel()}
		</CwButton>
		<CwButton variant="danger" loading={submitting} onclick={confirmRemove}>
			{m.action_remove()}
		</CwButton>
	{/snippet}
</CwDialog>
