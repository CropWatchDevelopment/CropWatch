<script lang="ts">
	import { CwButton, CwCard, CwInput } from '@cropwatchdevelopment/cwui';

	let { data, form }: { data: any; form: any } = $props();
    let submitting = $state(false);
</script>

<div class="settings-page">
	<CwCard title={`Location Settings`} subtitle="Manage your location settings" elevated>
		<form method="POST" action="?/updateLocationName">
			<CwInput
				name="locationName"
				type="text"
				label="Location Name"
				placeholder="Enter location name"
				required
				bind:value={data.locationName}
			/>
            <input type="hidden" name="location_id" value={data.locationId} />
			<div class="permissions-form__actions" style="margin-top: 1rem;">
				<CwButton
					type="submit"
					variant="primary"
					loading={submitting}
					disabled={submitting || !data.locationName.trim()}
				>
					Update Location Name
				</CwButton>
			</div>
		</form>
	</CwCard>
</div>
