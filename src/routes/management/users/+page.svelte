<script lang="ts">
	import {
		CwButton,
		CwDataTable,
		useCwToast,
		type CwColumnDef,
		type CwTableQuery,
		type CwTableResult
	} from '@cropwatchdevelopment/cwui';
	import { m } from '$lib/paraglide/messages.js';
	import { AppNotice } from '$lib/components/layout';
	import { CwCard } from '@cropwatchdevelopment/cwui';
	import { cwDataTableLabels } from '$lib/i18n/cwuiLabels';
	import { getAppContext } from '$lib/appContext.svelte';
	import type { OrgMemberDto } from '$lib/api/api.dtos';
	import {
		assignableRoles,
		canRemove,
		canSuspend,
		inviteableRoles
	} from '$lib/auth/org-member-policy';
	import { orgRoleLabel } from '$lib/auth/org-labels';
	import { submitPageAction } from '$lib/forms/submit-page-action';
	import InviteUserDialog from './InviteUserDialog.svelte';
	import ChangeRoleDialog from './ChangeRoleDialog.svelte';
	import SuspendMemberDialog from './SuspendMemberDialog.svelte';
	import RemoveMemberDialog from './RemoveMemberDialog.svelte';

	let { data } = $props();
	const app = getAppContext();
	const toast = useCwToast();

	const ctx = $derived(app.orgContext);
	// Staff act with owner authority (the API grants them the same bypass).
	const myRole = $derived(ctx?.is_staff ? ('owner' as const) : (ctx?.org?.role ?? null));
	const myUserId = $derived(app.session?.sub ?? '');
	const orgsEnabled = $derived(ctx?.orgs_enabled ?? false);

	const members = $derived(data.members.filter((member) => member.role !== 'guest'));
	const guests = $derived(data.members.filter((member) => member.role === 'guest'));
	const pendingInvites = $derived(data.invites.filter((invite) => invite.status === 'pending'));
	const membersKey = $derived(
		members.map((member) => `${member.user_id}:${member.role}:${member.status}`).join('|')
	);

	let inviteOpen = $state(false);
	let selectedMember = $state<OrgMemberDto | null>(null);
	let changeRoleOpen = $state(false);
	let suspendOpen = $state(false);
	let removeOpen = $state(false);
	let busyUserId = $state<string | null>(null);
	let busyInviteId = $state<string | null>(null);

	const loadData = async (query: CwTableQuery): Promise<CwTableResult<OrgMemberDto>> => {
		void query;
		return { rows: members, total: members.length };
	};

	function openDialog(member: OrgMemberDto, which: 'role' | 'suspend' | 'remove') {
		selectedMember = member;
		changeRoleOpen = which === 'role';
		suspendOpen = which === 'suspend';
		removeOpen = which === 'remove';
	}

	async function reinstate(member: OrgMemberDto) {
		if (busyUserId) return;
		busyUserId = member.user_id;
		try {
			const result = await submitPageAction('reinstate', { user_id: member.user_id });
			toast.add(
				result.ok
					? { tone: 'success', message: m.management_reinstated_done() }
					: { tone: 'danger', message: result.error ?? m.generic_error() }
			);
		} finally {
			busyUserId = null;
		}
	}

	async function inviteAction(inviteId: string, action: 'revokeInvite' | 'resendInvite') {
		if (busyInviteId) return;
		busyInviteId = inviteId;
		try {
			const result = await submitPageAction(action, { invite_id: inviteId });
			toast.add(
				result.ok
					? {
							tone: 'success',
							message:
								action === 'revokeInvite'
									? m.management_invite_revoked()
									: m.management_invite_resent()
						}
					: { tone: 'danger', message: result.error ?? m.generic_error() }
			);
		} finally {
			busyInviteId = null;
		}
	}
</script>

<svelte:head>
	<title>{m.management_page_title()}</title>
</svelte:head>

