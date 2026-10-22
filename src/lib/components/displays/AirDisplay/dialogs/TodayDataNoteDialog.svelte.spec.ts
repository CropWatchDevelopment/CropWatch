import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '$lib/api/api-error';
import { formatDateTime } from '$lib/i18n/format';
import { m } from '$lib/paraglide/messages.js';
import { labelFor } from '$lib/sensor-labels';
import { createMockServices, type MockServices } from '$lib/testing/mock-services';
import { renderWithServices } from '$lib/testing/render';
import { formatSensorMeasurement } from '$lib/units';
import type { Note } from '../interfaces/note.interface';
import TodayDataNoteDialog from './TodayDataNoteDialog.svelte';

const MORNING = '2026-10-21T00:15:00.000Z';
const NOON = '2026-10-21T03:00:00.000Z';

let services: MockServices;
let view: ReturnType<typeof renderWithServices> | null = null;

const getTodayData = () => services.telemetry.getDeviceDataWithinRange;
const createAirNote = () => services.airNotes.createAirNote;

function render(options: { accessToken?: string | null; onSaved?: (note: Note) => void } = {}) {
	view = renderWithServices(TodayDataNoteDialog, {
		props: { devEui: 'AIR-001', onSaved: options.onSaved },
		services,
		app: {
			accessToken: options.accessToken === null ? undefined : (options.accessToken ?? 'jwt-token')
		}
	});
	return view;
}

const text = () => document.body.textContent ?? '';
const dialogOpen = () => document.querySelector('dialog')?.open ?? false;
const buttonWith = (label: string) =>
	[...document.querySelectorAll('button')].find((button) => button.textContent?.includes(label))!;
