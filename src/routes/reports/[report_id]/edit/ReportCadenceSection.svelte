<script lang="ts">
	import { AppFormStack, AppNotice } from '$lib/components/layout';
	import { m } from '$lib/paraglide/messages.js';
	import { CwCard, CwSwitch } from '@cropwatchdevelopment/cwui';
	import type { ScheduleDraft } from './report-form.types';

	interface Props {
		schedules?: ScheduleDraft[];
	}

	let { schedules = $bindable<ScheduleDraft[]>([]) }: Props = $props();
</script>

<CwCard
	title={m.reports_create_schedules_title()} elevated>
	<AppFormStack padded>
		{#if schedules.length === 0}
			<AppNotice tone="neutral">
				<p>{m.reports_create_empty_schedules()}</p>
			</AppNotice>
		{/if}

		{#each schedules as schedule, index (schedule.key)}
			<div class="report-entry-card">
				<div class="report-entry-card__header">
					<div>
						<h3>{m.reports_create_schedule_heading({ index: String(index + 1) })}</h3>
						<p>{m.reports_create_schedule_copy()}</p>
					</div>
				</div>

				<div class="report-switch-grid">
					<CwSwitch
						checked={schedule.end_of_week}
						label={m.reports_create_schedule_week_label()}
						description={m.reports_create_schedule_week_description()}
						onchange={(checked) => (schedule.end_of_week = checked)}
					/>
					<CwSwitch
						checked={schedule.end_of_month}
						label={m.reports_create_schedule_month_label()}
						description={m.reports_create_schedule_month_description()}
						onchange={(checked) => (schedule.end_of_month = checked)}
					/>
				</div>
			</div>
		{/each}
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

	.report-entry-card__header h3 {
		margin: 0;
		font-size: 1rem;
		font-weight: var(--cw-font-semibold);
	}

	.report-entry-card__header p {
		margin: var(--cw-space-1) 0 0;
		color: var(--cw-text-secondary);
	}

	.report-switch-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--cw-space-3);
	}

	@media (max-width: 639px) {
		.report-switch-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
