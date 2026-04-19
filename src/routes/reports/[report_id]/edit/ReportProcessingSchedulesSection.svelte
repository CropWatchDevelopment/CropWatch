<script lang="ts">
	import { AppFormStack, AppNotice } from '$lib/components/layout';
	import Icon from '$lib/components/Icon.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import {
		CwButton,
		CwDropdown,
		CwExpandPanel,
		CwInput,
		CwSwitch
	} from '@cropwatchdevelopment/cwui';
	import ADD_ICON from '$lib/images/icons/add.svg';
	import type { DataProcessingScheduleDraft, SelectOption } from './report-form.types';

	interface Props {
		schedules?: DataProcessingScheduleDraft[];
		daysOfTheWeek: SelectOption[];
		ruleTypeOptions: SelectOption[];
		onAdd: () => void;
		onRemove: (key: string) => void;
	}

	let {
		schedules = $bindable<DataProcessingScheduleDraft[]>([]),
		daysOfTheWeek,
		ruleTypeOptions,
		onAdd,
		onRemove
	}: Props = $props();

	let open = $state(schedules.length > 0);
</script>

<CwExpandPanel title={m.reports_schedule_card_title()} {open}>
	<AppFormStack padded>
		<div class="report-section-toolbar">
			<p class="report-section-copy">{m.reports_schedule_card_copy()}</p>
			<CwButton type="button" variant="secondary" onclick={onAdd}>
				<Icon src={ADD_ICON} class="h-4 w-4" />
			</CwButton>
		</div>

		{#if schedules.length === 0}
			<AppNotice tone="neutral">
				<p>{m.reports_schedule_empty()}</p>
			</AppNotice>
		{/if}

		{#each schedules as schedule, index (schedule.key)}
			<div class="report-entry-card">
				<div class="report-entry-card__header report-entry-card__header--spread">
					<div>
						<h3>{m.reports_schedule_entry_heading({ index: String(index + 1) })}</h3>
					</div>
					<CwButton type="button" variant="danger" size="sm" onclick={() => onRemove(schedule.key)}>
						{m.action_remove()}
					</CwButton>
				</div>

				<div class="report-field-grid report-field-grid--three">
					<CwDropdown
						label={m.reports_schedule_day_of_week()}
						options={daysOfTheWeek}
						bind:value={schedule.day_of_week}
					/>
					<CwDropdown
						label={m.reports_schedule_rule_type()}
						options={ruleTypeOptions}
						bind:value={schedule.rule_type}
					/>
					<CwInput
						label={m.reports_schedule_timezone()}
						placeholder="UTC, JST, EST, etc..."
						bind:value={schedule.timezone}
					/>
				</div>

				<div class="report-field-grid report-field-grid--two">
					<label class="report-time-field">
						<span class="report-time-field__label">{m.reports_schedule_start_time()}</span>
						<input class="report-time-input" type="time" bind:value={schedule.start_time} />
					</label>
					<label class="report-time-field">
						<span class="report-time-field__label">{m.reports_schedule_end_time()}</span>
						<input class="report-time-input" type="time" bind:value={schedule.end_time} />
					</label>
				</div>

				<div class="report-switch-grid">
					<CwSwitch
						checked={schedule.crosses_midnight}
						label={m.reports_schedule_crosses_midnight()}
						description={m.reports_schedule_crosses_midnight_description()}
						onchange={(checked) => (schedule.crosses_midnight = checked)}
					/>
					<CwSwitch
						checked={schedule.is_enabled}
						label={m.reports_schedule_is_enabled()}
						description={m.reports_schedule_is_enabled_description()}
						onchange={(checked) => (schedule.is_enabled = checked)}
					/>
				</div>
			</div>
		{/each}
	</AppFormStack>
</CwExpandPanel>

<style>
	.report-section-toolbar,
	.report-entry-card__header--spread {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--cw-space-3);
	}

	.report-section-copy {
		margin: 0;
		max-width: 48rem;
		color: var(--cw-text-secondary);
	}

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

	.report-field-grid,
	.report-switch-grid {
		display: grid;
		gap: var(--cw-space-3);
	}

	.report-field-grid--two {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.report-field-grid--three {
		grid-template-columns: repeat(3, minmax(0, 1fr));
	}

	.report-switch-grid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.report-time-field {
		display: flex;
		flex-direction: column;
		gap: var(--cw-space-1);
	}

	.report-time-field__label {
		color: var(--cw-text-secondary);
		font-size: 0.8125rem;
		font-weight: var(--cw-font-medium);
	}

	.report-time-input {
		width: 100%;
		padding: 0.625rem 0.75rem;
		border: 1px solid var(--cw-border-muted);
		border-radius: var(--cw-radius-md);
		background: var(--cw-bg-surface);
		color: var(--cw-text-primary);
		font: inherit;
	}

	.report-time-input:focus {
		outline: none;
		border-color: var(--cw-primary-500);
		box-shadow: 0 0 0 1px color-mix(in srgb, var(--cw-primary-500) 35%, transparent);
	}

	@media (max-width: 767px) {
		.report-field-grid--three,
		.report-switch-grid {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 639px) {
		.report-field-grid--two,
		.report-section-toolbar,
		.report-entry-card__header--spread {
			grid-template-columns: 1fr;
			flex-direction: column;
			align-items: stretch;
		}
	}
</style>
