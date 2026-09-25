<script lang="ts">
	import '../../login/style.css';
	import { applyAction, enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import logo from '$lib/images/cropwatch_static.svg';
	import { m } from '$lib/paraglide/messages.js';
	import { AppNotice } from '$lib/components/layout';
	import { CwButton, CwCard, useCwToast } from '@cropwatchdevelopment/cwui';
	import { orgRoleLabel } from '$lib/auth/org-labels';
	import type { OrgRole } from '$lib/api/api.dtos';

	let { data, form } = $props();
	const toast = useCwToast();

	let submitting = $state(false);

	const invitePath = $derived(`/auth/invite/${data.token}`);
	const loginHref = $derived(
		`${resolve('/auth/login')}?redirect=${encodeURIComponent(invitePath)}`
	);
	const createAccountHref = $derived(
		`${resolve('/auth/create-account')}?invite=1&redirect=${encodeURIComponent(invitePath)}`
	);
</script>

<svelte:head>
	<title>{m.invite_page_title()}</title>
</svelte:head>

<CwCard padded={false} class="auth-card">
	<div class="auth-shell">
		<div class="logo-frame">
			<img src={logo} alt={m.app_name()} class="logo-image" />
		</div>

		<h1 class="auth-title">{m.invite_heading()}</h1>

		{#if !data.preview || data.preview.status !== 'pending'}
			<AppNotice tone="danger">
				<p>{m.invite_not_found()}</p>
			</AppNotice>
		{:else}
			<dl class="invite-details">
				<div class="invite-details__row">
					<dt>{m.invite_org_label()}</dt>
					<dd>{data.preview.org_name ?? m.common_not_available()}</dd>
				</div>
				<div class="invite-details__row">
					<dt>{m.invite_role_label()}</dt>
					<dd>{orgRoleLabel(data.preview.role as OrgRole)}</dd>
				</div>
				<div class="invite-details__row">
					<dt>{m.invite_email_label()}</dt>
					<dd>{data.preview.masked_email}</dd>
				</div>
				{#if data.preview.invited_by}
					<div class="invite-details__row">
						<dt>{m.invite_invited_by()}</dt>
						<dd>{data.preview.invited_by}</dd>
					</div>
				{/if}
				<div class="invite-details__row">
					<dt>{m.invite_expires()}</dt>
					<dd>{new Date(data.preview.expires_at).toLocaleDateString()}</dd>
				</div>
			</dl>

			{#if form?.error}
				<AppNotice tone="danger">
					<p>{form.error}</p>
				</AppNotice>
			{/if}

			{#if data.loggedIn}
				<form
					method="POST"
					action="?/accept"
					use:enhance={() => {
						submitting = true;
						return async ({ result }) => {
							submitting = false;
							if (result.type === 'success') {
								toast.add({ tone: 'success', message: m.invite_accepted() });
								await goto(resolve('/'), { invalidateAll: true });
								return;
							}
							await applyAction(result);
						};
					}}
				>
					<CwButton type="submit" variant="primary" loading={submitting} class="invite-accept">
						{m.invite_accept()}
					</CwButton>
				</form>
			{:else}
				<AppNotice tone="info">
					<p>{m.invite_login_prompt()}</p>
				</AppNotice>
				<div class="invite-auth-actions">
					<CwButton variant="primary" onclick={() => window.location.assign(loginHref)}>
						{m.invite_sign_in()}
					</CwButton>
					<CwButton variant="secondary" onclick={() => window.location.assign(createAccountHref)}>
						{m.invite_create_account()}
					</CwButton>
				</div>
			{/if}
		{/if}
	</div>
</CwCard>

<style>
	.invite-details {
		display: flex;
		flex-direction: column;
		margin: 0;
		gap: var(--cw-space-2);
		text-align: start;
	}

	.invite-details__row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--cw-space-2);
	}

	.invite-details__row dt {
		font-weight: var(--cw-font-semibold);
	}

	.invite-details__row dd {
		margin: 0;
	}

	.invite-auth-actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--cw-space-3);
	}

	:global(.invite-accept) {
		width: 100%;
	}
</style>
