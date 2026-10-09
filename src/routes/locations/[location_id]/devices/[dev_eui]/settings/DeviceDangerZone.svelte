<script lang="ts">
	import { enhance } from '$app/forms';
	import { AppActionRow, AppFormStack, AppNotice } from '$lib/components/layout';
	import { m } from '$lib/paraglide/messages.js';
	import { CwButton, CwCard, CwCheckbox, CwDialog, CwInput } from '@cropwatchdevelopment/cwui';
	import {
		ACKNOWLEDGE_FIELD,
		ACKNOWLEDGE_VALUE,
		CONFIRM_DEV_EUI_FIELD,
		devEuiConfirmed,
		normalizeDevEui
	} from './delete-confirmation';

	type FormPayload = {
		action?: string;
		success?: boolean;
		message?: string;
	} | null;

	interface Props {
		devEui: string;
		deviceName: string;
		form: FormPayload;
	}

	/**
	 * The API deletes sensor data in time-boxed chunks and answers
	 * `inProgress` until the device row itself is gone, so the form re-submits
	 * itself. Bounded so a misbehaving API cannot loop forever (200 chunks is
	 * several times the data of the largest device).
	 */
	const MAX_CONTINUATIONS = 200;

	let { devEui, deviceName, form }: Props = $props();

	let confirmOpen = $state(false);
	let submitting = $state(false);
	let confirmDevEui = $state('');
	let acknowledged = $state(false);
	let purgedSoFar = $state(0);
	let continuations = 0;
	let formElement = $state<HTMLFormElement | null>(null);

	const deleteForm = $derived(form?.action === 'deleteDevice' ? form : null);
	const displayDevEui = $derived(normalizeDevEui(devEui));
	const confirmMatches = $derived(devEuiConfirmed(devEui, confirmDevEui));
	// Flag a wrong DevEUI only once the user has typed as many characters as it has.
	const confirmMismatch = $derived(
		!confirmMatches && normalizeDevEui(confirmDevEui).length >= displayDevEui.length
	);

	function openConfirm() {
		confirmDevEui = '';
		acknowledged = false;
		confirmOpen = true;
	}

	function resetProgress() {
		submitting = false;
		continuations = 0;
		purgedSoFar = 0;
	}
</script>

