import { flushSync } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import ReportProcessingSchedulesSection from './ReportProcessingSchedulesSection.svelte';
import type { DataProcessingScheduleDraft, SelectOption } from './report-template-form';

const DAYS: SelectOption[] = [
	{ label: 'Sunday', value: '0' },
	{ label: 'Monday', value: '1' },
	{ label: 'Tuesday', value: '2' }
];
const RULE_TYPES: SelectOption[] = [
	{ label: 'Include', value: 'include' },
	{ label: 'Exclude', value: 'exclude' }
];

let view: ReturnType<typeof renderWithServices> | null = null;

/** A reactive list, as the form passes it (`bind:schedules={fields.data_processing_schedules}`). */
function scheduleDrafts(
	...entries: Partial<DataProcessingScheduleDraft>[]
): DataProcessingScheduleDraft[] {
	const schedules = $state<DataProcessingScheduleDraft[]>(
		entries.map((entry, index) => ({
			crosses_midnight: false,
			day_of_week: '1',
			end_time: '17:00',
			is_enabled: true,
			key: `dps-${index + 1}`,
			rule_type: 'include',
			start_time: '09:00',
			timezone: 'UTC',
			...entry
		}))
	);
	return schedules;
}

function render(schedules?: DataProcessingScheduleDraft[]) {
	const onAdd = vi.fn();
	const onRemove = vi.fn();
	view = renderWithServices(ReportProcessingSchedulesSection, {
		props: { schedules, daysOfTheWeek: DAYS, ruleTypeOptions: RULE_TYPES, onAdd, onRemove }
	});
	return { onAdd, onRemove };
}

const byId = <T extends HTMLElement = HTMLElement>(id: string) =>
	document.getElementById(id) as T | null;
const text = () => view?.target.textContent ?? '';
const panelHeader = () => view!.target.querySelector<HTMLButtonElement>('.cw-expand__header')!;
const panelBody = () => view!.target.querySelector<HTMLElement>('.cw-expand__body-wrapper')!;

function click(element: Element | null | undefined) {
	(element as HTMLElement).click();
	flushSync();
}

function type(input: HTMLInputElement, value: string) {
	input.value = value;
	input.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

/** Opens a cwui dropdown by its trigger id and clicks the option labelled `label`. */
function choose(triggerId: string, label: string) {
	const trigger = byId(triggerId)!;
	const root = trigger.closest('.cw-dropdown')!;
	if (trigger.getAttribute('aria-expanded') !== 'true') click(trigger);
	const option = [...root.querySelectorAll('li[role="option"]')].find(
		(candidate) => candidate.textContent?.trim() === label
	);
	if (!option) throw new Error(`No option "${label}" in ${triggerId}`);
	click(option);
}

afterEach(() => {
	view?.unmount();
	view = null;
});

describe('ReportProcessingSchedulesSection', () => {
	it('starts collapsed, and expands to explain the processing schedules', () => {
		render();

		expect(panelHeader().textContent).toContain(m.reports_schedule_card_title());
		expect(panelHeader().getAttribute('aria-expanded')).toBe('false');
		expect(panelBody().inert).toBe(true);

		click(panelHeader());

		expect(panelHeader().getAttribute('aria-expanded')).toBe('true');
		expect(panelBody().inert).toBe(false);
		expect(text()).toContain(m.reports_schedule_card_description());
		expect(view!.target.querySelector('.app-notice--warning')?.textContent).toContain(
			m.reports_schedule_card_warning()
		);
	});

	it('says when there are no processing schedules', () => {
		render(scheduleDrafts());

		expect(text()).toContain(m.reports_schedule_empty());
		expect(byId('report-schedules-0-remove-button')).toBeNull();
	});

	it('adds a processing schedule through the parent', () => {
		const { onAdd } = render(scheduleDrafts());
		click(panelHeader());

		click(byId('report-schedules-add-button'));

		expect(onAdd).toHaveBeenCalledTimes(1);
	});

	it('shows each schedule, numbered, with its settings', () => {
		render(
			scheduleDrafts(
				{ day_of_week: '2', rule_type: 'exclude', timezone: 'Asia/Tokyo', crosses_midnight: true },
				{ start_time: '22:00', end_time: '06:00', is_enabled: false }
			)
		);

		expect(text()).not.toContain(m.reports_schedule_empty());
		expect(text()).toContain(m.reports_schedule_entry_heading({ index: '1' }));
		expect(text()).toContain(m.reports_schedule_entry_heading({ index: '2' }));
		expect(text()).toContain(m.reports_schedule_start_time());
		expect(text()).toContain(m.reports_schedule_end_time());
		expect(text()).toContain(m.reports_schedule_crosses_midnight_description());
		expect(text()).toContain(m.reports_schedule_is_enabled_description());
		expect(byId('report-schedules-0-day-select')?.textContent?.trim()).toBe('Tuesday');
		expect(byId('report-schedules-0-rule-type-select')?.textContent?.trim()).toBe('Exclude');
		expect(byId<HTMLInputElement>('report-schedules-0-timezone-input')?.value).toBe('Asia/Tokyo');
		expect(byId<HTMLInputElement>('report-schedules-0-crosses-midnight-switch')?.checked).toBe(
			true
		);
		expect(byId<HTMLInputElement>('report-schedules-1-start-time-input')?.value).toBe('22:00');
		expect(byId<HTMLInputElement>('report-schedules-1-end-time-input')?.value).toBe('06:00');
		expect(byId<HTMLInputElement>('report-schedules-1-enabled-switch')?.checked).toBe(false);
	});

	it('removes a schedule by its key through the parent', () => {
		const { onRemove } = render(scheduleDrafts({}, {}));
		click(panelHeader());

		click(byId('report-schedules-1-remove-button'));

		expect(onRemove).toHaveBeenCalledWith('dps-2');
	});

	it('edits the schedule in the draft', () => {
		const schedules = scheduleDrafts({});
		render(schedules);
		click(panelHeader());

		choose('report-schedules-0-day-select', 'Sunday');
		choose('report-schedules-0-rule-type-select', 'Exclude');
		type(byId<HTMLInputElement>('report-schedules-0-timezone-input')!, 'Asia/Tokyo');
		type(byId<HTMLInputElement>('report-schedules-0-start-time-input')!, '20:30');
		type(byId<HTMLInputElement>('report-schedules-0-end-time-input')!, '04:15');
		click(byId('report-schedules-0-crosses-midnight-switch'));
		click(byId('report-schedules-0-enabled-switch'));

		expect(schedules[0]).toEqual({
			crosses_midnight: true,
			day_of_week: '0',
			end_time: '04:15',
			is_enabled: false,
			key: 'dps-1',
			rule_type: 'exclude',
			start_time: '20:30',
			timezone: 'Asia/Tokyo'
		});
	});
});
