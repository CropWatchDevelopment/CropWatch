import { flushSync } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { formatDateTime } from '$lib/i18n/format';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import type { AirRow } from '../interfaces/AirRow.interface';
import type { Note } from '../interfaces/note.interface';
import NotesViewDialog from './notes-view-dialog.svelte';

function note(overrides: Partial<Note> = {}): Note {
	return {
		id: 'note-1',
		created_at: '2026-10-21T03:05:00.000Z',
		created_by: 'Kevin',
		title: 'Irrigation',
		note: 'Watered the beds\nfor ten minutes',
		includeInReport: true,
		...overrides
	};
}

function airRow(notes: Note[] | null): AirRow {
	return {
		id: 'row-1',
		created_at: '2026-10-21T03:00:00.000Z',
		temperature_c: 21.5,
		humidity: 55,
		co2: 0,
		dev_eui: 'AIR-001',
		alerts: [],
		cw_air_annotations: notes
	};
}

let view: ReturnType<typeof renderWithServices> | null = null;

function render(notes: Note[] | null) {
	view = renderWithServices(NotesViewDialog, { props: { row: airRow(notes) } });
	return view;
}

const dialog = () => document.querySelector('dialog') as HTMLDialogElement;
const articles = () => [...document.querySelectorAll('article')];

function openDialog() {
	const openButton = [...document.querySelectorAll('button')].find((button) =>
		button.querySelector(`[aria-label="${m.display_view_notes()}"]`)
	);
	openButton!.click();
	flushSync();
}

afterEach(() => {
	view?.unmount();
	view = null;
	document.body.innerHTML = '';
});

describe('NotesViewDialog', () => {
	it("lists the reading's notes with their author, time and report status", () => {
		render([
			note(),
			note({
				id: 'note-2',
				title: '   ',
				created_by: '  ',
				note: 'No title',
				includeInReport: false
			})
		]);
		expect(dialog().open).toBe(false);

		openDialog();

		expect(dialog().open).toBe(true);
		expect(dialog().textContent).toContain(
			m.display_view_notes_title({ createdAt: formatDateTime('2026-10-21T03:00:00.000Z') })
		);
		const [first, second] = articles();
		expect(first.querySelector('h3')?.textContent?.trim()).toBe('Irrigation');
		expect(first.textContent).toContain(`${formatDateTime('2026-10-21T03:05:00.000Z')} - Kevin`);
		expect(first.textContent).toContain(m.display_note_report_included());
		expect(first.querySelector('.notes-view-dialog__body')?.textContent).toBe(
			'Watered the beds\nfor ten minutes'
		);
		// A blank title reads "untitled"; a blank author leaves just the time.
		expect(second.querySelector('h3')?.textContent?.trim()).toBe(m.display_note_untitled());
		expect(second.querySelector('.notes-view-dialog__meta')?.textContent).toBe(
			formatDateTime('2026-10-21T03:05:00.000Z')
		);
		expect(second.textContent).toContain(m.display_note_report_excluded());
	});

	it('names a note by CropWatch staff as CropWatch support', () => {
		render([note({ created_by: '', createdByStaff: true })]);
		openDialog();

		expect(articles()[0].querySelector('.notes-view-dialog__meta')?.textContent).toBe(
			`${formatDateTime('2026-10-21T03:05:00.000Z')} - ${m.common_staff_author()}`
		);
	});

	it('shows no notes for a reading without any', () => {
		render(null);
		openDialog();

		expect(dialog().open).toBe(true);
		expect(articles()).toHaveLength(0);
	});

	it('closes from its close button and from the dialog header', async () => {
		render([note()]);
		openDialog();
		// The native dialog reports its close in a later task; a user cannot reopen it sooner.
		const closed = new Promise((done) => dialog().addEventListener('close', done, { once: true }));

		const closeButton = [...dialog().querySelectorAll('button')].find((button) =>
			button.textContent?.includes(m.action_close())
		);
		closeButton!.click();
		flushSync();
		expect(dialog().open).toBe(false);
		await closed;

		openDialog();
		expect(dialog().open).toBe(true);
		(dialog().querySelector('.cw-dialog__close') as HTMLButtonElement).click();
		flushSync();
		expect(dialog().open).toBe(false);
	});
});