<div class="device-danger-zone">
	<CwCard title={m.devices_danger_zone_title()} elevated>
		<form
			id="device-delete-form"
			method="POST"
			action="?/deleteDevice"
			bind:this={formElement}
			use:enhance={({ cancel }) => {
				if (!confirmMatches || !acknowledged) {
					resetProgress();
					cancel();
					return;
				}
				submitting = true;
				return async ({ result, update }) => {
					if (
						result.type === 'failure' &&
						result.data?.inProgress === true &&
						continuations < MAX_CONTINUATIONS
					) {
						continuations += 1;
						purgedSoFar += Number(result.data.purgedRows) || 0;
						formElement?.requestSubmit();
						return;
					}
					try {
						// Success is a redirect to the location page; errors (and a
						// chunked delete that hit MAX_CONTINUATIONS) land in the notice.
						await update({ reset: false });
					} finally {
						resetProgress();
						if (result.type !== 'redirect') {
							confirmOpen = false;
						}
					}
				};
			}}
		>
			<input type="hidden" name={CONFIRM_DEV_EUI_FIELD} value={confirmDevEui} />
			<input type="hidden" name={ACKNOWLEDGE_FIELD} value={acknowledged ? ACKNOWLEDGE_VALUE : ''} />
			<AppFormStack padded>
				{#if deleteForm?.message}
					<AppNotice tone="danger">
						<p>{deleteForm.message}</p>
					</AppNotice>
				{/if}

				<div>
					<p class="device-danger-zone__row-title">{m.devices_delete_row_title()}</p>
					<p class="device-danger-zone__copy">{m.devices_delete_row_body()}</p>
				</div>
				<AppActionRow>
					<CwButton
						id="device-delete-open-button"
						type="button"
						variant="danger"
						onclick={openConfirm}
						loading={submitting}
						disabled={submitting}
					>
						{m.devices_delete_button()}
					</CwButton>
				</AppActionRow>
			</AppFormStack>
		</form>
	</CwCard>
</div>

<CwDialog
	bind:open={confirmOpen}
	title={m.devices_delete_dialog_title({ name: deviceName || displayDevEui })}
	hideClose={submitting}
	closeOnBackdrop={!submitting}
	closeOnEscape={!submitting}
>
	<div class="device-danger-zone__dialog">
		<AppNotice tone="danger" title={m.devices_delete_irreversible()}>
			<p>{m.devices_delete_will_remove()}</p>
			<ul class="device-danger-zone__list">
				<li>{m.devices_delete_item_history()}</li>
				<li>{m.devices_delete_item_notes()}</li>
				<li>{m.devices_delete_item_rules()}</li>
				<li>{m.devices_delete_item_reports()}</li>
				<li>{m.devices_delete_item_access()}</li>
			</ul>
		</AppNotice>

		<p class="device-danger-zone__copy">{m.devices_delete_license_note()}</p>

		<dl class="device-danger-zone__identity">
			<dt>{m.devices_device_name_label()}</dt>
			<dd>{deviceName || displayDevEui}</dd>
			<dt>{m.devices_delete_confirm_label()}</dt>
			<dd><code>{displayDevEui}</code></dd>
		</dl>

		<CwInput
			id="device-delete-confirm-input"
			label={m.devices_delete_confirm_prompt({ devEui: displayDevEui })}
			autocomplete="off"
			disabled={submitting}
			error={confirmMismatch ? m.devices_delete_confirm_mismatch() : undefined}
			bind:value={confirmDevEui}
		/>
		<CwCheckbox
			id="device-delete-acknowledge-checkbox"
			label={m.devices_delete_acknowledge()}
			disabled={submitting}
			bind:checked={acknowledged}
		/>

		{#if submitting && purgedSoFar > 0}
			<p class="device-danger-zone__copy" role="status">
				{m.devices_delete_progress({ count: purgedSoFar.toLocaleString() })}
			</p>
		{/if}
	</div>
	{#snippet actions()}
		<CwButton
			id="device-delete-dismiss-button"
			variant="ghost"
			onclick={() => (confirmOpen = false)}
			disabled={submitting}
		>
			{m.action_cancel()}
		</CwButton>
		<CwButton
			id="device-delete-confirm-button"
			variant="danger"
			onclick={() => formElement?.requestSubmit()}
			loading={submitting}
			disabled={!confirmMatches || !acknowledged || submitting}
		>
			{m.devices_delete_confirm_button()}
		</CwButton>
	{/snippet}
</CwDialog>

<style>
	/* Danger zone: red frame and heading so it reads as a different kind of card. */
	.device-danger-zone :global(.cw-card) {
		border-color: var(--cw-tone-danger-border);
	}

	.device-danger-zone :global(.cw-card__title) {
		color: var(--cw-tone-danger-text);
	}

	.device-danger-zone__row-title {
		margin: 0 0 var(--cw-space-1);
		font-weight: var(--cw-font-semibold);
		color: var(--cw-text-primary);
	}

	.device-danger-zone__copy {
		margin: 0;
		font-size: var(--cw-text-sm);
		color: var(--cw-text-secondary);
	}

	.device-danger-zone__dialog {
		display: flex;
		flex-direction: column;
		gap: var(--cw-space-4);
	}

	.device-danger-zone__list {
		margin: var(--cw-space-2) 0 0;
		padding-left: var(--cw-space-5);
		list-style: disc;
	}

	.device-danger-zone__identity {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: var(--cw-space-1) var(--cw-space-3);
		margin: 0;
		font-size: var(--cw-text-sm);
	}

	.device-danger-zone__identity dt {
		color: var(--cw-text-secondary);
	}

	.device-danger-zone__identity dd {
		margin: 0;
		color: var(--cw-text-primary);
		overflow-wrap: anywhere;
	}

	.device-danger-zone__identity code {
		font-family: var(--cw-font-mono);
	}
</style>
