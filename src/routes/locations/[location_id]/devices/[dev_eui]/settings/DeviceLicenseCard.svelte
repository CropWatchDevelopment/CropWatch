<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { AppActionRow, AppFormStack, AppNotice } from '$lib/components/layout';
	import { m } from '$lib/paraglide/messages.js';
	import { CwButton, CwCard, CwChip, CwDialog } from '@cropwatchdevelopment/cwui';
	type DeviceLicenseSummary = { id: number; seatIndex: number; manual: boolean };

	type FormPayload = {
		action?: string;
		success?: boolean;
		message?: string;
	} | null;

	interface Props {
		license: DeviceLicenseSummary | null;
		form: FormPayload;
	}

	let { license, form }: Props = $props();

	let confirmOpen = $state(false);
	let submitting = $state(false);
	let formElement = $state<HTMLFormElement | null>(null);

	const licenseForm = $derived(form?.action === 'unassignLicense' ? form : null);
</script>

<CwCard title={m.devices_license_card_title()} elevated>
	{#snippet actions()}
		{#if license}
			<CwChip
				label={license.manual
					? m.billing_manual_included()
					: m.billing_license_seat({ seat: license.seatIndex + 1 })}
				tone="success"
				variant="soft"
				size="sm"
			/>
		{/if}
	{/snippet}

	<form
		id="device-license-form"
		method="POST"
		action="?/unassignLicense"
		bind:this={formElement}
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				try {
					await update({ reset: false });
				} finally {
					submitting = false;
					confirmOpen = false;
				}
			};
		}}
	>
		<AppFormStack padded>
			{#if licenseForm?.message}
				<AppNotice tone={licenseForm.success ? 'success' : 'danger'}>
					<p>{licenseForm.message}</p>
				</AppNotice>
			{/if}

			{#if license}
				<input type="hidden" name="licenseId" value={license.id} />
				<p class="device-license-copy">{m.devices_license_assigned_body()}</p>
				<AppActionRow>
					<CwButton
						id="device-license-unassign-button"
						type="button"
						variant="ghost"
						onclick={() => (confirmOpen = true)}
						disabled={submitting}
					>
						{m.devices_license_unassign()}
					</CwButton>
				</AppActionRow>
			{:else}
				<AppNotice tone="neutral">
					<p>{m.devices_license_none_assigned()}</p>
					<div>
						<CwButton
							id="device-license-go-to-billing-button"
							type="button"
							variant="secondary"
							size="sm"
							onclick={() => goto(resolve('/account/billing'))}
						>
							{m.nav_billing()}
						</CwButton>
					</div>
				</AppNotice>
			{/if}
		</AppFormStack>
	</form>
</CwCard>

<CwDialog bind:open={confirmOpen} title={m.devices_license_unassign()}>
	<p>{m.devices_license_unassign_confirm()}</p>
	{#snippet actions()}
		<CwButton
			id="device-license-unassign-dismiss-button"
			variant="ghost"
			onclick={() => (confirmOpen = false)}
			disabled={submitting}
		>
			{m.action_cancel()}
		</CwButton>
		<CwButton
			id="device-license-unassign-confirm-button"
			variant="danger"
			onclick={() => formElement?.requestSubmit()}
			loading={submitting}
		>
			{m.devices_license_unassign()}
		</CwButton>
	{/snippet}
</CwDialog>

<style>
	.device-license-copy {
		margin: 0;
		font-size: var(--cw-text-sm);
		color: var(--cw-text-secondary);
	}
</style>
