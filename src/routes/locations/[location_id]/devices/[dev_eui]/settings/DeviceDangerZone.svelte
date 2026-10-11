<script lang="ts">
	import { enhance } from '$app/forms';
	import DangerZoneCard from '$lib/components/danger-zone/DangerZoneCard.svelte';
	import DangerZoneDialog from '$lib/components/danger-zone/DangerZoneDialog.svelte';
	import { m } from '$lib/paraglide/messages.js';
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

<DangerZoneCard
	idPrefix="device-delete"
	heading={m.devices_delete_row_title()}
	description={m.devices_delete_row_body()}
	buttonLabel={m.devices_delete_button()}
	errorMessage={deleteForm?.message}
	busy={submitting}
	onDelete={openConfirm}
>
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
	</form>
</DangerZoneCard>

<DangerZoneDialog
	bind:open={confirmOpen}
	idPrefix="device-delete"
	title={m.devices_delete_dialog_title({ name: deviceName || displayDevEui })}
	intro={m.devices_delete_will_remove()}
	removes={[
		m.devices_delete_item_history(),
		m.devices_delete_item_notes(),
		m.devices_delete_item_rules(),
		m.devices_delete_item_reports(),
		m.devices_delete_item_access()
	]}
	note={m.devices_delete_license_note()}
	identity={[
		{ label: m.devices_device_name_label(), value: deviceName || displayDevEui },
		{ label: m.devices_delete_confirm_label(), value: displayDevEui, mono: true }
	]}
	confirmLabel={m.devices_delete_confirm_prompt({ devEui: displayDevEui })}
	bind:confirmValue={confirmDevEui}
	confirmError={confirmMismatch ? m.devices_delete_confirm_mismatch() : null}
	acknowledgeLabel={m.devices_delete_acknowledge()}
	bind:acknowledged
	confirmButtonLabel={m.devices_delete_confirm_button()}
	canConfirm={confirmMatches && acknowledged}
	busy={submitting}
	progress={purgedSoFar > 0
		? m.devices_delete_progress({ count: purgedSoFar.toLocaleString() })
		: null}
	onConfirm={() => formElement?.requestSubmit()}
/>
