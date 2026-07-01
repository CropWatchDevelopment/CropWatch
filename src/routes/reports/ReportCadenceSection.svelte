<script lang="ts">
	import { AppFormStack } from '$lib/components/layout';
	import { m } from '$lib/paraglide/messages.js';
	import { CwCard, CwInput, CwSwitch } from '@cropwatchdevelopment/cwui';
	import type { CadenceDraft } from './report-template-form';

	interface Props {
		cadence: CadenceDraft;
	}

	let { cadence = $bindable() }: Props = $props();
</script>

<CwCard title={m.reports_create_schedules_title()} subtitle={m.reports_new_cadence_subtitle()} elevated>
	<AppFormStack padded>
		<div class="report-entry-card">
			<div class="report-switch-grid">
				<CwSwitch
					id="report-cadence-day-switch"
					checked={cadence.end_of_day}
					label={m.reports_create_schedule_day_label()}
					description={m.reports_create_schedule_day_description()}
					onchange={(checked) => (cadence.end_of_day = checked)}
				/>
				<CwSwitch
					id="report-cadence-week-switch"
					checked={cadence.end_of_week}
					label={m.reports_create_schedule_week_label()}
					description={m.reports_create_schedule_week_description()}
					onchange={(checked) => (cadence.end_of_week = checked)}
				/>
				<CwSwitch
					id="report-cadence-month-switch"
					checked={cadence.end_of_month}
					label={m.reports_new_cadence_month_label()}
					description={m.reports_new_cadence_month_description()}
					onchange={(checked) => (cadence.end_of_month = checked)}
				/>
			</div>

			<div class="report-field-grid">
				<CwInput
					id="report-cadence-utc-offset-input"
					label={m.reports_new_cadence_utc_offset()}
					type="numeric"
					bind:value={cadence.utc_offset}
				/>
			</div>
		</div>
	</AppFormStack>
</CwCard>

<style>
	.report-entry-card {
		display: flex;
		flex-direction: column;
		gap: var(--cw-space-3);
		padding: var(--cw-space-3);
		border: 1px solid var(--cw-border-muted);
		border-radius: var(--cw-radius-lg);
		background: var(--cw-bg-subtle);
	}

	.report-switch-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--cw-space-3);
	}

	.report-field-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--cw-space-3);
		align-items: end;
	}

	@media (max-width: 767px) {
		.report-switch-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 639px) {
		.report-field-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
