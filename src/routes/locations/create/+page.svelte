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

	let submitting = $state(false);
	let name = $state(form?.name ?? '');
	let description = $state(form?.description ?? '');
	let group = $state(form?.group ?? '');
	let lat = $state(form?.lat ?? '');
	let long = $state(form?.long ?? '');
</script>

<AppPage width="md">
	<CwButton variant="ghost" size="sm" onclick={() => goto(resolve('/locations'))}>
		&larr; {m.action_back()}
	</CwButton>

	<CwCard title={m.locations_create_title()} elevated>
		<form
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
					label={m.common_name()}
					name="name"
					bind:value={name}
					required
					placeholder={m.locations_name_placeholder()}
				/>

				<CwInput
					label={m.common_description()}
					name="description"
					bind:value={description}
					placeholder={m.locations_optional_description()}
				/>

				<CwInput
					label={m.common_group()}
					name="group"
					bind:value={group}
					placeholder={m.locations_optional_group_name()}
				/>

				<div class="grid grid-cols-2 gap-4">
					<CwInput
						label={m.locations_latitude_optional()}
						name="lat"
						bind:value={lat}
						placeholder={m.locations_latitude_placeholder()}
					/>
					<CwInput
						label={m.locations_longitude_optional()}
						name="long"
						bind:value={long}
						placeholder={m.locations_longitude_placeholder()}
					/>
				</div>

				<AppActionRow>
					<CwButton type="button" variant="ghost" onclick={() => goto(resolve('/locations'))}>
						{m.action_cancel()}
					</CwButton>
					<CwButton type="submit" variant="primary" loading={submitting} disabled={!name.trim()}>
						{m.locations_create_submit()}
					</CwButton>
				</AppActionRow>
			</AppFormStack>
		</form>
	</CwCard>
</AppPage>
