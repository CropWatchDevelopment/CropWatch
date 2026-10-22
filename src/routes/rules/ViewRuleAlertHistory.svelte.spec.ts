import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '$lib/api/api-error';
import type { RuleTriggerLogDto } from '$lib/api/api.dtos';
import { formatCwDuration } from '$lib/i18n/format';
import { m } from '$lib/paraglide/messages.js';
import { createMockServices, type MockServices } from '$lib/testing/mock-services';
import { renderWithServices } from '$lib/testing/render';
import ViewRuleAlertHistory from './ViewRuleAlertHistory.svelte';

function entry(overrides: Partial<RuleTriggerLogDto> = {}): RuleTriggerLogDto {
	return {
		id: 1,
		devEui: 'DEV-A',
		deviceName: 'Freezer A',
		templateId: 9,
		triggeredAt: '2026-10-01T08:00:00.000Z',
		triggeredValue: 12.5,
		resetAt: '2026-10-01T09:30:00.000Z',
		resetValue: 4,
		createdAt: '2026-10-01T08:00:00.000Z',
		...overrides
	};
}

const timestamp = (value: string) =>
	new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
		new Date(value)
	);

let services: MockServices;
let view: ReturnType<typeof renderWithServices> | null = null;

function render() {
	view = renderWithServices(ViewRuleAlertHistory, {
		props: { templateId: 9, ruleName: 'Cold room' },
		services,
		app: { accessToken: 'jwt-token' }
	});
	return view;
}

const getHistory = () => services.rules.getRuleTemplateHistory;
const dialog = () => view!.target.querySelector('dialog') as HTMLDialogElement;
const text = () => dialog().textContent ?? '';
const cards = () => [...dialog().querySelectorAll<HTMLLIElement>('li.rh-card')];

function click(element: Element | null | undefined) {
	(element as HTMLElement).click();
	flushSync();
}

const openHistory = () => click(document.getElementById('rule-history-9-open-button'));

beforeEach(() => {
	services = createMockServices();
});

afterEach(() => {
	view?.unmount();
	view = null;
});

