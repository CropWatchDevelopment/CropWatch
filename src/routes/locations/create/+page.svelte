<script lang="ts">
	import { AppActionRow, AppFormStack, AppNotice, AppPage } from '$lib/components/layout';
	import { CwButton, CwCard, CwInput, useCwToast } from '@cropwatchdevelopment/cwui';
	import { applyAction, enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages.js';

	type CreateLocationForm = {
		error?: string;
		name?: string;
		description?: string;
		group?: string;
		lat?: string;
		long?: string;
		location_id?: number;
		success?: boolean;
	} | null;

	const toast = useCwToast();

	let { form }: { form: CreateLocationForm } = $props();
	const initial = (() => form)();

	let submitting = $state(false);
	let name = $state(initial?.name ?? '');
	let description = $state(initial?.description ?? '');
	let group = $state(initial?.group ?? '');
	let lat = $state(initial?.lat ?? '');
	let long = $state(initial?.long ?? '');
</script>

<AppPage width="md">
	<CwButton id="location-create-back-button" variant="secondary" size="sm" onclick={() => goto(resolve('/locations'))}>
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
								{ invalidateAll: true }
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

				<CwInput
					id="location-create-group-input"
					label={m.common_group()}
					name="group"
					bind:value={group}
					placeholder={m.locations_optional_group_name()}
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
					<CwButton id="location-create-cancel-button" type="button" variant="ghost" onclick={() => goto(resolve('/locations'))}>
						{m.action_cancel()}
					</CwButton>
					<CwButton id="location-create-submit-button" type="submit" variant="primary" loading={submitting} disabled={!name.trim()}>
						{m.locations_create_submit()}
					</CwButton>
				</AppActionRow>
			</AppFormStack>
		</form>
	</CwCard>
</AppPage>