{#if !orgsEnabled}
	<AppNotice tone="neutral">
		<p>{m.management_orgs_disabled_notice()}</p>
	</AppNotice>
{/if}

<CwCard title={m.management_members_title()} elevated>
	<div class="management-toolbar">
		<CwButton
			variant="primary"
			size="sm"
			disabled={!orgsEnabled || inviteableRoles(myRole).length === 0}
			onclick={() => (inviteOpen = true)}
		>
			{m.management_invite_button()}
		</CwButton>
	</div>

	{#key membersKey}
		<CwDataTable
			id="management-members-table"
			labels={cwDataTableLabels()}
			{loadData}
			rowKey="user_id"
			rowActionsHeader={m.common_actions()}
			columns={[
				{ key: 'full_name', header: m.common_name() },
				{ key: 'email', header: m.management_col_email() },
				{ key: 'role', header: m.management_col_role() },
				{ key: 'status', header: m.management_col_status() }
			]}
		>
			{#snippet cell(row: OrgMemberDto, col: CwColumnDef<OrgMemberDto>, defaultValue: string)}
				{#if col.key === 'role'}
					{orgRoleLabel(row.role)}
				{:else if col.key === 'status'}
					{row.status === 'suspended'
						? m.management_status_suspended()
						: m.management_status_active()}
				{:else}
					{defaultValue}
				{/if}
			{/snippet}
			{#snippet rowActions(row: OrgMemberDto)}
				{@const isSelf = row.user_id === myUserId}
				<span class="management-row-actions">
					{#if assignableRoles(myRole, row.role).length > 0 && !isSelf}
						<CwButton size="sm" variant="ghost" onclick={() => openDialog(row, 'role')}>
							{m.management_change_role_title()}
						</CwButton>
					{/if}
					{#if canSuspend(myRole, row.role, isSelf)}
						{#if row.status === 'suspended'}
							<CwButton
								size="sm"
								variant="ghost"
								loading={busyUserId === row.user_id}
								onclick={() => reinstate(row)}
							>
								{m.management_reinstate()}
							</CwButton>
						{:else}
							<CwButton size="sm" variant="ghost" onclick={() => openDialog(row, 'suspend')}>
								{m.management_suspend()}
							</CwButton>
						{/if}
					{/if}
					{#if canRemove(myRole, row.role, isSelf) && !isSelf}
						<CwButton size="sm" variant="danger" onclick={() => openDialog(row, 'remove')}>
							{m.action_remove()}
						</CwButton>
					{/if}
				</span>
			{/snippet}
			{#snippet emptyState()}
				<p class="management-empty">{m.management_members_empty()}</p>
			{/snippet}
		</CwDataTable>
	{/key}
</CwCard>

{#if myRole === 'owner'}
	<CwCard title={m.management_guests_title()} elevated>
		{#if guests.length === 0}
			<p class="management-empty">{m.management_guests_empty()}</p>
		{:else}
			<ul class="management-list">
				{#each guests as guest (guest.user_id)}
					<li class="management-list__row">
						<span class="management-list__main">
							<span>{guest.full_name ?? guest.email ?? guest.user_id}</span>
							{#if guest.full_name && guest.email}
								<span class="management-list__meta">{guest.email}</span>
							{/if}
						</span>
						<span class="management-row-actions">
							{#if guest.expires_at}
								<span class="management-list__meta">
									{m.organization_guest_until({
										date: new Date(guest.expires_at).toLocaleDateString()
									})}
								</span>
							{/if}
							{#if guest.status === 'suspended'}
								<CwButton
									size="sm"
									variant="ghost"
									loading={busyUserId === guest.user_id}
									onclick={() => reinstate(guest)}
								>
									{m.management_reinstate()}
								</CwButton>
							{:else}
								<CwButton size="sm" variant="ghost" onclick={() => openDialog(guest, 'suspend')}>
									{m.management_suspend()}
								</CwButton>
							{/if}
							<CwButton size="sm" variant="danger" onclick={() => openDialog(guest, 'remove')}>
								{m.action_remove()}
							</CwButton>
						</span>
					</li>
				{/each}
			</ul>
		{/if}
	</CwCard>
{/if}

<CwCard title={m.management_invites_title()} elevated>
	{#if pendingInvites.length === 0}
		<p class="management-empty">{m.management_invites_empty()}</p>
	{:else}
		<ul class="management-list">
			{#each pendingInvites as invite (invite.id)}
				<li class="management-list__row">
					<span class="management-list__main">
						<span>{invite.email}</span>
						<span class="management-list__meta">
							{orgRoleLabel(invite.role)} ·
							{m.management_invite_expires({
								date: new Date(invite.expires_at).toLocaleDateString()
							})}
						</span>
					</span>
					<span class="management-row-actions">
						<CwButton
							size="sm"
							variant="ghost"
							disabled={!orgsEnabled}
							loading={busyInviteId === invite.id}
							onclick={() => inviteAction(invite.id, 'resendInvite')}
						>
							{m.management_invite_resend()}
						</CwButton>
						<CwButton
							size="sm"
							variant="danger"
							loading={busyInviteId === invite.id}
							onclick={() => inviteAction(invite.id, 'revokeInvite')}
						>
							{m.management_invite_revoke()}
						</CwButton>
					</span>
				</li>
			{/each}
		</ul>
	{/if}
</CwCard>

<InviteUserDialog bind:open={inviteOpen} roles={inviteableRoles(myRole)} {orgsEnabled} />
<ChangeRoleDialog
	bind:open={changeRoleOpen}
	member={selectedMember}
	roles={selectedMember ? assignableRoles(myRole, selectedMember.role) : []}
/>
<SuspendMemberDialog bind:open={suspendOpen} member={selectedMember} />
<RemoveMemberDialog bind:open={removeOpen} member={selectedMember} />

<style>
	.management-toolbar {
		display: flex;
		justify-content: flex-end;
		padding: var(--cw-space-4) var(--cw-space-4) 0;
	}

	.management-row-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--cw-space-2);
	}

	.management-empty {
		padding: var(--cw-space-4);
		margin: 0;
	}

	.management-list {
		display: flex;
		flex-direction: column;
		margin: 0;
		padding: var(--cw-space-4);
		gap: var(--cw-space-3);
		list-style: none;
	}

	.management-list__row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--cw-space-2);
	}

	.management-list__main {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.management-list__meta {
		color: var(--cw-text-secondary, inherit);
		font-size: 0.875rem;
	}
</style>
