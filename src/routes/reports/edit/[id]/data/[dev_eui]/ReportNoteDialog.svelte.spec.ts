import { flushSync } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatDateTime } from '$lib/i18n/format';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import ReportNoteDialog from './ReportNoteDialog.svelte';
import type { DisplayNote, StagedOp } from './staged-notes';

const ROW_AT = '2026-07-15T03:10:00.000+09:00';

function note(overrides: Partial<DisplayNote> = {}): DisplayNote {
	return {
		id: '11',
		created_at: ROW_AT,
		created_by: 'someone@example.com',
		title: 'Door open',
		note: 'Left open overnight',
		includeInReport: true,
		...overrides
	};
}

let view: ReturnType<typeof renderWithServices> | null = null;

function render(notes: DisplayNote[] = []) {
	const onStage = vi.fn<(op: StagedOp) => void>();
	const onUnstage = vi.fn<(key: string) => void>();
	view = renderWithServices(ReportNoteDialog, {
		props: { rowCreatedAt: ROW_AT, notes, onStage, onUnstage }
	});
	return { onStage, onUnstage };
}

const dialog = () => view!.target.querySelector('dialog') as HTMLDialogElement;
const items = () => [...dialog().querySelectorAll<HTMLLIElement>('.report-note-dialog__item')];
const buttonIn = (root: ParentNode, label: string) =>
	[...root.querySelectorAll<HTMLButtonElement>('button')].find(
		(button) => button.textContent?.trim() === label
	) ?? null;
const action = (label: string) => buttonIn(dialog(), label);
const titleInput = () => dialog().querySelector<HTMLInputElement>('input:not([type="checkbox"])');
const bodyInput = () => dialog().querySelector<HTMLTextAreaElement>('textarea');
const includeSwitch = () => dialog().querySelector<HTMLInputElement>('input[type="checkbox"]');
const count = () => dialog().querySelector('.report-note-dialog__count')?.textContent;

function click(element: Element | null | undefined) {
	(element as HTMLElement).click();
	flushSync();
}

