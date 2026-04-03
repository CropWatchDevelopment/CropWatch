<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import { CwButton, CwCard, CwInput, useCwToast } from '@cropwatchdevelopment/cwui';
	import { applyAction, enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import BACK_ICON from '$lib/images/icons/back.svg';
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
	let name = $derived(form?.name ?? '');
	let description = $derived(form?.description ?? '');
	let group = $derived(form?.group ?? '');
	let lat = $derived(form?.lat ?? '');
	let long = $derived(form?.long ?? '');
</script>

<div class="create-location-page">
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
			<div class="form-fields">
				{#if form?.error}
					<p class="form-error">{form.error}</p>
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

				<div class="coord-row">
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
			</div>

			<div class="form-actions">
				<CwButton type="button" variant="secondary" onclick={() => goto('/locations')}>
					<Icon src={BACK_ICON} alt={m.action_back()} class="h-4 w-4" />
					{m.action_cancel()}
				</CwButton>
				<CwButton type="submit" variant="primary" loading={submitting} disabled={!name.trim()}>
					{m.locations_create_submit()}
				</CwButton>
			</div>
		</form>
	</CwCard>
</div>

<style>
	.create-location-page {
		padding: 1rem;
		width: 100%;
		height: 100%;
	}

	.form-fields {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.coord-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.form-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.75rem;
	}

	.form-error {
		color: #b42318;
		font-size: 0.95rem;
		margin: 0;
	}
</style>
