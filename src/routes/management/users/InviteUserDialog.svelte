<script lang="ts">
	import { CwButton, CwDialog, CwDropdown, CwInput, useCwToast } from '@cropwatchdevelopment/cwui';
	import { m } from '$lib/paraglide/messages.js';
	import type { OrgRole } from '$lib/api/api.dtos';
	import { cwDropdownLabels, cwInputLabels } from '$lib/i18n/cwuiLabels';
	import { orgRoleLabel } from '$lib/auth/org-labels';
	import { submitPageAction } from '$lib/forms/submit-page-action';

	let {
		open = $bindable(false),
		roles,
		orgsEnabled
	}: { open?: boolean; roles: OrgRole[]; orgsEnabled: boolean } = $props();

	const toast = useCwToast();

	let email = $state('');
	let role = $state('member');
	let expires = $state('');
	let submitting = $state(false);

	const roleOptions = $derived(roles.map((r) => ({ label: orgRoleLabel(r), value: r })));
	const canSubmit = $derived(
		orgsEnabled && email.trim().length > 3 && roles.includes(role as OrgRole)
	);

	async function sendInvite() {
		if (!canSubmit || submitting) return;
		submitting = true;
		try {
			const result = await submitPageAction('invite', {
				email: email.trim(),
				role,
				member_expires_at: role === 'guest' ? expires.trim() : ''
			});
			if (result.ok) {
				toast.add({ tone: 'success', message: m.management_invite_sent() });
				email = '';
				expires = '';
				open = false;
			} else {
				toast.add({ tone: 'danger', message: result.error ?? m.generic_error() });
			}
		} finally {
			submitting = false;
		}
	}
</script>

<CwDialog bind:open title={m.management_invite_title()}>
	<div class="invite-fields">
		<CwInput
			label={m.auth_email_label()}
			labels={cwInputLabels()}
			type="email"
			name="email"
			bind:value={email}
			placeholder={m.auth_email_placeholder()}
			required
		/>
		<CwDropdown
			label={m.management_invite_role_label()}
			labels={cwDropdownLabels()}
			options={roleOptions}
			bind:value={role}
		/>
		{#if role === 'guest'}
			<CwInput
				label={m.management_invite_expiry_label()}
				labels={cwInputLabels()}
				name="member_expires_at"
				bind:value={expires}
				placeholder="YYYY-MM-DD"
				hint={m.management_invite_expiry_hint()}
			/>
		{/if}
	</div>

	{#snippet actions()}
		<CwButton variant="ghost" onclick={() => (open = false)}>
			{m.action_cancel()}
		</CwButton>
		<CwButton variant="primary" loading={submitting} disabled={!canSubmit} onclick={sendInvite}>
			{m.management_invite_send()}
		</CwButton>
	{/snippet}
</CwDialog>

<style>
	.invite-fields {
		display: flex;
		flex-direction: column;
		gap: var(--cw-space-3);
	}
</style>