const saveButton = () => buttonWith(m.display_save_note());
const cancelButton = () => buttonWith(m.action_cancel());
const radios = () => [...document.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
const noteBody = () => document.querySelector('textarea') as HTMLTextAreaElement;
const titleInput = () =>
	document.querySelector<HTMLInputElement>(
		`input[placeholder="${m.display_note_title_placeholder()}"]`
	)!;
const reportSwitch = () => document.querySelector<HTMLInputElement>('input[role="switch"]')!;

function openDialog() {
	const openButton = [...document.querySelectorAll('button')].find((button) =>
		button.querySelector(`[aria-label="${m.display_add_note()}"]`)
	);
	openButton!.click();
	flushSync();
}

function type(field: HTMLInputElement | HTMLTextAreaElement, value: string) {
	field.value = value;
	field.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

function reading(created_at: string, overrides: Record<string, unknown> = {}) {
	return { created_at, dev_eui: 'AIR-001', temperature_c: 21.5, humidity: 55, ...overrides };
}

beforeEach(() => {
	services = createMockServices();
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
	view?.unmount();
	view = null;
	document.body.innerHTML = '';
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("TodayDataNoteDialog: today's readings", () => {
	it("asks for today's readings of the device when it opens, and lists them", async () => {
		getTodayData().mockResolvedValue([reading(MORNING), reading(NOON, { temperature_c: 23 })]);
		render();
		expect(getTodayData()).not.toHaveBeenCalled();

		openDialog();

		expect(dialogOpen()).toBe(true);
		expect(text()).toContain(m.display_add_note_today_title());
		expect(getTodayData()).toHaveBeenCalledTimes(1);
		const [devEui, query] = getTodayData().mock.calls[0];
		const startOfToday = new Date();
		startOfToday.setHours(0, 0, 0, 0);
		expect(devEui).toBe('AIR-001');
		expect(query).toEqual({
			start: startOfToday.toISOString(),
			end: expect.any(String),
			take: 500
		});
		expect(Date.parse(query!.end as string)).toBeGreaterThanOrEqual(startOfToday.getTime());

		await vi.waitFor(() => expect(radios()).toHaveLength(2));
		expect(text()).toContain(formatDateTime(MORNING, { hour: 'numeric', minute: '2-digit' }));
		expect(text()).toContain(formatDateTime(NOON, { hour: 'numeric', minute: '2-digit' }));
		// Each reading is summarised by its displayable values (the device id is hidden).
		expect(text()).toContain(
			`${labelFor('temperature_c').label()}: ${formatSensorMeasurement('temperature_c', 21.5).display} · ${labelFor('humidity').label()}: ${formatSensorMeasurement('humidity', 55).display}`
		);
		// The first reading is selected.
		expect(radios().map((radio) => radio.checked)).toEqual([true, false]);
	});

	it('shows a spinner while the readings load', async () => {
		let resolve!: (rows: Record<string, unknown>[]) => void;
		getTodayData().mockReturnValue(new Promise((done) => (resolve = done)));
		render();
		openDialog();

		expect(text()).toContain(m.display_loading_today_readings());
		resolve([]);
		await vi.waitFor(() => expect(text()).toContain(m.display_no_readings_today()));
		expect(text()).not.toContain(m.display_loading_today_readings());
	});

	it('accepts a paginated answer and skips rows without a timestamp', async () => {
		getTodayData().mockResolvedValue({
			data: [reading(NOON), { temperature_c: 20 }, null as unknown as Record<string, unknown>],
			total: 3,
			skip: 0,
			take: 500
		});
		render();
		openDialog();

		await vi.waitFor(() => expect(radios()).toHaveLength(1));
		expect(radios()[0].value).toBe(NOON);
	});

	it('says so when there is no reading today, and the note cannot be saved', async () => {
		getTodayData().mockResolvedValue([]);
		render();
		openDialog();

		await vi.waitFor(() => expect(text()).toContain(m.display_no_readings_today()));
		type(noteBody(), 'Watered the beds');
		expect(saveButton().disabled).toBe(true);
	});

	it("shows the API's message when the readings cannot be loaded", async () => {
		getTodayData().mockRejectedValue(
			new ApiError(503, 'Service Unavailable', {
				url: 'https://api.cropwatch.test/devices/AIR-001/data-within-range',
				payload: { message: 'Telemetry is offline' }
			})
		);
		render();
		openDialog();

		await vi.waitFor(() => expect(text()).toContain('Telemetry is offline'));
		expect(console.error).toHaveBeenCalledWith('Failed to load today data:', expect.any(ApiError));
	});

	it('says the readings could not be loaded when the error has no message of its own', async () => {
		for (const failure of [{}, new TypeError('Failed to fetch')]) {
			getTodayData().mockRejectedValue(failure);
			render();
			openDialog();

			await vi.waitFor(() => expect(text()).toContain(m.display_today_readings_load_failed()));
			expect(text()).not.toContain(m.devices_save_note_failed());
			expect(text()).not.toContain('Failed to fetch');
			view?.unmount();
			view = null;
		}
	});

	it('treats an answer without a body, or without rows, as no readings today', async () => {
		for (const answer of [null, {}]) {
			getTodayData().mockResolvedValue(answer as never);
			render();
			openDialog();

			await vi.waitFor(() => expect(text()).toContain(m.display_no_readings_today()));
			expect(document.querySelector('.app-notice--danger')).toBeNull();
			view?.unmount();
			view = null;
		}
		expect(console.error).not.toHaveBeenCalled();
	});

	it('lists two readings that share a timestamp', async () => {
		getTodayData().mockResolvedValue([reading(NOON), reading(NOON, { temperature_c: 23 })]);
		render();
		openDialog();

		await vi.waitFor(() => expect(radios()).toHaveLength(2));
		expect(radios().map((radio) => radio.value)).toEqual([NOON, NOON]);
	});

	it('asks to sign in instead of loading anything without a session', () => {
		render({ accessToken: null });
		openDialog();

		expect(text()).toContain(m.devices_save_note_requires_login());
		expect(getTodayData()).not.toHaveBeenCalled();
	});
});

describe('TodayDataNoteDialog: saving a note', () => {
	it('saves the note on the selected reading, then closes and reports it', async () => {
		getTodayData().mockResolvedValue([reading(MORNING), reading(NOON)]);
		createAirNote().mockResolvedValue({ id: 1 });
		const onSaved = vi.fn();
		const { toasts } = render({ onSaved });
		openDialog();
		await vi.waitFor(() => expect(radios()).toHaveLength(2));

		expect(saveButton().disabled).toBe(true);
		radios()[1].click();
		type(titleInput(), '  Irrigation  ');
		type(noteBody(), '  Watered the beds  ');
		reportSwitch().click();
		flushSync();
		expect(saveButton().disabled).toBe(false);
		saveButton().click();
		flushSync();

		expect(createAirNote()).toHaveBeenCalledWith({
			note: 'Watered the beds',
			title: 'Irrigation',
			include_in_report: false,
			created_at: NOON,
			dev_eui: 'AIR-001'
		});
		await vi.waitFor(() => expect(dialogOpen()).toBe(false));
		expect(toasts()).toEqual([
			expect.objectContaining({ tone: 'success', message: m.devices_save_note_success() })
		]);
		expect(onSaved).toHaveBeenCalledWith({
			id: expect.any(String),
			created_at: NOON,
			created_by: '',
			title: 'Irrigation',
			note: 'Watered the beds',
			includeInReport: false
		});
		// The form starts over.
		expect(noteBody().value).toBe('');
		expect(titleInput().value).toBe('');
		expect(reportSwitch().checked).toBe(true);
	});

	it('reports a saved note as saved and closes, even when the follow-up fails', async () => {
		getTodayData().mockResolvedValue([reading(MORNING)]);
		createAirNote().mockResolvedValue(null);
		const refreshFailure = new Error('refresh failed');
		const onSaved = vi.fn().mockRejectedValue(refreshFailure);
		const { toasts } = render({ onSaved });
		openDialog();
		await vi.waitFor(() => expect(radios()).toHaveLength(1));

		type(noteBody(), 'Vent opened');
		saveButton().click();

		await vi.waitFor(() => expect(dialogOpen()).toBe(false));
		expect(onSaved).toHaveBeenCalledTimes(1);
		expect(toasts()).toEqual([
			expect.objectContaining({ tone: 'success', message: m.devices_save_note_success() })
		]);
		expect(console.error).toHaveBeenCalledWith(
			'Saved the air note, but its follow-up failed:',
			refreshFailure
		);
		expect(noteBody().value).toBe('');
	});

	it('still gives the new note an id where crypto.randomUUID is unavailable (plain http)', async () => {
		vi.stubGlobal('crypto', {});
		getTodayData().mockResolvedValue([reading(MORNING)]);
		createAirNote().mockResolvedValue(null);
		const onSaved = vi.fn();
		render({ onSaved });
		openDialog();
		await vi.waitFor(() => expect(radios()).toHaveLength(1));

		type(noteBody(), 'Vent opened');
		saveButton().click();

		await vi.waitFor(() =>
			expect(onSaved).toHaveBeenCalledWith(
				expect.objectContaining({ id: expect.stringMatching(/^note-\d+$/) })
			)
		);
	});

	it('includes the note in reports by default, and works without an onSaved callback', async () => {
		getTodayData().mockResolvedValue([reading(MORNING)]);
		createAirNote().mockResolvedValue(null);
		render();
		openDialog();
		await vi.waitFor(() => expect(radios()).toHaveLength(1));

		type(noteBody(), 'Vent opened');
		saveButton().click();
		flushSync();

		expect(createAirNote()).toHaveBeenCalledWith(
			expect.objectContaining({ note: 'Vent opened', title: '', include_in_report: true })
		);
		await vi.waitFor(() => expect(dialogOpen()).toBe(false));
	});

	it('shows a spinner on the save button while saving, and keeps the dialog open on failure', async () => {
		getTodayData().mockResolvedValue([reading(MORNING)]);
		let reject!: (error: unknown) => void;
		createAirNote().mockReturnValue(new Promise((_, fail) => (reject = fail)));
		const { toasts } = render();
		openDialog();
		await vi.waitFor(() => expect(radios()).toHaveLength(1));

		type(noteBody(), 'Vent opened');
		saveButton().click();
		flushSync();
		expect(saveButton().getAttribute('aria-busy')).toBe('true');
		expect(cancelButton().disabled).toBe(true);

		reject(
			new ApiError(400, 'Bad Request', {
				url: 'https://api.cropwatch.test/air/notes',
				payload: { message: ['note is too long'] }
			})
		);

		await vi.waitFor(() =>
			expect(toasts()).toEqual([
				expect.objectContaining({ tone: 'danger', message: 'note is too long' })
			])
		);
		expect(dialogOpen()).toBe(true);
		expect(saveButton().disabled).toBe(false);
		expect(noteBody().value).toBe('Vent opened');
		expect(console.error).toHaveBeenCalledWith('Failed to save air note:', expect.any(ApiError));
	});

	it('uses the generic message when saving fails without one', async () => {
		getTodayData().mockResolvedValue([reading(MORNING)]);
		createAirNote().mockRejectedValue(null);
		const { toasts } = render();
		openDialog();
		await vi.waitFor(() => expect(radios()).toHaveLength(1));

		type(noteBody(), 'Vent opened');
		saveButton().click();

		await vi.waitFor(() =>
			expect(toasts()).toEqual([
				expect.objectContaining({ tone: 'danger', message: m.devices_save_note_failed() })
			])
		);
	});

	it('does not save once the session has ended', async () => {
		getTodayData().mockResolvedValue([reading(MORNING)]);
		const { app } = render();
		openDialog();
		await vi.waitFor(() => expect(radios()).toHaveLength(1));

		type(noteBody(), 'Vent opened');
		app.accessToken = undefined;
		flushSync();
		saveButton().click();
		flushSync();

		expect(createAirNote()).not.toHaveBeenCalled();
		expect(dialogOpen()).toBe(true);
	});

	it('discards the draft on cancel and reloads on the next open', async () => {
		getTodayData().mockResolvedValue([reading(MORNING)]);
		render();
		openDialog();
		await vi.waitFor(() => expect(radios()).toHaveLength(1));
		type(titleInput(), 'Draft');
		type(noteBody(), 'Draft body');
		// The native dialog reports its close in a later task; a user cannot reopen it sooner.
		const closed = new Promise((done) =>
			document.querySelector('dialog')!.addEventListener('close', done, { once: true })
		);

		cancelButton().click();
		flushSync();
		await closed;

		expect(dialogOpen()).toBe(false);
		expect(noteBody().value).toBe('');
		expect(titleInput().value).toBe('');
		expect(radios()).toHaveLength(0);

		openDialog();
		await vi.waitFor(() => expect(radios()).toHaveLength(1));
		expect(getTodayData()).toHaveBeenCalledTimes(2);
	});

	it('keeps Space and Enter inside the note editor', () => {
		render({ accessToken: null });
		openDialog();
		const outside = vi.fn();
		document.body.addEventListener('keydown', outside);

		for (const key of [' ', 'Enter']) {
			noteBody().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
		}
		expect(outside).not.toHaveBeenCalled();
		noteBody().dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
		expect(outside).toHaveBeenCalledTimes(1);

		document.body.removeEventListener('keydown', outside);
	});
});