describe('ViewRuleAlertHistory', () => {
	it('loads nothing until the dialog is opened', () => {
		render();

		expect(dialog().open).toBe(false);
		expect(getHistory()).not.toHaveBeenCalled();
		expect(
			document
				.getElementById('rule-history-9-open-button')
				?.querySelector('[role="img"]')
				?.getAttribute('aria-label')
		).toBe(m.rules_new_view_history());
	});

	it('shows a loading line, then the history of the rule', async () => {
		let finish!: (entries: RuleTriggerLogDto[]) => void;
		getHistory().mockReturnValue(new Promise((resolve) => (finish = resolve)));
		render();

		openHistory();

		expect(dialog().open).toBe(true);
		expect(getHistory()).toHaveBeenCalledWith(9);
		expect(text()).toContain(m.rules_new_history_subtitle({ name: 'Cold room' }));
		expect(text()).toContain(m.rules_new_history_loading());

		finish([entry()]);
		await vi.waitFor(() => expect(cards()).toHaveLength(1));
		expect(text()).not.toContain(m.rules_new_history_loading());
	});

	it('describes a resolved alert: times, values and how long it lasted', async () => {
		getHistory().mockResolvedValue([entry()]);
		render();
		openHistory();

		await vi.waitFor(() => expect(cards()).toHaveLength(1));
		const card = cards()[0];
		expect(card.classList.contains('rh-card--resolved')).toBe(true);
		expect(card.textContent).toContain('Freezer A');
		expect(card.textContent).toContain(m.rules_new_history_status_resolved());
		expect(card.textContent).toContain(m.rules_new_history_triggered());
		expect(card.textContent).toContain(timestamp('2026-10-01T08:00:00.000Z'));
		expect(card.textContent).toContain(m.rules_new_history_value({ value: '12.5' }));
		expect(card.textContent).toContain(
			m.rules_new_history_duration_lasted({ duration: formatCwDuration(90 * 60 * 1000) })
		);
		expect(card.textContent).toContain(m.rules_new_history_reset());
		expect(card.textContent).toContain(timestamp('2026-10-01T09:30:00.000Z'));
		expect(card.textContent).toContain(m.rules_new_history_value({ value: '4' }));
		expect(card.textContent).not.toContain(m.rules_new_history_still_active());
		// Only the total: nothing is active.
		expect(text()).toContain(m.rules_new_history_total_events({ count: '1' }));
		expect(text()).not.toContain(m.rules_new_history_active_summary({ count: '1' }));
	});

	it('describes an alert that is still active', async () => {
		getHistory().mockResolvedValue([
			entry({ id: 2, resetAt: null, resetValue: null, deviceName: null }),
			entry({ id: 3 })
		]);
		render();
		openHistory();

		await vi.waitFor(() => expect(cards()).toHaveLength(2));
		const active = cards()[0];
		expect(active.classList.contains('rh-card--active')).toBe(true);
		// A device without a name is shown by its EUI.
		expect(active.querySelector('.rh-card__device')?.textContent).toBe('DEV-A');
		expect(active.textContent).toContain(m.rules_new_history_status_active());
		expect(active.textContent).toContain(m.rules_new_history_duration_active());
		expect(active.textContent).toContain(m.rules_new_history_still_active());
		expect(active.textContent).not.toContain(m.rules_new_history_reset());
		expect(text()).toContain(m.rules_new_history_active_summary({ count: '1' }));
		expect(text()).toContain(m.rules_new_history_total_events({ count: '2' }));
	});

	it('shows a dash for missing or invalid timestamps and omits missing values', async () => {
		getHistory().mockResolvedValue([
			entry({ triggeredAt: null, triggeredValue: null, resetAt: 'not-a-date', resetValue: null }),
			entry({ id: 2, triggeredAt: null, resetAt: null })
		]);
		render();
		openHistory();

		await vi.waitFor(() => expect(cards()).toHaveLength(2));
		const [resolved, active] = cards();
		expect([...resolved.querySelectorAll('.rh-event__time')].map((n) => n.textContent)).toEqual([
			'—',
			'—'
		]);
		expect(resolved.querySelector('.rh-event__value')?.textContent?.trim()).toBe('');
		// No trigger time: no duration either.
		expect(resolved.querySelector('.rh-duration')?.textContent?.trim()).toBe('');
		expect(active.querySelector('.rh-duration')?.textContent?.trim()).toBe(
			m.rules_new_history_duration_active()
		);
	});

	it('lets a multi-device rule be filtered to one device', async () => {
		getHistory().mockResolvedValue([
			entry({ id: 1, devEui: 'DEV-B', deviceName: 'Walk-in B' }),
			entry({ id: 2, devEui: 'DEV-A', deviceName: 'Freezer A' }),
			entry({ id: 3, devEui: 'DEV-B', deviceName: 'Walk-in B' })
		]);
		render();
		openHistory();
		await vi.waitFor(() => expect(cards()).toHaveLength(3));

		click(document.getElementById('rule-history-9-device-select'));
		const options = [...dialog().querySelectorAll<HTMLLIElement>('li[role="option"]')];
		expect(options.map((option) => option.textContent?.trim())).toEqual([
			m.rules_new_history_filter_all(),
			'Freezer A',
			'Walk-in B'
		]);

		click(options.find((option) => option.textContent?.includes('Walk-in B')));

		expect(cards()).toHaveLength(2);
		expect(cards().every((card) => card.textContent?.includes('Walk-in B'))).toBe(true);
	});

	it('has no device filter when every event is from one device', async () => {
		getHistory().mockResolvedValue([entry({ id: 1 }), entry({ id: 2 })]);
		render();
		openHistory();

		await vi.waitFor(() => expect(cards()).toHaveLength(2));
		expect(document.getElementById('rule-history-9-device-select')).toBeNull();
	});

	it('says when the rule has never triggered', async () => {
		getHistory().mockResolvedValue([]);
		render();
		openHistory();

		await vi.waitFor(() => expect(text()).toContain(m.rules_new_history_empty()));
		expect(dialog().querySelector('.app-notice--neutral')).not.toBeNull();
	});

	it('loads once, and keeps the history when reopened', async () => {
		getHistory().mockResolvedValue([entry()]);
		render();
		openHistory();
		await vi.waitFor(() => expect(cards()).toHaveLength(1));

		click(document.getElementById('rule-history-9-close-button'));
		expect(dialog().open).toBe(false);
		openHistory();

		expect(dialog().open).toBe(true);
		expect(cards()).toHaveLength(1);
		expect(getHistory()).toHaveBeenCalledTimes(1);
	});

	it("shows the API's error, and tries again when reopened", async () => {
		getHistory()
			.mockRejectedValueOnce({ message: 'History unavailable' })
			.mockResolvedValueOnce([entry()]);
		render();
		openHistory();
		await vi.waitFor(() => expect(text()).toContain('History unavailable'));
		expect(dialog().querySelector('.app-notice--danger')?.textContent).toContain(
			'History unavailable'
		);

		click(document.getElementById('rule-history-9-close-button'));
		openHistory();

		await vi.waitFor(() => expect(cards()).toHaveLength(1));
		expect(text()).not.toContain('History unavailable');
		expect(getHistory()).toHaveBeenCalledTimes(2);
	});

	it('falls back to the generic message when the failure has none', async () => {
		getHistory().mockRejectedValue({});
		render();
		openHistory();

		await vi.waitFor(() => expect(text()).toContain(m.rules_new_history_load_failed()));
	});

	it.each([
		[
			'an API error without a message',
			new ApiError(500, 'Internal Server Error', {
				url: 'https://api.cropwatch.test/rules/templates/9/history',
				payload: null
			})
		],
		['a network failure', new TypeError('Failed to fetch')]
	])('shows the generic message for %s', async (_label, failure) => {
		getHistory().mockRejectedValue(failure);
		render();
		openHistory();

		await vi.waitFor(() =>
			expect(dialog().querySelector('.app-notice--danger')?.textContent?.trim()).toBe(
				m.rules_new_history_load_failed()
			)
		);
	});

	it('does not start a second load while one is running', async () => {
		getHistory().mockReturnValue(new Promise(() => {}));
		render();
		openHistory();

		click(document.getElementById('rule-history-9-close-button'));
		openHistory();

		expect(getHistory()).toHaveBeenCalledTimes(1);
	});
});
