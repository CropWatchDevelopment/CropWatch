import { describe, expect, it } from 'vitest';
import { overlayStagedNotes, type StagedOp } from './staged-notes';
import type { Note } from '$lib/components/displays/AirDisplay/interfaces/note.interface';

const ROW_AT = '2026-07-15T03:10:00.000+09:00';

const serverNote: Note = {
	id: '11',
	created_at: ROW_AT,
	created_by: 'someone@example.com',
	title: 'Original',
	note: 'original body',
	includeInReport: true
};

function ops(...entries: StagedOp[]): Map<string, StagedOp> {
	return new Map(entries.map((op) => [op.key, op]));
}

describe('overlayStagedNotes', () => {
	it('passes server notes through untouched with no staged ops', () => {
		expect(overlayStagedNotes(ROW_AT, [serverNote], new Map())).toEqual([serverNote]);
	});

	it('overlays a staged update onto its server note', () => {
		const [note] = overlayStagedNotes(
			ROW_AT,
			[serverNote],
			ops({
				kind: 'update',
				key: 'note:11',
				rowCreatedAt: ROW_AT,
				noteId: 11,
				title: 'Edited',
				note: 'edited body',
				includeInReport: false
			})
		);
		expect(note).toMatchObject({
			id: '11',
			title: 'Edited',
			note: 'edited body',
			includeInReport: false,
			staged: 'update'
		});
	});

	it('marks a staged delete without removing the note from the list', () => {
		const [note] = overlayStagedNotes(
			ROW_AT,
			[serverNote],
			ops({
				kind: 'delete',
				key: 'note:11',
				rowCreatedAt: ROW_AT,
				noteId: 11,
				title: serverNote.title,
				note: serverNote.note,
				includeInReport: serverNote.includeInReport
			})
		);
		expect(note.staged).toBe('delete');
		expect(note.title).toBe('Original');
	});

	it('appends a staged create as a synthetic note', () => {
		const notes = overlayStagedNotes(
			ROW_AT,
			[serverNote],
			ops({
				kind: 'create',
				key: `new:${ROW_AT}`,
				rowCreatedAt: ROW_AT,
				title: 'New note',
				note: 'new body',
				includeInReport: true
			})
		);
		expect(notes).toHaveLength(2);
		expect(notes[1]).toMatchObject({ title: 'New note', staged: 'create' });
	});

	it('ignores ops staged for other rows', () => {
		const notes = overlayStagedNotes(
			ROW_AT,
			[serverNote],
			ops({
				kind: 'create',
				key: 'new:2026-07-16T03:10:00.000+09:00',
				rowCreatedAt: '2026-07-16T03:10:00.000+09:00',
				title: 'Elsewhere',
				note: 'other row',
				includeInReport: true
			})
		);
		expect(notes).toEqual([serverNote]);
	});
});
