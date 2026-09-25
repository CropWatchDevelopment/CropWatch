<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { CwButton, CwCard, CwInput, useCwToast } from '@cropwatchdevelopment/cwui';
	import { m } from '$lib/paraglide/messages.js';
	import { AppActionRow, AppFormStack, AppNotice } from '$lib/components/layout';
	import { cwInputLabels } from '$lib/i18n/cwuiLabels';
	import { getAppContext } from '$lib/appContext.svelte';
	import { submitPageAction } from '$lib/forms/submit-page-action';

	let { data, form } = $props();
	const app = getAppContext();
	const toast = useCwToast();

	const ctx = $derived(app.orgContext);
	const orgsEnabled = $derived(ctx?.orgs_enabled ?? false);
	const organization = $derived(data.organization);
	const children = $derived(data.children?.children ?? []);
	const pendingChildRequests = $derived(
		(data.children?.pending_requests ?? []).filter((request) => request.status === 'pending')
	);
	const pendingParentRequests = $derived(
		data.parentRequests.filter((request) => request.status === 'pending')
	);

	// Capture once so a reactive re-seed cannot clobber the user's typing.
	const initialName = (() => data.organization?.name ?? '')();
	let orgName = $state(initialName);
	let companyName = $state('');
	let childOrgId = $state('');
	let renaming = $state(false);
	let upgrading = $state(false);
	let linking = $state(false);
	let busyId = $state<string | null>(null);

	function enhanceHandler(
		setBusy: (value: boolean) => void,
		successMessage: () => string,
		onSuccess?: () => void
	) {
		return () => {
			setBusy(true);
			return async ({ result }: { result: import('@sveltejs/kit').ActionResult }) => {
				setBusy(false);
				if (result.type === 'success') {
					toast.add({ tone: 'success', message: successMessage() });
					onSuccess?.();
					await invalidateAll();
					return;
				}
				await applyAction(result);
				if (result.type === 'failure' && typeof result.data?.error === 'string') {
					toast.add({ tone: 'danger', message: result.data.error });
				}
			};
		};
	}

	async function decideRequest(requestId: string, decision: 'accept' | 'decline') {
		if (busyId) return;
		busyId = requestId;
		try {
			const result = await submitPageAction('decideRequest', {
				request_id: requestId,
				decision
			});
			toast.add(
				result.ok
					? { tone: 'success', message: m.management_link_decided() }
					: { tone: 'danger', message: result.error ?? m.generic_error() }
			);
		} finally {
			busyId = null;
		}
	}

	async function unlinkChild(childId: string) {
		if (busyId) return;
		busyId = childId;
		try {
			const result = await submitPageAction('unlinkChild', { child_id: childId });
			toast.add(
				result.ok
					? { tone: 'success', message: m.management_unlinked() }
					: { tone: 'danger', message: result.error ?? m.generic_error() }
			);
		} finally {
			busyId = null;
		}
	}
</script>

<svelte:head>
	<title>{m.management_settings_title()}</title>
</svelte:head>

