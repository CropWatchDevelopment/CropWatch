import { flushSync } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import ReportCadenceSection from './ReportCadenceSection.svelte';
import type { CadenceDraft } from './report-template-form';

let view: ReturnType<typeof renderWithServices> | null = null;

/** A reactive draft, as the form passes it (`bind:cadence={fields.cadence}`). */
function cadenceDraft(overrides: Partial<CadenceDraft> = {}): CadenceDraft {
	const cadence = $state<CadenceDraft>({
		end_of_day: false,
		end_of_week: true,
		end_of_month: false,
		utc_offset: '0',
		is_active: true,
		key: 'cadence-1',
		...overrides
	});
	return cadence;
}

function render(cadence: CadenceDraft) {
	view = renderWithServices(ReportCadenceSection, { props: { cadence } });
	return view;
}

const input = (id: string) => document.getElementById(id) as HTMLInputElement | null;
const text = () => view?.target.textContent ?? '';

function click(element: Element | null) {
	(element as HTMLElement).click();
	flushSync();
}

afterEach(() => {
	view?.unmount();
	view = null;
});

describe('ReportCadenceSection', () => {
	it('offers weekly and monthly reports and the UTC offset', () => {
		render(cadenceDraft());

		expect(text()).toContain(m.reports_create_schedules_title());
		expect(text()).toContain(m.reports_new_cadence_subtitle());
		expect(text()).toContain(m.reports_create_schedule_week_label());
		expect(text()).toContain(m.reports_create_schedule_week_description());
		expect(text()).toContain(m.reports_new_cadence_month_label());
		expect(text()).toContain(m.reports_new_cadence_month_description());
		expect(text()).toContain(m.reports_new_cadence_utc_offset());
		// The end-of-day cadence is hidden for now.
		expect(input('report-cadence-day-switch')).toBeNull();
	});

	it('shows the cadence of the draft', () => {
		render(cadenceDraft({ end_of_week: false, end_of_month: true, utc_offset: '9' }));

		expect(input('report-cadence-week-switch')?.checked).toBe(false);
		expect(input('report-cadence-month-switch')?.checked).toBe(true);
		expect(input('report-cadence-utc-offset-input')?.value).toBe('9');
	});

	it('updates the draft from the switches', () => {
		const cadence = cadenceDraft();
		render(cadence);

		click(input('report-cadence-week-switch'));
		click(input('report-cadence-month-switch'));

		expect(cadence).toMatchObject({ end_of_week: false, end_of_month: true, end_of_day: false });

		click(input('report-cadence-week-switch'));

		expect(cadence.end_of_week).toBe(true);
	});

	it('updates the draft from the UTC offset field', () => {
		const cadence = cadenceDraft();
		render(cadence);
		const offset = input('report-cadence-utc-offset-input')!;

		offset.value = '-5';
		offset.dispatchEvent(new Event('input', { bubbles: true }));
		flushSync();

		expect(cadence.utc_offset).toBe('-5');
	});
});
