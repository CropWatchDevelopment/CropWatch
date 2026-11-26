import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatDateTime } from '#lib/i18n/format.ts';
import { m } from '#lib/paraglide/messages.js';
import { createMockServices, type MockServices } from '#lib/testing/mock-services.ts';
import { renderWithServices } from '#lib/testing/render.ts';
import NotesReviewDialog from './NotesReviewDialog.svelte';

let services: MockServices;
let view: ReturnType<typeof renderWithServices> | null = null;

function render(
	props: Partial<{
		devEui: string;
		disabled: boolean;
		canWriteNotes: boolean;
		onDeleted: () => unknown;
	}> = {},
	accessToken: string | null = 'jwt-token'
) {
	view = renderWithServices(NotesReviewDialog, {
		props: { devEui: 'AIR-1', ...props },
		services,
		app: { accessToken: accessToken ?? undefined }
	});
	return view;
}

/** A note as the API sends it, written at a local time in October 2026. */
const note = (id: number, day: number, hour: number, overrides: Record<string, unknown> = {}) => ({
	id,
	created_at: new Date(2026, 9, day, hour, 30).toISOString(),
	created_by: 'Alice',
	title: `Note ${id}`,
	note: `Body ${id}`,
	include_in_report: true,
	...overrides
});

const byId = (id: string) => document.getElementById(id) as HTMLButtonElement | null;
const text = () => document.body.textContent ?? '';
const getNotes = () => services.airNotes.getAllAirNotesForMonth;
const dialogOpen = () =>
	(document.querySelector('dialog') as HTMLDialogElement | null)?.open ?? false;
const dayKeys = () =>
	[...document.querySelectorAll('.cw-calendar-scroll__date-key')].map((key) => key.textContent);
const noteTitles = () =>
	[...document.querySelectorAll('.notes-review-dialog__note-title')].map((title) =>
		title.textContent?.trim()
	);

function open() {
	byId('device-notes-review-open-button')?.click();
	flushSync();
}

const deleteButton = (id: number) => byId(`device-notes-review-row-${id}-delete-button`);
const cancelButton = (id: number) => byId(`device-notes-review-row-${id}-delete-cancel-button`);
const confirmButton = (id: number) => byId(`device-notes-review-row-${id}-delete-confirm-button`);

function click(button: HTMLButtonElement | null) {
	button?.click();
	flushSync();
}

