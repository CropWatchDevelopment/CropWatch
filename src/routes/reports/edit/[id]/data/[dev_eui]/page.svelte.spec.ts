import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '$lib/api/api-error';
import type { PreferencesDto, ReportTemplateDto } from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import { createMockServices, type MockServices } from '$lib/testing/mock-services';
import { renderWithServices } from '$lib/testing/render';
import { formatSensorMeasurement } from '$lib/units';
import EditReportDataPage from './+page.svelte';

const nav = vi.hoisted(() => ({ goto: vi.fn(async () => {}), beforeNavigate: vi.fn() }));
vi.mock('$app/navigation', () => ({ goto: nav.goto, beforeNavigate: nav.beforeNavigate }));

const DATA = {
	template: { id: 5, name: 'Weekly cold room' } as ReportTemplateDto,
	devEui: 'DEV-1',
	deviceName: 'Cold room sensor',
	start: '2026-07-12',
	end: '2026-07-18',
	file: '2026_07_12-2026_07_18.pdf'
};
const PERIOD_START = '2026-07-12T00:00:00.000+09:00';
const PERIOD_END = '2026-07-18T23:59:59.999+09:00';

const EARLY = '2026-07-12T00:00:00.000Z';
const LATE = '2026-07-12T00:10:00.000Z';

function annotation(id: number, title: string, note: string) {
	return {
		id,
		created_at: LATE,
		created_by: 'ops@example.com',
		title,
		note,
		include_in_report: true
	};
}

/** Two readings, oldest first as the API sends them; the later one has two notes. */
function readings() {
	return [
		{
			id: 101,
			created_at: EARLY,
			temperature_c: 4.5,
			humidity: 61.2,
			co2: 420,
			cw_air_annotations: []
		},
		{
			id: 102,
			created_at: LATE,
			temperature_c: 5.1,
			humidity: 60,
			co2: null,
			cw_air_annotations: [
				annotation(11, 'Door open', 'Left open overnight'),
				annotation(12, 'Defrost', 'Scheduled defrost')
			]
		}
	];
}

let services: MockServices;
let view: ReturnType<typeof renderWithServices> | null = null;

function render(preferences?: PreferencesDto) {
	view = renderWithServices(EditReportDataPage, {
		props: { data: DATA } as never,
		services,
		app: { accessToken: 'jwt-token', preferences }
	});
	return view;
}

const getData = () => services.telemetry.getDeviceDataWithinRange;
const byId = <T extends HTMLElement = HTMLElement>(id: string) =>
	document.getElementById(id) as T | null;
const text = () => view?.target.textContent ?? '';
const rows = () => [...view!.target.querySelectorAll<HTMLTableRowElement>('tr.cw-data-table__row')];
const cells = (row: HTMLTableRowElement) =>
	[...row.querySelectorAll('td:not(.cw-data-table__td--actions)')].map((td) =>
		td.textContent?.trim()
	);
const timeOf = (createdAt: string) => new Date(createdAt).toLocaleString();
const rowAt = (createdAt: string) => rows().find((row) => cells(row)[0] === timeOf(createdAt))!;
const saveButton = () => byId<HTMLButtonElement>('report-edit-data-save-button')!;
const stagedCount = () =>
	view!.target.querySelector('.report-edit-data__staged')?.textContent?.trim();
const saveErrors = () =>
	[...view!.target.querySelectorAll('.app-notice--danger li')].map((item) => item.textContent);
/** The navigation guard the page registered with SvelteKit. */
const navigationGuard = () =>
	nav.beforeNavigate.mock.calls.at(-1)![0] as (navigation: { cancel: () => void }) => void;
const buttonIn = (root: ParentNode, label: string) =>
	[...root.querySelectorAll<HTMLButtonElement>('button')].find(
		(button) => button.textContent?.trim() === label
	);

function click(element: Element | null | undefined) {
	(element as HTMLElement).click();
	flushSync();
}

