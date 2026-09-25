<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages.js';
	import { AppNotice, AppPage } from '$lib/components/layout';
	import { CwButton, CwCard, CwCopy } from '@cropwatchdevelopment/cwui';
	import { getAppContext } from '$lib/appContext.svelte';
	import { cwCopyLabels } from '$lib/i18n/cwuiLabels';
	import { orgRoleLabel, orgTypeLabel } from '$lib/auth/org-labels';
	import LeaveOrganizationDialog from './LeaveOrganizationDialog.svelte';

	let { data } = $props();
	const app = getAppContext();

	const ctx = $derived(app.orgContext);
	const org = $derived(data.organization);
	const canLeave = $derived(Boolean(ctx?.org && ctx.org.role !== 'owner'));
	let leaveDialogOpen = $state(false);
</script>

<svelte:head>
	<title>{m.organization_page_title()}</title>
</svelte:head>

<AppPage width="md">
	<CwButton variant="secondary" size="sm" onclick={() => goto(resolve('/'))}>
		&larr; {m.action_back()}
	</CwButton>

	{#if ctx?.suspended}
		<AppNotice tone="warning">
			<p>{m.organization_suspended_notice()}</p>
		</AppNotice>
	{/if}

	{#if !ctx?.org}
		<AppNotice tone="neutral">
			<p>{m.organization_none()}</p>
		</AppNotice>
	{:else}
		<CwCard title={m.organization_page_title()} elevated>
			<dl class="org-details">
				<div class="org-details__row">
					<dt>{m.common_name()}</dt>
					<dd>{org?.name ?? ctx.org.name}</dd>
				</div>
				<div class="org-details__row">
					<dt>{m.organization_type_label()}</dt>
					<dd>{orgTypeLabel(org?.type ?? ctx.org.type)}</dd>
				</div>
				<div class="org-details__row">
					<dt>{m.organization_role_label()}</dt>
					<dd>{orgRoleLabel(ctx.org.role)}</dd>
				</div>
				<div class="org-details__row">
					<dt>{m.organization_id_label()}</dt>
					<dd>
						<CwCopy value={ctx.org.id} size="sm" labels={cwCopyLabels()}>
							<code class="org-details__id">{ctx.org.id}</code>
						</CwCopy>
					</dd>
				</div>
			</dl>

			{#if org?.parent}
				<AppNotice tone="info">
					<p>{m.organization_linked_to({ name: org.parent.name ?? org.parent.id })}</p>
				</AppNotice>
			{/if}

			{#if canLeave}
				<div class="org-details__leave">
					<CwButton variant="danger" onclick={() => (leaveDialogOpen = true)}>
						{m.organization_leave()}
					</CwButton>
				</div>
			{/if}
		</CwCard>

		{#if ctx.guest_orgs.length > 0}
			<CwCard title={m.organization_guest_orgs_title()} elevated>
				<ul class="org-list">
					{#each ctx.guest_orgs as guestOrg (guestOrg.id)}
						<li class="org-list__row">
							<span>{guestOrg.name}</span>
							{#if guestOrg.expires_at}
								<span class="org-list__meta">
									{m.organization_guest_until({
										date: new Date(guestOrg.expires_at).toLocaleDateString()
									})}
								</span>
							{/if}
						</li>
					{/each}
				</ul>
			</CwCard>
		{/if}

		{#if ctx.child_orgs.length > 0}
			<CwCard title={m.organization_child_orgs_title()} elevated>
				<ul class="org-list">
					{#each ctx.child_orgs as childOrg (childOrg.id)}
						<li class="org-list__row"><span>{childOrg.name}</span></li>
					{/each}
				</ul>
			</CwCard>
		{/if}
	{/if}
</AppPage>

<LeaveOrganizationDialog bind:open={leaveDialogOpen} />

<style>
	.org-details {
		display: flex;
		flex-direction: column;
		margin: 0;
		padding: var(--cw-space-4);
		gap: var(--cw-space-3);
	}

	.org-details__row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--cw-space-2);
	}

	.org-details__row dt {
		font-weight: var(--cw-font-semibold);
	}

	.org-details__row dd {
		margin: 0;
	}

	.org-details__id {
		font-size: 0.8125rem;
		word-break: break-all;
	}

	.org-details__leave {
		display: flex;
		justify-content: flex-end;
		padding: 0 var(--cw-space-4) var(--cw-space-4);
	}

	.org-list {
		display: flex;
		flex-direction: column;
		margin: 0;
		padding: var(--cw-space-4);
		gap: var(--cw-space-2);
		list-style: none;
	}

	.org-list__row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--cw-space-2);
	}

	.org-list__meta {
		color: var(--cw-text-secondary, inherit);
		font-size: 0.875rem;
	}
</style>
