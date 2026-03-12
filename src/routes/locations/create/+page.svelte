<script lang="ts">
	import { CwButton, CwCard, CwInput, useCwToast } from '@cropwatchdevelopment/cwui';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import BACK_ICON from '$lib/images/icons/back.svg';

	const toast = useCwToast();

	let { form }: { form: Record<string, unknown> | null } = $props();

	let submitting = $state(false);
	let name = $state('');
	let description = $state('');
	let group = $state('');
	let lat = $state('');
	let long = $state('');

	$effect(() => {
		if (form) {
			name = (form.name as string) ?? '';
			description = (form.description as string) ?? '';
			group = (form.group as string) ?? '';
			if (form.error) {
				toast.add({ tone: 'danger', message: form.error as string });
			}
		}
	});
</script>

<div class="create-location-page">
	<CwCard title="Create Location" subtitle="Add a new location to your account" elevated>
		<form
			method="POST"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					submitting = false;
					await update();
				};
			}}
		>
			<div class="form-fields">
				<CwInput
					label="Name"
					name="name"
					bind:value={name}
					required
					placeholder="e.g. Greenhouse A"
				/>

				<CwInput
					label="Description"
					name="description"
					bind:value={description}
					placeholder="Optional description"
				/>

				<CwInput
					label="Group"
					name="group"
					bind:value={group}
					placeholder="Optional group name"
				/>

				<div class="coord-row">
					<CwInput
						label="Latitude"
						name="lat"
						bind:value={lat}
						placeholder="e.g. 35.6762"
					/>
					<CwInput
						label="Longitude"
						name="long"
						bind:value={long}
						placeholder="e.g. 139.6503"
					/>
				</div>
			</div>

			<div class="form-actions">
				<CwButton variant="secondary" onclick={() => goto('/locations')}>
					<img src={BACK_ICON} alt="Back" class="h-4 w-4" />
					Cancel
				</CwButton>
				<CwButton variant="primary" loading={submitting} disabled={!name.trim()}>
					Create Location
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
</style>
