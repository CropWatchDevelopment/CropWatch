<script lang="ts">
	import { applyAction, enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import type { ActionResult } from '@sveltejs/kit';
	import { CwButton, CwCard, CwInput, useCwToast } from '@cropwatchdevelopment/cwui';
	import { m } from '$lib/paraglide/messages.js';
	import Icon from '$lib/components/Icon.svelte';
	import SAVE_ICON from '$lib/images/icons/save.svg';
	import type { GroupDto } from '$lib/api/api.dtos';
	import { getServices } from '$lib/services/context';
	import AddGroupDialog from '$lib/components/groups/AddGroupDialog.svelte';
	import GroupPicker from '$lib/components/groups/GroupPicker.svelte';
	import ManageGroupsDialog from '$lib/components/groups/ManageGroupsDialog.svelte';
	import { GroupsController } from '$lib/components/groups/groups-controller.svelte';

	type SettingsPageData = {
		locationId: string | number | null;
		locationName?: string | null;
		locationGroup?: string | null;
		locationGroups?: GroupDto[];
		locationOrgId?: string | null;
	};

	let { data }: { data: SettingsPageData } = $props();
	const toast = useCwToast();

	// Seeded once from the loaded location, then owned by the user: another
	// card's reload must not wipe an unsaved edit (CLAUDE.md "Form field state").
	const initial = (() => data)();
	let submitting = $state(false);
	let locationName = $state(initial.locationName ?? '');
	let locationGroup = $state(initial.locationGroup ?? '');
	const groups = new GroupsController({
		kind: 'location',
		repository: getServices().locationGroups,
		orgId: initial.locationOrgId,
		initial: initial.locationGroups,
		onError: (message) => toast.add({ tone: 'danger', message }),
		onSuccess: (message) => toast.add({ tone: 'success', message }),
		onChanged: async () => {
			// A rename or delete changes what the saved location shows: reload,
			// and keep an untouched picker on what the API now has saved.
			const untouched = locationGroup.trim() === (data.locationGroup ?? '').trim();
			await invalidateAll();
			groups.reseed(data.locationGroups, data.locationOrgId);
			if (untouched) locationGroup = data.locationGroup ?? '';
		}
	});
	let locationNameValue = $derived(locationName.trim());
	let locationGroupValue = $derived(locationGroup.trim());
	let locationDirty = $derived(
		locationNameValue !== (data.locationName ?? '').trim() ||
			locationGroupValue !== (data.locationGroup ?? '').trim()
	);
	let canSubmitLocation = $derived(!submitting && locationDirty && locationNameValue.length > 0);

	function getResultMessage(result: ActionResult): string | null {
		if (result.type !== 'success' && result.type !== 'failure') return null;
		const message = result.data?.message;
		return typeof message === 'string' && message.trim().length > 0 ? message.trim() : null;
	}
</script>

<div class="settings-page">
	<CwCard title={m.locations_settings_title()} elevated>
		<form
			id="location-update-form"
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
							// Show what was saved, as the reloaded location has it (saving a
							// new name may have created a group, so the list is reloaded too).
							locationName = data.locationName ?? '';
							locationGroup = data.locationGroup ?? '';
							groups.reseed(data.locationGroups, data.locationOrgId);
						}
					} finally {
						submitting = false;
					}
				};
			}}
		>
			<CwInput
				id="location-update-name-input"
				name="locationName"
				type="text"
				label={m.locations_location_name()}
				placeholder={m.locations_enter_location_name()}
				required
				bind:value={locationName}
				class="mb-4"
			/>
			<GroupPicker
				controller={groups}
				id="location-update-group-select"
				name="group"
				bind:value={locationGroup}
			/>
			<input
				id="location-update-location-id-input"
				type="hidden"
				name="location_id"
				value={data.locationId}
			/>
			<div class="permissions-form__actions mt-4">
				<CwButton
					id="location-update-save-button"
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
	<!-- Outside the form: Enter in a dialog's field must not save the location. -->
	<AddGroupDialog controller={groups} bind:value={locationGroup} />
	<ManageGroupsDialog controller={groups} bind:value={locationGroup} />
</div>