function type(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
	input.value = value;
	input.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

/** Opens the notes dialog of the reading taken at `createdAt`. */
function notesOf(createdAt: string): HTMLDialogElement {
	const row = rowAt(createdAt);
	click(row.querySelector('.cw-button--info'));
	return row.querySelector('dialog')!;
}

const noteItem = (dialog: HTMLElement, title: string) =>
	[...dialog.querySelectorAll<HTMLElement>('.report-note-dialog__item')].find((item) =>
		item.textContent?.includes(title)
	)!;

/** Staging re-renders the table; wait for its rows to come back. */
const tableReady = () => vi.waitFor(() => expect(rows()).toHaveLength(2));

async function stageNewNote(createdAt: string, body: string, title = '') {
	const dialog = notesOf(createdAt);
	click(buttonIn(dialog, m.reports_new_edit_data_note_add()));
	if (title) type(dialog.querySelector('input:not([type="checkbox"])')!, title);
	type(dialog.querySelector('textarea')!, body);
	click(buttonIn(dialog, m.reports_new_edit_data_note_stage()));
	await tableReady();
}

async function stageEdit(title: string, body: string) {
	const dialog = notesOf(LATE);
	click(buttonIn(noteItem(dialog, title), m.reports_new_edit_data_note_edit()));
	type(dialog.querySelector('textarea')!, body);
	click(buttonIn(dialog, m.reports_new_edit_data_note_stage()));
	await tableReady();
}

async function stageDelete(title: string) {
	click(buttonIn(noteItem(notesOf(LATE), title), m.reports_new_edit_data_note_delete()));
	await tableReady();
}

/** Renders the page with the two readings loaded. */
async function renderLoaded(preferences?: PreferencesDto) {
	getData().mockResolvedValue(readings() as never);
	render(preferences);
	await tableReady();
}

beforeEach(() => {
	services = createMockServices();
});

afterEach(() => {
	view?.unmount();
	view = null;
	nav.goto.mockClear();
	nav.beforeNavigate.mockClear();
	vi.restoreAllMocks();
});

describe('report data edit page — the readings', () => {
	it('loads the readings of the period, in the report timezone, newest first', async () => {
		await renderLoaded();

		expect(getData()).toHaveBeenCalledTimes(1);
		expect(getData()).toHaveBeenCalledWith('DEV-1', {
			start: PERIOD_START,
			end: PERIOD_END,
			take: 5000,
			timezone: 'Asia/Tokyo'
		});
		expect(document.title).toBe(m.reports_new_edit_data_title());
		expect(view!.target.querySelector('h1')?.textContent).toBe(m.reports_new_edit_data_title());
		expect(text()).toContain(
			m.reports_new_edit_data_subtitle({
				device: 'Cold room sensor',
				start: '2026-07-12',
				end: '2026-07-18'
			})
		);
		expect(view!.target.querySelector('.app-notice--info')?.textContent).toContain(
			m.reports_new_edit_data_info()
		);
		expect(view!.target.querySelector('.cw-card')?.textContent).toContain('Weekly cold room');
		expect(text()).toContain(m.rule_subject_co2());
		expect(rows().map(cells)).toEqual([
			[
				timeOf(LATE),
				formatSensorMeasurement('temperature_c', 5.1).display,
				formatSensorMeasurement('humidity', 60).display,
				'—',
				m.reports_new_edit_data_note_count({ count: 2 })
			],
			[
				timeOf(EARLY),
				formatSensorMeasurement('temperature_c', 4.5).display,
				formatSensorMeasurement('humidity', 61.2).display,
				formatSensorMeasurement('co2', 420).display,
				'—'
			]
		]);
		expect(saveButton().disabled).toBe(true);
		expect(stagedCount()).toBeUndefined();
	});

	it('shows the readings in the units the user prefers', async () => {
		const preferences = { temperature_unit: 'fahrenheit' } as PreferencesDto;
		await renderLoaded(preferences);

		const shown = cells(rowAt(EARLY))[1];
		expect(shown).toBe(formatSensorMeasurement('temperature_c', 4.5, preferences).display);
		expect(shown).not.toBe(formatSensorMeasurement('temperature_c', 4.5).display);
	});

	it('leaves out the CO2 column for a device that reports none', async () => {
		getData().mockResolvedValue(readings().map((reading) => ({ ...reading, co2: null })) as never);
		render();
		await tableReady();

		expect(text()).not.toContain(m.rule_subject_co2());
		expect(cells(rows()[0])).toHaveLength(4);
	});

	it('reads readings wrapped in a data envelope, filling in what is missing', async () => {
		getData().mockResolvedValue({
			data: [
				{
					temperature_c: 'n/a',
					humidity: null,
					co2: 'n/a',
					cw_air_annotations: { data: [annotation(13, 'Probe moved', 'Recalibrated')] }
				}
			]
		} as never);
		render();

		await vi.waitFor(() => expect(rows()).toHaveLength(1));
		expect(cells(rows()[0])).toEqual([
			new Date('').toLocaleString(),
			formatSensorMeasurement('temperature_c', 0).display,
			formatSensorMeasurement('humidity', 0).display,
			formatSensorMeasurement('co2', 0).display,
			m.reports_new_edit_data_note_count({ count: 1 })
		]);
	});

	it.each([
		['no readings', []],
		['an envelope without a list', { data: 'nothing' }],
		['an empty envelope', {}]
	])('says when the period has no data: %s', async (_label, response) => {
		getData().mockResolvedValue(response as never);
		render();

		await vi.waitFor(() =>
			expect(view!.target.querySelector('.app-notice--neutral')?.textContent).toContain(
				m.reports_new_edit_data_no_data()
			)
		);
		expect(view!.target.querySelector('.cw-data-table')).toBeNull();
	});

	it.each([
		["the API's message", { message: 'Data unavailable' }, 'Data unavailable'],
		['a generic message when there is none', {}, undefined],
		[
			'a generic message for an API error without a message',
			new ApiError(500, 'Internal Server Error', {
				url: 'https://api.cropwatch.test/devices/DEV-1/data',
				payload: null
			}),
			undefined
		],
		['a generic message for a network failure', new TypeError('Failed to fetch'), undefined]
	])('shows %s when the readings cannot be loaded', async (_label, cause, message) => {
		getData().mockRejectedValue(cause);
		render();

		await vi.waitFor(() =>
			expect(view!.target.querySelector('.app-notice--danger')?.textContent?.trim()).toBe(
				message ?? m.reports_new_edit_data_load_failed()
			)
		);
		expect(view!.target.querySelector('.cw-data-table')).toBeNull();
	});

	it.each([
		['null', null],
		['undefined', undefined]
	])(
		'says the readings could not be loaded when the API answers with an empty body (%s)',
		async (_label, body) => {
			getData().mockResolvedValue(body as never);
			render();

			await vi.waitFor(() =>
				expect(view!.target.querySelector('.app-notice--danger')?.textContent?.trim()).toBe(
					m.reports_new_edit_data_load_failed()
				)
			);
			expect(view!.target.querySelector('.cw-data-table')).toBeNull();
			expect(text()).not.toContain(m.reports_new_edit_data_no_data());
		}
	);

	it('goes back to the reports list', async () => {
		await renderLoaded();

		click(byId('report-edit-data-back-button'));
		expect(nav.goto).toHaveBeenCalledWith('/reports');

		click(byId('report-edit-data-cancel-button'));
		expect(nav.goto).toHaveBeenCalledTimes(2);
		expect(byId('report-edit-data-back-button')?.textContent).toContain(m.action_back());
	});
});

describe('report data edit page — staging and saving notes', () => {
	it('stages a new note, saves it and queues the report for regeneration', async () => {
		services.airNotes.createAirNote.mockResolvedValue(null);
		services.reports.requestReportRegeneration.mockResolvedValue({} as never);
		await renderLoaded();

		await stageNewNote(EARLY, ' Door left open ', ' Door ');

		expect(stagedCount()).toBe(m.reports_new_edit_data_staged_count({ count: 1 }));
		const noteCount = rowAt(EARLY).querySelector('.report-edit-data__note-count')!;
		expect(noteCount.firstChild?.textContent?.trim()).toBe(
			m.reports_new_edit_data_note_count({ count: 1 })
		);
		expect(noteCount.querySelector('.cw-chip')?.textContent?.trim()).toBe(
			m.reports_new_edit_data_staged_badge()
		);
		// The other reading has notes, none of them staged.
		expect(rowAt(LATE).querySelector('.report-edit-data__note-count .cw-chip')).toBeNull();
		expect(services.airNotes.createAirNote).not.toHaveBeenCalled();
		expect(saveButton().disabled).toBe(false);

		click(saveButton());

		await vi.waitFor(() => expect(nav.goto).toHaveBeenCalledWith('/reports'));
		expect(services.airNotes.createAirNote).toHaveBeenCalledWith({
			note: 'Door left open',
			title: 'Door',
			include_in_report: true,
			created_at: EARLY,
			dev_eui: 'DEV-1'
		});
		expect(services.reports.requestReportRegeneration).toHaveBeenCalledWith(5, {
			devEui: 'DEV-1',
			periodStart: PERIOD_START,
			periodEnd: PERIOD_END,
			sourceObjectName: '2026_07_12-2026_07_18.pdf',
			editCount: 1
		});
		const [noteOrder] = services.airNotes.createAirNote.mock.invocationCallOrder;
		const [regenerationOrder] = services.reports.requestReportRegeneration.mock.invocationCallOrder;
		expect(noteOrder).toBeLessThan(regenerationOrder);
		expect(view!.toasts()[0]).toMatchObject({
			tone: 'success',
			message: m.reports_new_edit_data_saved()
		});
	});

	it('does not report a failed navigation after a successful save as a failed save', async () => {
		services.airNotes.createAirNote.mockResolvedValue(null);
		services.reports.requestReportRegeneration.mockResolvedValue({} as never);
		const navigationError = new Error('Navigation aborted');
		nav.goto.mockRejectedValueOnce(navigationError);
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		await renderLoaded();
		await stageNewNote(EARLY, 'Door left open', 'Door');

		click(saveButton());

		await vi.waitFor(() =>
			expect(consoleError).toHaveBeenCalledWith(
				'Failed to open the reports list after saving:',
				navigationError
			)
		);
		expect(view!.toasts().map((toast) => toast.tone)).toEqual(['success']);
		expect(saveErrors()).toEqual([]);
		expect(view!.target.querySelector('.app-notice--danger')).toBeNull();
	});

	it('saves edits and deletions of saved notes, one after another', async () => {
		services.airNotes.updateAirNote.mockResolvedValue(null);
		services.airNotes.deleteAirNote.mockResolvedValue(null);
		services.reports.requestReportRegeneration.mockResolvedValue({} as never);
		await renderLoaded();

		await stageEdit('Door open', 'Closed at 7:00');
		await stageDelete('Defrost');

		expect(stagedCount()).toBe(m.reports_new_edit_data_staged_count({ count: 2 }));
		click(saveButton());

		await vi.waitFor(() => expect(nav.goto).toHaveBeenCalledWith('/reports'));
		expect(services.airNotes.updateAirNote).toHaveBeenCalledWith(11, {
			note: 'Closed at 7:00',
			title: 'Door open',
			include_in_report: true
		});
		expect(services.airNotes.deleteAirNote).toHaveBeenCalledWith(12);
		expect(services.airNotes.updateAirNote.mock.invocationCallOrder[0]).toBeLessThan(
			services.airNotes.deleteAirNote.mock.invocationCallOrder[0]
		);
		expect(services.reports.requestReportRegeneration).toHaveBeenCalledWith(
			5,
			expect.objectContaining({ editCount: 2 })
		);
	});

	it('keeps the failed changes staged, and queues nothing, after a partial save', async () => {
		services.airNotes.createAirNote.mockRejectedValueOnce({ message: 'Note too long' });
		services.airNotes.updateAirNote.mockRejectedValueOnce({});
		services.airNotes.deleteAirNote.mockResolvedValue(null);
		await renderLoaded();
		await stageNewNote(EARLY, 'Door left open', 'Door');
		await stageEdit('Door open', 'Closed at 7:00');
		await stageDelete('Defrost');

		click(saveButton());

		await vi.waitFor(() => expect(saveErrors()).toHaveLength(2));
		expect(view!.target.querySelector('.app-notice--danger')?.textContent).toContain(
			m.reports_new_edit_data_save_partial()
		);
		// Without a message from the API, the failed change is named.
		expect(saveErrors()).toEqual(['Note too long', 'update: Door open']);
		expect(services.reports.requestReportRegeneration).not.toHaveBeenCalled();
		await tableReady();
		expect(stagedCount()).toBe(m.reports_new_edit_data_staged_count({ count: 2 }));
		expect(saveButton().disabled).toBe(false);
		expect(nav.goto).not.toHaveBeenCalled();

		services.airNotes.createAirNote.mockResolvedValue(null);
		services.airNotes.updateAirNote.mockResolvedValue(null);
		services.reports.requestReportRegeneration.mockResolvedValue({} as never);
		click(saveButton());

		await vi.waitFor(() => expect(nav.goto).toHaveBeenCalledWith('/reports'));
		expect(services.airNotes.deleteAirNote).toHaveBeenCalledTimes(1);
		expect(services.reports.requestReportRegeneration).toHaveBeenCalledWith(
			5,
			expect.objectContaining({ editCount: 2 })
		);
	});

	it('names a failed note by its text when it has no title', async () => {
		services.airNotes.createAirNote.mockRejectedValue({});
		await renderLoaded();
		await stageNewNote(EARLY, 'Door left open');

		click(saveButton());

		await vi.waitFor(() => expect(saveErrors()).toEqual(['create: Door left open']));
	});

	it('names a failed change when the API gives no message, or was never reached', async () => {
		services.airNotes.createAirNote.mockRejectedValueOnce(
			new ApiError(500, 'Internal Server Error', {
				url: 'https://api.cropwatch.test/air-notes',
				payload: null
			})
		);
		services.airNotes.updateAirNote.mockRejectedValueOnce(new TypeError('Failed to fetch'));
		await renderLoaded();
		await stageNewNote(EARLY, 'Door left open', 'Door');
		await stageEdit('Door open', 'Closed at 7:00');

		click(saveButton());

		await vi.waitFor(() => expect(saveErrors()).toEqual(['create: Door', 'update: Door open']));
	});

	it.each([
		["the API's message", { message: 'Queue is full' }, 'Queue is full'],
		['a generic message when there is none', {}, m.reports_new_save_failed()],
		[
			'a generic message for an API error without a message',
			new ApiError(500, 'Internal Server Error', {
				url: 'https://api.cropwatch.test/reports/5/regenerations',
				payload: null
			}),
			m.reports_new_save_failed()
		],
		[
			'a generic message for a network failure',
			new TypeError('Failed to fetch'),
			m.reports_new_save_failed()
		]
	])('shows %s when the regeneration cannot be queued', async (_label, cause, message) => {
		services.airNotes.createAirNote.mockResolvedValue(null);
		services.reports.requestReportRegeneration.mockRejectedValue(cause);
		await renderLoaded();
		await stageNewNote(EARLY, 'Door left open');

		click(saveButton());

		await vi.waitFor(() => expect(saveErrors()).toEqual([message]));
		expect(nav.goto).not.toHaveBeenCalled();
		expect(view!.toasts()).toHaveLength(0);
		// The note itself was saved, so nothing is left to save.
		await tableReady();
		expect(stagedCount()).toBeUndefined();
		expect(saveButton().disabled).toBe(true);
	});

	it('shows the save in progress', async () => {
		services.airNotes.createAirNote.mockReturnValue(new Promise(() => {}));
		await renderLoaded();
		await stageNewNote(EARLY, 'Door left open');

		click(saveButton());

		expect(saveButton().getAttribute('aria-busy')).toBe('true');
		expect(saveButton().disabled).toBe(true);
		expect(byId<HTMLButtonElement>('report-edit-data-cancel-button')?.disabled).toBe(true);
		expect(services.airNotes.createAirNote).toHaveBeenCalledTimes(1);
	});

	it('drops a staged note, and restores a note staged for deletion', async () => {
		await renderLoaded();
		await stageNewNote(EARLY, 'Door left open');
		click(
			buttonIn(noteItem(notesOf(EARLY), 'Door left open'), m.reports_new_edit_data_note_delete())
		);
		await tableReady();

		expect(stagedCount()).toBeUndefined();
		expect(cells(rowAt(EARLY))[4]).toBe('—');

		await stageDelete('Defrost');
		expect(stagedCount()).toBe(m.reports_new_edit_data_staged_count({ count: 1 }));
		click(buttonIn(noteItem(notesOf(LATE), 'Defrost'), m.reports_new_edit_data_note_restore()));
		await tableReady();

		expect(stagedCount()).toBeUndefined();
		expect(saveButton().disabled).toBe(true);
	});
});

describe('report data edit page — leaving with unsaved notes', () => {
	it('leaves without asking when nothing is staged', async () => {
		const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
		await renderLoaded();
		const navigation = { cancel: vi.fn() };

		navigationGuard()(navigation);

		expect(confirm).not.toHaveBeenCalled();
		expect(navigation.cancel).not.toHaveBeenCalled();
	});

	it.each([
		['stays when the user cancels', false, 1],
		['leaves when the user confirms', true, 0]
	])('asks before leaving with staged notes, and %s', async (_label, answer, cancels) => {
		const confirm = vi.spyOn(window, 'confirm').mockReturnValue(answer);
		await renderLoaded();
		await stageNewNote(EARLY, 'Door left open');
		const navigation = { cancel: vi.fn() };

		navigationGuard()(navigation);

		expect(confirm).toHaveBeenCalledWith(m.reports_new_edit_data_unsaved_warning());
		expect(navigation.cancel).toHaveBeenCalledTimes(cancels);
	});

	it('does not ask while saving', async () => {
		const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
		services.airNotes.createAirNote.mockReturnValue(new Promise(() => {}));
		await renderLoaded();
		await stageNewNote(EARLY, 'Door left open');
		click(saveButton());
		const navigation = { cancel: vi.fn() };

		navigationGuard()(navigation);

		expect(confirm).not.toHaveBeenCalled();
		expect(navigation.cancel).not.toHaveBeenCalled();
	});

	it('asks the browser to warn before unloading with staged notes, but not while saving', async () => {
		services.airNotes.createAirNote.mockReturnValue(new Promise(() => {}));
		await renderLoaded();
		const unload = () => {
			const event = new Event('beforeunload', { cancelable: true });
			window.dispatchEvent(event);
			return event.defaultPrevented;
		};
		expect(unload()).toBe(false);

		await stageNewNote(EARLY, 'Door left open');
		expect(unload()).toBe(true);

		click(saveButton());
		expect(unload()).toBe(false);
	});
});
