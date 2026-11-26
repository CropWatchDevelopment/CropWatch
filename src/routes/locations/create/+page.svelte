<script lang="ts">
	import { AppActionRow, AppFormStack, AppNotice, AppPage } from '#lib/components/layout/index.ts';
	import { CwButton, CwCard, CwInput, useCwToast } from '@cropwatchdevelopment/cwui';
	import { applyAction, enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import { getServices } from '#lib/services/context.ts';
	import AddGroupDialog from '#lib/components/groups/AddGroupDialog.svelte';
	import GroupPicker from '#lib/components/groups/GroupPicker.svelte';
	import ManageGroupsDialog from '#lib/components/groups/ManageGroupsDialog.svelte';
	import { GroupsController } from '#lib/components/groups/groups-controller.svelte.ts';
	import type { PageProps } from './$types';

	const toast = useCwToast();

	let { data, form }: PageProps = $props();
	const initial = (() => form)();

	let submitting = $state(false);
	let name = $state(initial?.name ?? '');
	let description = $state(initial?.description ?? '');
	let group = $state(initial?.group ?? '');
	let lat = $state(initial?.lat ?? '');
	let long = $state(initial?.long ?? '');
	const groups = new GroupsController({
		kind: 'location',
		repository: getServices().locationGroups,
		orgId: (() => data.orgId)(),
		initial: (() => data.locationGroups)(),
		onError: (message) => toast.add({ tone: 'danger', message }),
		onSuccess: (message) => toast.add({ tone: 'success', message })
	});
</script>

<AppPage>
	<CwButton
		id="location-create-back-button"
		variant="secondary"
		size="sm"
		onclick={() => goto(resolve('/locations'))}
	>
		&larr; {m.action_back()}
	</CwButton>

	<CwCard title={m.locations_create_title()} elevated>
		<form
			id="location-create-form"
			method="POST"
			use:enhance={() => {
				submitting = true;
				return async ({ result }) => {
					submitting = false;

					if (result.type === 'success') {
						const locationId = result.data?.location_id;
						if (typeof locationId === 'number' && Number.isFinite(locationId)) {
							await goto(
								resolve('/locations/[location_id]', {
									location_id: String(locationId)
								}),
								{ refreshAll: true }
							);
							return;
						}
					}

					await applyAction(result);

					if (result.type === 'failure' && typeof result.data?.error === 'string') {
						toast.add({ tone: 'danger', message: result.data.error });
					}
				};
			}}
		>
			<AppFormStack padded>
				{#if form?.error}
					<AppNotice tone="danger">
						<p>{form.error}</p>
					</AppNotice>
				{/if}

				<CwInput
					id="location-create-name-input"
					label={m.common_name()}
					name="name"
					bind:value={name}
					required
					placeholder={m.locations_name_placeholder()}
				/>

				<CwInput
					id="location-create-description-input"
					label={m.common_description()}
					name="description"
					bind:value={description}
					placeholder={m.locations_optional_description()}
				/>

				<GroupPicker
					controller={groups}
					id="location-create-group-select"
					name="group"
					bind:value={group}
				/>

				<div class="grid grid-cols-2 gap-4">
					<CwInput
						id="location-create-lat-input"
						label={m.locations_latitude_optional()}
						name="lat"
						bind:value={lat}
						placeholder={m.locations_latitude_placeholder()}
					/>
					<CwInput
						id="location-create-long-input"
						label={m.locations_longitude_optional()}
						name="long"
						bind:value={long}
						placeholder={m.locations_longitude_placeholder()}
					/>
				</div>

				<AppActionRow>
					<CwButton
						id="location-create-cancel-button"
						type="button"
						variant="ghost"
						onclick={() => goto(resolve('/locations'))}
					>
						{m.action_cancel()}
					</CwButton>
					<CwButton
						id="location-create-submit-button"
						type="submit"
						variant="primary"
						loading={submitting}
						disabled={!name.trim()}
					>
						{m.locations_create_submit()}
					</CwButton>
				</AppActionRow>
			</AppFormStack>
		</form>
	</CwCard>
	<!-- Outside the form: Enter in a dialog's field must not create the location. -->
	<AddGroupDialog controller={groups} bind:value={group} />
	<ManageGroupsDialog controller={groups} bind:value={group} />
</AppPage>
