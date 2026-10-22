import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { formatDateTime } from '$lib/i18n/format';
import { m } from '$lib/paraglide/messages.js';
import { createFakeFetch, jsonResponse } from '$lib/testing/http';
import { renderWithServices } from '$lib/testing/render';
import type { AirRow } from '../interfaces/AirRow.interface';
import type { Note } from '../interfaces/note.interface';
import NotesCreateDialog from './notes-create-dialog.svelte';

const { forms } = vi.hoisted(() => ({
	forms: { applyAction: vi.fn(), deserialize: vi.fn((text: string) => JSON.parse(text)) }
}));
vi.mock('$app/forms', () => ({ applyAction: forms.applyAction, deserialize: forms.deserialize }));

const ROW: AirRow = {
	id: 'row-1',
	created_at: '2026-10-21T03:00:00.000Z',
	temperature_c: 21.5,
	humidity: 55,
	co2: 0,
	dev_eui: 'AIR-001',
	alerts: [],
	cw_air_annotations: []
};

let view: ReturnType<typeof renderWithServices> | null = null;
let fake: ReturnType<typeof createFakeFetch>;

/** The device page's own `saveDataNote` action, answered with an ActionResult body. */
function answer(result: unknown) {
	fake = createFakeFetch(() => jsonResponse(result));
	vi.stubGlobal('fetch', fake.fetch);
}

function render(onSaved?: (note: Note) => void) {
	view = renderWithServices(NotesCreateDialog, {
		props: { row: ROW, dev_eui: 'AIR-001', onSaved }
	});
	return view;
}

const text = () => document.body.textContent ?? '';
const dialogOpen = () => document.querySelector('dialog')?.open ?? false;
const buttonWith = (label: string) =>
	[...document.querySelectorAll('button')].find((button) => button.textContent?.includes(label))!;
const saveButton = () => buttonWith(m.display_save_note());
const noteBody = () => document.querySelector('textarea') as HTMLTextAreaElement;
const titleInput = () =>
	document.querySelector<HTMLInputElement>(
		`input[placeholder="${m.display_note_title_placeholder()}"]`
	)!;
const reportSwitch = () => document.querySelector<HTMLInputElement>('input[role="switch"]')!;
const sentFields = () =>
	[...((fake.fetch as unknown as Mock).mock.calls[0][1].body as FormData).entries()].map(
		([name, value]) => [name, String(value)]
	);

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

function writeNote(note = 'Watered the beds', title = 'Irrigation') {
	openDialog();
	type(titleInput(), title);
	type(noteBody(), note);
}