{#if !orgsEnabled}
	<AppNotice tone="neutral">
		<p>{m.management_orgs_disabled_notice()}</p>
	</AppNotice>
{/if}

<CwCard title={m.management_rename_title()} elevated>
	<form
		method="POST"
		action="?/rename"
		use:enhance={enhanceHandler(
			(value) => (renaming = value),
			() => m.management_rename_saved()
		)}
	>
		<AppFormStack padded>
			{#if form?.error}
				<AppNotice tone="danger">
					<p>{form.error}</p>
				</AppNotice>
			{/if}
			<CwInput
				label={m.common_name()}
				labels={cwInputLabels()}
				name="name"
				bind:value={orgName}
				required
			/>
			<AppActionRow>
				<CwButton
					type="submit"
					variant="primary"
					loading={renaming}
					disabled={orgName.trim().length === 0}
				>
					{m.action_save_changes()}
				</CwButton>
			</AppActionRow>
		</AppFormStack>
	</form>
</CwCard>

{#if organization?.type === 'personal'}
	<CwCard title={m.management_upgrade_title()} elevated>
		<form
			method="POST"
			action="?/upgrade"
			use:enhance={enhanceHandler(
				(value) => (upgrading = value),
				() => m.management_upgraded()
			)}
		>
			<AppFormStack padded>
				<p class="management-copy">{m.management_upgrade_body()}</p>
				<CwInput
					label={m.management_upgrade_name_label()}
					labels={cwInputLabels()}
					name="name"
					bind:value={companyName}
					required
					disabled={!orgsEnabled}
				/>
				<AppActionRow>
					<CwButton
						type="submit"
						variant="primary"
						loading={upgrading}
						disabled={!orgsEnabled || companyName.trim().length === 0}
					>
						{m.management_upgrade_button()}
					</CwButton>
				</AppActionRow>
			</AppFormStack>
		</form>
	</CwCard>
{/if}

<CwCard title={m.management_links_title()} elevated>
	<div class="management-links">
		{#if organization?.parent}
			<AppNotice tone="info">
				<p>
					{m.organization_linked_to({ name: organization.parent.name ?? organization.parent.id })}
				</p>
			</AppNotice>
		{/if}

		{#if pendingParentRequests.length > 0}
			<h3 class="management-subtitle">{m.management_parent_requests_title()}</h3>
			<ul class="management-list">
				{#each pendingParentRequests as request (request.id)}
					<li class="management-list__row">
						<span>
							{m.management_parent_request_body({
								name: request.organizations?.name ?? request.parent_org_id
							})}
						</span>
						<span class="management-row-actions">
							<CwButton
								size="sm"
								variant="primary"
								disabled={!orgsEnabled}
								loading={busyId === request.id}
								onclick={() => decideRequest(request.id, 'accept')}
							>
								{m.management_approve()}
							</CwButton>
							<CwButton
								size="sm"
								variant="ghost"
								loading={busyId === request.id}
								onclick={() => decideRequest(request.id, 'decline')}
							>
								{m.management_decline()}
							</CwButton>
						</span>
					</li>
				{/each}
			</ul>
		{/if}

		{#if children.length === 0 && pendingChildRequests.length === 0}
			<p class="management-copy">{m.management_children_empty()}</p>
		{:else}
			<ul class="management-list">
				{#each children as child (child.id)}
					<li class="management-list__row">
						<span>{child.name}</span>
						<CwButton
							size="sm"
							variant="danger"
							loading={busyId === child.id}
							onclick={() => unlinkChild(child.id)}
						>
							{m.management_unlink()}
						</CwButton>
					</li>
				{/each}
				{#each pendingChildRequests as request (request.id)}
					<li class="management-list__row">
						<span class="management-meta">
							{m.management_link_pending()} · {request.child_org_id}
						</span>
					</li>
				{/each}
			</ul>
		{/if}

		<form
			method="POST"
			action="?/linkRequest"
			use:enhance={enhanceHandler(
				(value) => (linking = value),
				() => m.management_link_request_sent(),
				() => (childOrgId = '')
			)}
		>
			<div class="management-link-form">
				<CwInput
					label={m.management_link_request_label()}
					labels={cwInputLabels()}
					name="child_org_id"
					bind:value={childOrgId}
					hint={m.management_link_request_hint()}
					disabled={!orgsEnabled}
				/>
				<CwButton
					type="submit"
					variant="secondary"
					loading={linking}
					disabled={!orgsEnabled || childOrgId.trim().length === 0}
				>
					{m.management_link_request_button()}
				</CwButton>
			</div>
		</form>
	</div>
</CwCard>

<CwCard title={m.management_transfer_title()} elevated>
	<p class="management-copy management-copy--padded">{m.management_transfer_body()}</p>
</CwCard>

<style>
	.management-copy {
		margin: 0;
	}

	.management-copy--padded {
		padding: var(--cw-space-4);
	}

	.management-links {
		display: flex;
		flex-direction: column;
		gap: var(--cw-space-4);
		padding: var(--cw-space-4);
	}

	.management-subtitle {
		margin: 0;
		font-size: 0.9375rem;
		font-weight: var(--cw-font-semibold);
	}

	.management-list {
		display: flex;
		flex-direction: column;
		margin: 0;
		padding: 0;
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

	.management-row-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--cw-space-2);
	}

	.management-meta {
		color: var(--cw-text-secondary, inherit);
		font-size: 0.875rem;
	}

	.management-link-form {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		gap: var(--cw-space-3);
	}
</style>
