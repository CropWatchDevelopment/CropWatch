<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { ActionResult } from '@sveltejs/kit';
	import { CwButton, CwCard, CwInput, useCwToast } from '@cropwatchdevelopment/cwui';
	import { m } from '$lib/paraglide/messages.js';
	import Icon from '$lib/components/Icon.svelte';
	import SAVE_ICON from '$lib/images/icons/save.svg';

	type SettingsPageData = {
		locationId: string | number | null;
		locationName?: string | null;
		locationGroup?: string | null;
	};

	let { data, form }: { data: SettingsPageData; form?: unknown } = $props();
	const toast = useCwToast();

	let submitting = $state(false);
	let locationName = $derived(data.locationName ?? '');
	let locationGroup = $derived(data.locationGroup ?? '');
	let locationNameValue = $derived(locationName.trim());
	let locationGroupValue = $derived(locationGroup.trim());
	let locationDirty = $derived(
		locationNameValue !== (data.locationName ?? '').trim() ||
			locationGroupValue !== (data.locationGroup ?? '').trim()
	);
	let canSubmitLocation = $derived(
		!submitting && locationDirty && locationNameValue.length > 0
	);

	function getResultMessage(result: ActionResult): string | null {
		if (result.type !== 'success' && result.type !== 'failure') return null;
		const message = result.data?.message;
		return typeof message === 'string' && message.trim().length > 0 ? message.trim() : null;
	}
</script>

<div class="settings-page">
	<CwCard title={m.locations_settings_title()} elevated>
		<form
			method="POST"
			action="?/updateLocationName"
			use:enhance={({ cancel }) => {
				if (!canSubmitLocation) {
					cancel();
					return;
				}

				submitting = true;
				return async ({ result }) => {
					try {
						await applyAction(result);

						const message = getResultMessage(result);
						if (message) {
							toast.add({
								message,
								tone: result.type === 'success' ? 'success' : 'danger'
							});
						}

						if (result.type === 'success') {
							await invalidateAll();
						}
					} finally {
						submitting = false;
					}
				};
			}}
		>
			<CwInput
				name="locationName"
				type="text"
				label={m.locations_location_name()}
				placeholder={m.locations_enter_location_name()}
				required
				bind:value={locationName}
				class="mb-4"
			/>
			<CwInput
				name="group"
				type="text"
				label={m.common_group()}
				placeholder={m.locations_enter_group_name()}
				required
				bind:value={locationGroup}
			/>
			<input type="hidden" name="location_id" value={data.locationId} />
			<div class="permissions-form__actions" style="margin-top: 1rem;">
				<CwButton
					type="submit"
					variant="primary"
					loading={submitting}
					disabled={!canSubmitLocation}
				>
					<Icon src={SAVE_ICON} />
					{m.action_save_changes()}
				</CwButton>
			</div>
		</form>
	</CwCard>
</div>