beforeEach(() => {
	answer({ type: 'success', status: 200 });
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
	view?.unmount();
	view = null;
	document.body.innerHTML = '';
	forms.applyAction.mockReset();
	forms.deserialize.mockClear();
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe('NotesCreateDialog', () => {
	it("opens on the row's reading", () => {
		render();
		expect(dialogOpen()).toBe(false);

		openDialog();

		expect(dialogOpen()).toBe(true);
		expect(text()).toContain(
			m.display_add_note_title({ createdAt: formatDateTime(ROW.created_at) })
		);
		expect(saveButton().disabled).toBe(true);
	});

	it("saves through the device page's action, then closes and reports the new note", async () => {
		const result = { type: 'success', status: 200, data: { message: ' Note saved ' } };
		answer(result);
		const onSaved = vi.fn();
		const { toasts } = render(onSaved);
		writeNote('  Watered the beds  ', '  Irrigation  ');
		reportSwitch().click();
		flushSync();

		saveButton().click();

		await vi.waitFor(() => expect(dialogOpen()).toBe(false));
		expect(fake.requests.map((request) => [request.method, request.url])).toEqual([
			['POST', '?/saveDataNote']
		]);
		expect(sentFields()).toEqual([
			['title', 'Irrigation'],
			['note', 'Watered the beds'],
			['include_in_report', 'false'],
			['created_at', ROW.created_at],
			['dev_eui', 'AIR-001']
		]);
		expect(forms.deserialize).toHaveBeenCalledWith(JSON.stringify(result));
		expect(forms.applyAction).toHaveBeenCalledWith(result);
		expect(toasts()).toEqual([expect.objectContaining({ tone: 'success', message: 'Note saved' })]);
		expect(onSaved).toHaveBeenCalledWith({
			id: expect.any(String),
			created_at: ROW.created_at,
			created_by: '',
			title: 'Irrigation',
			note: 'Watered the beds',
			includeInReport: false
		});
		// The form starts over for the next note.
		expect(noteBody().value).toBe('');
		expect(titleInput().value).toBe('');
		expect(reportSwitch().checked).toBe(true);
	});

	it('still gives the new note an id where crypto.randomUUID is unavailable (plain http)', async () => {
		vi.stubGlobal('crypto', {});
		const onSaved = vi.fn();
		render(onSaved);
		writeNote();

		saveButton().click();

		await vi.waitFor(() =>
			expect(onSaved).toHaveBeenCalledWith(
				expect.objectContaining({ id: expect.stringMatching(/^note-\d+$/) })
			)
		);
	});

	it('includes the note in reports by default and confirms with the default message', async () => {
		const { toasts } = render();
		writeNote('Vent opened', '');

		saveButton().click();

		await vi.waitFor(() =>
			expect(toasts()).toEqual([
				expect.objectContaining({ tone: 'success', message: m.devices_save_note_success() })
			])
		);
		expect(sentFields()).toContainEqual(['include_in_report', 'true']);
		expect(sentFields()).toContainEqual(['title', '']);
	});

	it("shows the action's refusal and keeps the note", async () => {
		answer({ type: 'failure', status: 400, data: { message: 'Note is too long' } });
		const onSaved = vi.fn();
		const { toasts } = render(onSaved);
		writeNote();

		saveButton().click();

		await vi.waitFor(() =>
			expect(toasts()).toEqual([
				expect.objectContaining({ tone: 'danger', message: 'Note is too long' })
			])
		);
		expect(onSaved).not.toHaveBeenCalled();
		expect(dialogOpen()).toBe(true);
		expect(noteBody().value).toBe('Watered the beds');
		await vi.waitFor(() => expect(saveButton().disabled).toBe(false));
	});

	it('falls back to the generic failure for any result without a message', async () => {
		const { toasts } = render();
		writeNote();
		const results = [
			{ type: 'failure', status: 400 },
			{ type: 'failure', status: 400, data: 'refused' },
			{ type: 'failure', status: 400, data: { message: '   ' } },
			{ type: 'error', status: 500 },
			{ type: 'error', status: 500, error: 'boom' }
		];

		for (const [index, result] of results.entries()) {
			answer(result);
			saveButton().click();
			await vi.waitFor(() => expect(forms.applyAction).toHaveBeenCalledTimes(index + 1));
			await vi.waitFor(() => expect(saveButton().disabled).toBe(false));
			expect(forms.applyAction).toHaveBeenLastCalledWith(result);
			expect(toasts().at(-1)).toMatchObject({
				tone: 'danger',
				message: m.devices_save_note_failed()
			});
		}

		expect(dialogOpen()).toBe(true);
	});

	it("shows an error result's own message", async () => {
		const result = { type: 'error', status: 500, error: { message: ' Internal Error ' } };
		answer(result);
		const onSaved = vi.fn();
		const { toasts } = render(onSaved);
		writeNote();

		saveButton().click();

		await vi.waitFor(() =>
			expect(toasts()).toEqual([
				expect.objectContaining({ tone: 'danger', message: 'Internal Error' })
			])
		);
		// applyAction shows the error page for it, as SvelteKit does.
		expect(forms.applyAction).toHaveBeenCalledWith(result);
		expect(onSaved).not.toHaveBeenCalled();
	});

	it('follows a redirect result without reporting a failure', async () => {
		const result = { type: 'redirect', status: 303, location: '/auth/login' };
		answer(result);
		const onSaved = vi.fn();
		const { toasts } = render(onSaved);
		writeNote();

		saveButton().click();

		// applyAction is what navigates to the redirect's location.
		await vi.waitFor(() => expect(forms.applyAction).toHaveBeenCalledWith(result));
		await vi.waitFor(() => expect(saveButton().disabled).toBe(false));
		expect(toasts()).toEqual([]);
		expect(onSaved).not.toHaveBeenCalled();
	});

	it('reports a saved note as saved and closes, even when the follow-up fails', async () => {
		const refreshFailure = new Error('refresh failed');
		const onSaved = vi.fn().mockRejectedValue(refreshFailure);
		const { toasts } = render(onSaved);
		writeNote();

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

	it('says the note could not be saved when the request itself fails', async () => {
		vi.stubGlobal(
			'fetch',
			createFakeFetch(() => {
				throw new TypeError('Failed to fetch');
			}).fetch
		);
		const { toasts } = render();
		writeNote();

		saveButton().click();

		// The network error's own text is not for users.
		await vi.waitFor(() =>
			expect(toasts()).toEqual([
				expect.objectContaining({ tone: 'danger', message: m.devices_save_note_failed() })
			])
		);
		expect(console.error).toHaveBeenCalledWith('Failed to save air note:', expect.any(TypeError));
		expect(dialogOpen()).toBe(true);
	});

	it('uses the generic failure for a thrown value without a message', async () => {
		vi.stubGlobal('fetch', createFakeFetch(() => Promise.reject(null)).fetch);
		const { toasts } = render();
		writeNote();

		saveButton().click();

		await vi.waitFor(() =>
			expect(toasts()).toEqual([
				expect.objectContaining({ tone: 'danger', message: m.devices_save_note_failed() })
			])
		);
	});

	it('shows a spinner while saving and blocks a second save', async () => {
		let respond!: (response: Response) => void;
		vi.stubGlobal(
			'fetch',
			createFakeFetch(() => new Promise<Response>((done) => (respond = done))).fetch
		);
		render();
		writeNote();

		saveButton().click();
		flushSync();

		expect(saveButton().getAttribute('aria-busy')).toBe('true');
		expect(buttonWith(m.action_cancel()).disabled).toBe(true);
		respond(jsonResponse({ type: 'success', status: 200 }));
		await vi.waitFor(() => expect(dialogOpen()).toBe(false));
	});

	it('cannot save an empty note', () => {
		render();
		writeNote('   ');

		expect(saveButton().disabled).toBe(true);
	});

	it('discards the draft on cancel', () => {
		render();
		writeNote();

		buttonWith(m.action_cancel()).click();
		flushSync();

		expect(dialogOpen()).toBe(false);
		expect(noteBody().value).toBe('');
		expect(titleInput().value).toBe('');
	});

	it('keeps Space and Enter inside the note editor', () => {
		render();
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