function search(query: string) {
	const input = document.getElementById('device-notes-review-search') as HTMLInputElement;
	input.value = query;
	input.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(new Date(2026, 9, 21, 12, 0));
	services = createMockServices();
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
	view?.unmount();
	view = null;
	document.body.innerHTML = '';
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe('notes review dialog', () => {
	it("loads this month's notes when opened and lists them by day, oldest first", async () => {
		getNotes().mockResolvedValue({
			data: [
				note(3, 7, 8, { title: '  ', created_by: ' ', include_in_report: false }),
				note(2, 5, 14),
				note(1, 5, 9),
				note(4, 0, 0, { created_at: 'not a date' })
			]
		});
		render();
		expect(getNotes()).not.toHaveBeenCalled();

		open();

		expect(dialogOpen()).toBe(true);
		expect(getNotes()).toHaveBeenCalledWith({ dev_eui: 'AIR-1', date: new Date(2026, 9, 1) });
		await vi.waitFor(() => expect(dayKeys()).toEqual(['2026-10-05', '2026-10-07']));
		expect(noteTitles()).toEqual(['Note 1', 'Note 2', m.display_note_untitled()]);

		const [first, , untitled] = document.querySelectorAll('.notes-review-dialog__note');
		const firstAt = note(1, 5, 9).created_at;
		expect(first.textContent).toContain(
			`${formatDateTime(firstAt, { hour: 'numeric', minute: '2-digit' })} - Alice`
		);
		expect(first.textContent).toContain(m.display_note_report_included());
		expect(first.textContent).toContain('Body 1');
		// Without an author the meta line is just the time.
		const untitledMeta = untitled.querySelector('.notes-review-dialog__note-meta')?.textContent;
		expect(untitledMeta).toBe(
			formatDateTime(note(3, 7, 8).created_at, { hour: 'numeric', minute: '2-digit' })
		);
		expect(untitled.textContent).toContain(m.display_note_report_excluded());
		// Without the API's can_write_notes there is nothing to delete with.
		expect(document.querySelector('[id$="-delete-button"]')).toBeNull();
	});

	it('deletes a note once the user confirms, and drops its day when it was the last one', async () => {
		getNotes().mockResolvedValue({ data: [note(1, 5, 9), note(2, 5, 14), note(3, 7, 8)] });
		services.airNotes.deleteAirNote.mockResolvedValue({ message: 'deleted' });
		const onDeleted = vi.fn();
		const { toasts } = render({ canWriteNotes: true, onDeleted });
		open();
		await vi.waitFor(() => expect(noteTitles()).toHaveLength(3));
		expect(deleteButton(1)).not.toBeNull();
		expect(deleteButton(3)).not.toBeNull();

		click(deleteButton(3));
		expect(text()).toContain(m.display_note_delete_confirm());
		expect(deleteButton(3)).toBeNull();
		await vi.waitFor(() => expect(document.activeElement).toBe(cancelButton(3)));
		expect(services.airNotes.deleteAirNote).not.toHaveBeenCalled();

		click(confirmButton(3));

		await vi.waitFor(() => expect(noteTitles()).toEqual(['Note 1', 'Note 2']));
		expect(services.airNotes.deleteAirNote).toHaveBeenCalledExactlyOnceWith(3);
		expect(dayKeys()).toEqual(['2026-10-05']);
		expect(text()).not.toContain(m.display_note_delete_confirm());
		expect(toasts().at(-1)).toMatchObject({ tone: 'success', message: m.display_note_deleted() });
		expect(onDeleted).toHaveBeenCalledOnce();
	});

	it('asks again after a cancel, and keeps the day while it still has notes', async () => {
		getNotes().mockResolvedValue({ data: [note(1, 5, 9), note(2, 5, 14)] });
		services.airNotes.deleteAirNote.mockResolvedValue(null);
		render({ canWriteNotes: true });
		open();
		await vi.waitFor(() => expect(noteTitles()).toHaveLength(2));

		click(deleteButton(1));
		click(cancelButton(1));
		expect(text()).not.toContain(m.display_note_delete_confirm());
		await vi.waitFor(() => expect(document.activeElement).toBe(deleteButton(1)));

		// Only one note asks at a time.
		click(deleteButton(1));
		click(deleteButton(2));
		expect(confirmButton(1)).toBeNull();
		expect(deleteButton(1)).not.toBeNull();

		// Reopening the dialog starts without a pending question.
		click(byId('device-notes-review-close-button'));
		open();
		await vi.waitFor(() => expect(deleteButton(2)).not.toBeNull());
		expect(confirmButton(2)).toBeNull();

		click(deleteButton(2));
		click(confirmButton(2));
		await vi.waitFor(() => expect(noteTitles()).toEqual(['Note 1']));
		expect(dayKeys()).toEqual(['2026-10-05']);
	});

	it('keeps the note and says so when the delete fails, sending it only once', async () => {
		getNotes().mockResolvedValue({ data: [note(1, 5, 9), note(2, 6, 9)] });
		let fail!: (error: unknown) => void;
		services.airNotes.deleteAirNote.mockReturnValue(
			new Promise((_, reject) => (fail = reject)) as never
		);
		const onDeleted = vi.fn();
		const { toasts } = render({ canWriteNotes: true, onDeleted });
		open();
		await vi.waitFor(() => expect(noteTitles()).toHaveLength(2));

		click(deleteButton(1));
		click(confirmButton(1));
		// While it runs nothing else can be pressed: not the note's buttons, not another note's Delete.
		expect(confirmButton(1)?.disabled).toBe(true);
		expect(cancelButton(1)?.disabled).toBe(true);
		expect(deleteButton(2)?.disabled).toBe(true);
		click(confirmButton(1));
		expect(services.airNotes.deleteAirNote).toHaveBeenCalledOnce();

		const failure = new TypeError('Failed to fetch');
		fail(failure);

		await vi.waitFor(() =>
			expect(toasts().at(-1)).toMatchObject({
				tone: 'danger',
				message: m.display_note_delete_failed()
			})
		);
		expect(console.error).toHaveBeenCalledWith('Error deleting note:', failure);
		expect(noteTitles()).toEqual(['Note 1', 'Note 2']);
		// The question stays, so the user can try again or cancel.
		expect(confirmButton(1)?.disabled).toBe(false);
		expect(cancelButton(1)?.disabled).toBe(false);
		expect(deleteButton(2)?.disabled).toBe(false);
		expect(onDeleted).not.toHaveBeenCalled();
	});

	it('filters the notes by title, text, author or time', async () => {
		// The API may also answer with a bare list (the repository types the envelope only).
		getNotes().mockResolvedValue([
			note(1, 5, 9, { title: 'Pump check' }),
			note(2, 6, 9, { note: 'Fan replaced' }),
			note(3, 7, 9, { created_by: 'Bob' })
		] as never);
		render();
		open();
		await vi.waitFor(() => expect(noteTitles()).toHaveLength(3));

		search(' PUMP ');
		expect(noteTitles()).toEqual(['Pump check']);
		search('fan');
		expect(noteTitles()).toEqual(['Note 2']);
		search('bob');
		expect(noteTitles()).toEqual(['Note 3']);
		search(formatDateTime(note(2, 6, 9).created_at).toLowerCase());
		expect(noteTitles()).toEqual(['Note 2']);

		search('nothing like this');
		expect(noteTitles()).toEqual([]);
		expect(text()).toContain(m.display_note_no_search_results());
	});

	it('shows and finds a note by CropWatch staff as CropWatch support', async () => {
		// For customers the API sends no author for a staff note, only the flag.
		getNotes().mockResolvedValue({
			data: [note(1, 5, 9), note(2, 6, 9, { created_by: null, created_by_staff: true })]
		});
		render();
		open();
		await vi.waitFor(() => expect(noteTitles()).toHaveLength(2));

		const staffMeta = document.querySelectorAll('.notes-review-dialog__note-meta')[1];
		expect(staffMeta.textContent).toBe(
			`${formatDateTime(note(2, 6, 9).created_at, { hour: 'numeric', minute: '2-digit' })} - ${m.common_staff_author()}`
		);
		expect(text()).not.toContain('cropwatch.io');

		search(m.common_staff_author().toLowerCase());
		expect(noteTitles()).toEqual(['Note 2']);
	});

	it('can show every date of the month, including the ones without notes', async () => {
		getNotes().mockResolvedValue({ items: [note(1, 5, 9)] });
		render();
		open();
		await vi.waitFor(() => expect(dayKeys()).toEqual(['2026-10-05']));

		(document.getElementById('device-notes-review-show-notes-switch') as HTMLInputElement).click();
		flushSync();

		expect(dayKeys()).toHaveLength(31);
		expect(dayKeys()[0]).toBe('2026-10-01');
		expect(text()).toContain(m.display_note_no_notes_for_date());
	});

	it('shows that it is loading, then that the month has no notes', async () => {
		let release!: (value: unknown) => void;
		getNotes().mockReturnValue(new Promise((resolve) => (release = resolve)) as never);
		render();
		open();

		expect(text()).toContain(m.display_note_loading());
		release({ result: { items: [] } });

		await vi.waitFor(() => expect(text()).toContain(m.display_note_no_notes_for_month()));
		expect(text()).not.toContain(m.display_note_loading());
	});

	it('says so when the notes cannot be loaded', async () => {
		const failure = new Error('down');
		getNotes().mockRejectedValue(failure);
		render();
		open();

		await vi.waitFor(() =>
			expect(document.querySelector('.notes-review-dialog__error')?.textContent).toBe(
				m.display_note_load_failed()
			)
		);
		expect(console.error).toHaveBeenCalledWith('Error loading notes:', failure);
	});

	it('loads every month of a picked range', async () => {
		getNotes().mockImplementation(async ({ date }) => ({
			data:
				date.getMonth() === 7
					? [note(1, 5, 9, { created_at: new Date(2026, 7, 5).toISOString() })]
					: []
		}));
		render();
		open();
		await vi.waitFor(() => expect(getNotes()).toHaveBeenCalledTimes(1));

		(document.querySelector('.cw-date-picker__trigger') as HTMLButtonElement).click();
		flushSync();
		const months = document.querySelectorAll<HTMLButtonElement>('.cw-date-picker__month-cell');
		months[7].click(); // August…
		flushSync();
		months[9].click(); // …to October
		flushSync();
		document.querySelectorAll<HTMLButtonElement>('.cw-date-picker__time-actions button')[1].click();
		flushSync();

		await vi.waitFor(() => expect(getNotes()).toHaveBeenCalledTimes(4));
		expect(
			getNotes()
				.mock.calls.slice(1)
				.map(([{ date }]) => date)
		).toEqual([new Date(2026, 7, 1), new Date(2026, 8, 1), new Date(2026, 9, 1)]);
		await vi.waitFor(() => expect(dayKeys()).toEqual(['2026-08-05']));
	});

	it('ignores an older load that finishes after a newer one', async () => {
		const pending: Array<{ resolve: (value: unknown) => void; reject: (error: unknown) => void }> =
			[];
		getNotes().mockImplementation(
			() => new Promise((resolve, reject) => pending.push({ resolve, reject })) as never
		);
		render();
		open();
		byId('device-notes-review-close-button')?.click();
		open();
		open();
		expect(pending).toHaveLength(3);

		pending[2].resolve([note(2, 6, 9, { title: 'Newest' })]);
		await vi.waitFor(() => expect(noteTitles()).toEqual(['Newest']));
		pending[0].resolve([note(1, 5, 9, { title: 'Stale' })]);
		pending[1].reject(new Error('late failure'));
		await new Promise((resolve) => setTimeout(resolve, 20));
		flushSync();

		expect(noteTitles()).toEqual(['Newest']);
		expect(document.querySelector('.notes-review-dialog__error')).toBeNull();
		expect(text()).not.toContain(m.display_note_loading());
	});

	it('loads nothing without a session or a device', () => {
		render({}, null);
		open();
		expect(text()).toContain(m.display_note_no_notes_for_month());
		view?.unmount();

		render({ devEui: '' });
		open();
		expect(getNotes()).not.toHaveBeenCalled();
	});

	it('closes, and can be disabled', () => {
		getNotes().mockResolvedValue(null);
		render();
		open();
		expect(dialogOpen()).toBe(true);

		byId('device-notes-review-close-button')?.click();
		flushSync();
		expect(dialogOpen()).toBe(false);
		view?.unmount();

		render({ disabled: true });
		expect(byId('device-notes-review-open-button')?.disabled).toBe(true);
	});
});