function type(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
	input.value = value;
	input.dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

const openDialog = () => click(view!.target.querySelector('.cw-button--info'));

afterEach(() => {
	view?.unmount();
	view = null;
});

describe('ReportNoteDialog — the list', () => {
	it('opens from its button, titled with the time of the data point', () => {
		render();
		const opener = view!.target.querySelector('.cw-button--info')!;
		expect(opener.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe(
			m.reports_new_edit_data_notes_column()
		);
		expect(dialog().open).toBe(false);

		openDialog();

		expect(dialog().open).toBe(true);
		expect(dialog().querySelector('.cw-dialog__title')?.textContent).toBe(
			m.reports_new_edit_data_notes_dialog_title({ createdAt: formatDateTime(ROW_AT) })
		);
	});

	it('says when the data point has no notes', () => {
		render();
		openDialog();

		expect(dialog().textContent).toContain(m.reports_new_edit_data_no_notes());
		expect(items()).toHaveLength(0);
		expect(action(m.reports_new_edit_data_note_add())).not.toBeNull();
	});

	it('lists the notes, marking staged changes', () => {
		render([
			note({ id: '11' }),
			note({ id: '12', title: '', note: 'No title' }),
			note({ id: '13', title: 'Edited', staged: 'update', stagedKey: 'note:13' }),
			note({ id: '14', title: 'Going away', staged: 'delete', stagedKey: 'note:14' })
		]);
		openDialog();

		expect(dialog().textContent).not.toContain(m.reports_new_edit_data_no_notes());
		const title = (item: HTMLElement) =>
			item.querySelector('.report-note-dialog__title')?.firstChild?.textContent?.trim();
		const badge = (item: HTMLElement) =>
			item.querySelector('.report-note-dialog__title .cw-chip')?.textContent?.trim() ?? null;
		expect(items().map(title)).toEqual([
			'Door open',
			// An untitled note is labelled as a note.
			m.reports_new_edit_data_notes_column(),
			'Edited',
			'Going away'
		]);
		expect(items().map(badge)).toEqual([
			null,
			null,
			m.reports_new_edit_data_staged_badge(),
			m.reports_new_edit_data_staged_badge()
		]);
		expect(items()[1].querySelector('.report-note-dialog__body')?.textContent).toBe('No title');
		expect(
			items().map((item) => item.classList.contains('report-note-dialog__item--deleted'))
		).toEqual([false, false, false, true]);
		// A note staged for deletion can only be restored.
		expect(buttonIn(items()[3], m.reports_new_edit_data_note_restore())).not.toBeNull();
		expect(buttonIn(items()[3], m.reports_new_edit_data_note_edit())).toBeNull();
		expect(buttonIn(items()[0], m.reports_new_edit_data_note_edit())).not.toBeNull();
		expect(buttonIn(items()[0], m.reports_new_edit_data_note_delete())).not.toBeNull();
	});

	it('offers no second new note while one is staged', () => {
		render([note({ id: 'new:x', staged: 'create', stagedKey: `new:${ROW_AT}` })]);
		openDialog();

		expect(action(m.reports_new_edit_data_note_add())).toBeNull();
		expect(action(m.action_close())).not.toBeNull();
	});

	it('stages the deletion of a saved note', () => {
		const { onStage, onUnstage } = render([note({ id: '11', includeInReport: false })]);
		openDialog();

		click(buttonIn(items()[0], m.reports_new_edit_data_note_delete()));

		expect(onStage).toHaveBeenCalledWith({
			kind: 'delete',
			key: 'note:11',
			rowCreatedAt: ROW_AT,
			noteId: 11,
			title: 'Door open',
			note: 'Left open overnight',
			includeInReport: false
		});
		expect(onUnstage).not.toHaveBeenCalled();
	});

	it.each([
		['its staged key', `new:${ROW_AT}`, `new:${ROW_AT}`],
		['the key of the data point when it has none', undefined, `new:${ROW_AT}`]
	])('drops a staged new note when it is deleted, by %s', (_label, stagedKey, key) => {
		const { onStage, onUnstage } = render([note({ id: 'x', staged: 'create', stagedKey })]);
		openDialog();

		click(buttonIn(items()[0], m.reports_new_edit_data_note_delete()));

		expect(onUnstage).toHaveBeenCalledWith(key);
		expect(onStage).not.toHaveBeenCalled();
	});

	it.each([
		['its staged key', 'note:14', 'note:14'],
		['its note id when it has no staged key', undefined, 'note:14']
	])('restores a note staged for deletion by %s', (_label, stagedKey, key) => {
		const { onUnstage } = render([note({ id: '14', staged: 'delete', stagedKey })]);
		openDialog();

		click(buttonIn(items()[0], m.reports_new_edit_data_note_restore()));

		expect(onUnstage).toHaveBeenCalledWith(key);
	});

	it('closes from its close button', () => {
		render();
		openDialog();

		click(action(m.action_close()));

		expect(dialog().open).toBe(false);
	});
});

describe('ReportNoteDialog — the editor', () => {
	it('stages a new note, trimmed', () => {
		const { onStage } = render();
		openDialog();

		click(action(m.reports_new_edit_data_note_add()));

		expect(dialog().textContent).toContain(m.display_note_title_label());
		expect(dialog().textContent).toContain(m.display_note_body_label());
		expect(dialog().textContent).toContain(m.display_include_in_report());
		expect(titleInput()?.value).toBe('');
		expect(titleInput()?.maxLength).toBe(500);
		expect(bodyInput()?.maxLength).toBe(500);
		expect(count()).toBe('0/500');
		expect(includeSwitch()?.checked).toBe(true);
		expect(action(m.reports_new_edit_data_note_stage())?.disabled).toBe(true);

		type(titleInput()!, '  Door open ');
		type(bodyInput()!, '   ');
		expect(action(m.reports_new_edit_data_note_stage())?.disabled).toBe(true);
		type(bodyInput()!, ' Left open overnight ');
		expect(count()).toBe('21/500');
		click(includeSwitch());
		click(action(m.reports_new_edit_data_note_stage()));

		expect(onStage).toHaveBeenCalledWith({
			kind: 'create',
			key: `new:${ROW_AT}`,
			rowCreatedAt: ROW_AT,
			title: 'Door open',
			note: 'Left open overnight',
			includeInReport: false
		});
		// Back to the list.
		expect(bodyInput()).toBeNull();
		expect(dialog().open).toBe(true);
	});

	it('stages an edit of a saved note', () => {
		const { onStage } = render([note({ id: '11', includeInReport: true })]);
		openDialog();

		click(buttonIn(items()[0], m.reports_new_edit_data_note_edit()));

		expect(titleInput()?.value).toBe('Door open');
		expect(bodyInput()?.value).toBe('Left open overnight');
		expect(includeSwitch()?.checked).toBe(true);

		type(bodyInput()!, 'Closed at 7:00');
		click(includeSwitch());
		click(action(m.reports_new_edit_data_note_stage()));

		expect(onStage).toHaveBeenCalledWith({
			kind: 'update',
			key: 'note:11',
			rowCreatedAt: ROW_AT,
			noteId: 11,
			title: 'Door open',
			note: 'Closed at 7:00',
			includeInReport: false
		});
	});

	it.each([
		['under its staged key', 'new:custom', 'new:custom'],
		['under the key of the data point when it has none', undefined, `new:${ROW_AT}`]
	])('re-stages an edited new note %s', (_label, stagedKey, key) => {
		const { onStage } = render([
			note({ id: 'new:x', staged: 'create', stagedKey, title: 'Draft', note: 'First' })
		]);
		openDialog();

		click(buttonIn(items()[0], m.reports_new_edit_data_note_edit()));
		type(bodyInput()!, 'Second');
		click(action(m.reports_new_edit_data_note_stage()));

		expect(onStage).toHaveBeenCalledWith({
			kind: 'create',
			key,
			rowCreatedAt: ROW_AT,
			title: 'Draft',
			note: 'Second',
			includeInReport: true
		});
	});

	it('goes back to the list without staging on cancel', () => {
		const { onStage } = render([note()]);
		openDialog();
		click(buttonIn(items()[0], m.reports_new_edit_data_note_edit()));

		click(action(m.action_cancel()));

		expect(bodyInput()).toBeNull();
		expect(items()).toHaveLength(1);
		expect(onStage).not.toHaveBeenCalled();
	});

	it('starts a new note from a blank editor after editing another', () => {
		render([note()]);
		openDialog();
		click(buttonIn(items()[0], m.reports_new_edit_data_note_edit()));
		click(action(m.action_cancel()));

		click(action(m.reports_new_edit_data_note_add()));

		expect(titleInput()?.value).toBe('');
		expect(bodyInput()?.value).toBe('');
		expect(includeSwitch()?.checked).toBe(true);
	});

	it('discards the editor when the dialog is closed with ×, and reopens on the list', () => {
		const { onStage } = render([note()]);
		openDialog();
		click(buttonIn(items()[0], m.reports_new_edit_data_note_edit()));

		click(dialog().querySelector('.cw-dialog__close'));

		expect(dialog().open).toBe(false);
		openDialog();
		expect(bodyInput()).toBeNull();
		expect(items()).toHaveLength(1);
		expect(onStage).not.toHaveBeenCalled();
	});

	it('keeps Space and Enter inside the note body, away from the table row', () => {
		render();
		openDialog();
		click(action(m.reports_new_edit_data_note_add()));
		// Svelte handles keydown at the root it is mounted in, so whatever the
		// editor stops never gets further up the page.
		const reachedRow: string[] = [];
		const listener = (event: KeyboardEvent) => reachedRow.push(event.key);
		document.addEventListener('keydown', listener);

		for (const key of [' ', 'Enter', 'a']) {
			bodyInput()!.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
		}
		document.removeEventListener('keydown', listener);

		expect(reachedRow).toEqual(['a']);
	});
});
