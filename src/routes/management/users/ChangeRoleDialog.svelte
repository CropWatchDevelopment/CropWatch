<script lang="ts">
	import { CwButton, CwDialog, CwDropdown, useCwToast } from '@cropwatchdevelopment/cwui';
	import { m } from '$lib/paraglide/messages.js';
	import type { OrgMemberDto, OrgRole } from '$lib/api/api.dtos';
	import { cwDropdownLabels } from '$lib/i18n/cwuiLabels';
	import { orgRoleLabel } from '$lib/auth/org-labels';
	import { submitPageAction } from '$lib/forms/submit-page-action';

	let {
		open = $bindable(false),
		member,
		roles
	}: { open?: boolean; member: OrgMemberDto | null; roles: OrgRole[] } = $props();

	const toast = useCwToast();

	let role = $state('');
	let submitting = $state(false);

	const roleOptions = $derived(roles.map((r) => ({ label: orgRoleLabel(r), value: r })));
	const canSubmit = $derived(Boolean(member) && roles.includes(role as OrgRole));

	async function saveRole() {
		if (!member || !canSubmit || submitting) return;
		submitting = true;
		try {
			const result = await submitPageAction('updateRole', { user_id: member.user_id, role });
			if (result.ok) {
				toast.add({ tone: 'success', message: m.management_member_updated() });
				open = false;
				role = '';
			} else {
				toast.add({ tone: 'danger', message: result.error ?? m.generic_error() });
			}
		} finally {
			submitting = false;
		}
	}
</script>

<CwDialog bind:open title={m.management_change_role_title()}>
	{#if member}
		<div class="role-fields">
			<p>{member.full_name ?? member.email ?? member.user_id}</p>
			<CwDropdown
				label={m.management_invite_role_label()}
				labels={cwDropdownLabels()}
				options={roleOptions}
				bind:value={role}
				placeholder={orgRoleLabel(member.role)}
			/>
		</div>
	{/if}

	{#snippet actions()}
		<CwButton variant="ghost" onclick={() => (open = false)}>
			{m.action_cancel()}
		</CwButton>
		<CwButton variant="primary" loading={submitting} disabled={!canSubmit} onclick={saveRole}>
			{m.action_save_changes()}
		</CwButton>
	{/snippet}
</CwDialog>

<style>
	.role-fields {
		display: flex;
		flex-direction: column;
		gap: var(--cw-space-3);
	}

	.role-fields p {
		margin: 0;
		font-weight: var(--cw-font-semibold);
	}
</style>
