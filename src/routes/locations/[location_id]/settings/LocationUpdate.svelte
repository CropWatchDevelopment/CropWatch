<script lang="ts">
	import { CwButton, CwCard, CwInput } from '@cropwatchdevelopment/cwui';
	import { m } from '$lib/paraglide/messages.js';

	let { data, form }: { data: any; form: any } = $props();
	let submitting = $state(false);
</script>

<div class="settings-page">
	<CwCard title={m.locations_settings_title()} subtitle={m.locations_settings_subtitle()} elevated>
		<form method="POST" action="?/updateLocationName">
			<CwInput
				name="locationName"
				type="text"
				label={m.locations_location_name()}
				placeholder={m.locations_enter_location_name()}
				required
				bind:value={data.locationName}
				class="mb-4"
			/>
			<CwInput
				name="group"
				type="text"
				label={m.common_group()}
				placeholder={m.locations_enter_group_name()}
				required
				bind:value={data.locationGroup}
			/>
			<input type="hidden" name="location_id" value={data.locationId} />
			<div class="permissions-form__actions" style="margin-top: 1rem;">
				<CwButton
					type="submit"
					variant="primary"
					loading={submitting}
					disabled={submitting || !data.locationName.trim()}
				>
					{m.locations_update_location_name()}
				</CwButton>
			</div>
		</form>
	</CwCard>
</div>
