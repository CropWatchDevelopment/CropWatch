<script lang="ts">
	import { enhance } from '$app/forms';
	import DangerZoneCard from '$lib/components/danger-zone/DangerZoneCard.svelte';
	import DangerZoneDialog from '$lib/components/danger-zone/DangerZoneDialog.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import {
		ACKNOWLEDGE_FIELD,
		ACKNOWLEDGE_VALUE,
		CONFIRM_LOCATION_NAME_FIELD,
		locationNameConfirmed,
		normalizeLocationName
	} from './location-delete-confirmation';

	type FormPayload = {
		action?: string;
		success?: boolean;
		message?: string;
	} | null;

	interface Props {
		locationId: number;
		locationName: string;
		/** Devices still in the location; deleting is blocked until it is 0. */
		deviceCount: number;
		form: FormPayload;
	}

	let { locationId, locationName, deviceCount, form }: Props = $props();

	let confirmOpen = $state(false);
	let submitting = $state(false);
	let confirmName = $state('');
	let acknowledged = $state(false);
	let formElement = $state<HTMLFormElement | null>(null);

	const deleteForm = $derived(form?.action === 'deleteLocation' ? form : null);
	const confirmMatches = $derived(locationNameConfirmed(locationName, confirmName));
	// Flag a wrong name only once the user has typed as many characters as it has.
	const confirmMismatch = $derived(
		!confirmMatches &&
			normalizeLocationName(confirmName).length >= normalizeLocationName(locationName).length
	);
	const blockedMessage = $derived(
		deviceCount > 0 ? m.locations_delete_blocked({ count: String(deviceCount) }) : null
	);

	function openConfirm() {
		confirmName = '';
		acknowledged = false;
		confirmOpen = true;
	}
</script>

<DangerZoneCard
	idPrefix="location-delete"
	heading={m.locations_delete_row_title()}
	description={m.locations_delete_row_body()}
	buttonLabel={m.locations_delete_button()}
	errorMessage={deleteForm?.message}
	{blockedMessage}
	busy={submitting}
	onDelete={openConfirm}
>
	<form
		id="location-delete-form"
		method="POST"
		action="?/deleteLocation"
		bind:this={formElement}
		use:enhance={({ cancel }) => {
			if (!confirmMatches || !acknowledged || deviceCount > 0) {
				cancel();
				return;
			}
			submitting = true;
			return async ({ result, update }) => {
				try {
					// Success is a redirect to the locations list; errors land in the notice.
					await update({ reset: false });
				} finally {
					submitting = false;
					if (result.type !== 'redirect') {
						confirmOpen = false;
					}
				}
			};
		}}
	>
		<input type="hidden" name={CONFIRM_LOCATION_NAME_FIELD} value={confirmName} />
		<input type="hidden" name={ACKNOWLEDGE_FIELD} value={acknowledged ? ACKNOWLEDGE_VALUE : ''} />
	</form>
</DangerZoneCard>

<DangerZoneDialog
	bind:open={confirmOpen}
	idPrefix="location-delete"
	title={m.locations_delete_dialog_title({ name: locationName })}
	intro={m.locations_delete_will_remove()}
	removes={[m.locations_delete_item_location(), m.locations_delete_item_access()]}
	note={m.locations_delete_no_devices_note()}
	identity={[
		{ label: m.locations_location_name(), value: locationName },
		{ label: m.locations_delete_id_label(), value: String(locationId), mono: true }
	]}
	confirmLabel={m.locations_delete_confirm_prompt({ name: locationName })}
	bind:confirmValue={confirmName}
	confirmError={confirmMismatch ? m.locations_delete_confirm_mismatch() : null}
	acknowledgeLabel={m.locations_delete_acknowledge()}
	bind:acknowledged
	confirmButtonLabel={m.locations_delete_confirm_button()}
	canConfirm={confirmMatches && acknowledged && deviceCount === 0}
	busy={submitting}
	onConfirm={() => formElement?.requestSubmit()}
/>
