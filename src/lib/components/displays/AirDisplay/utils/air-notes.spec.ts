import { describe, expect, it } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import { noteAuthor, parseAirNotesResponse } from './air-notes';

/** An API note without its report flag. */
const BASE = {
	id: 42,
	created_at: '2026-10-21T03:00:00.000Z',
	created_by: 'Kevin',
	title: 'Irrigation',
	note: 'Watered the beds'
};
const RAW_NOTE = { ...BASE, include_in_report: true };

const NOTE = {
	id: '42',
	created_at: '2026-10-21T03:00:00.000Z',
	created_by: 'Kevin',
	createdByStaff: false,
	title: 'Irrigation',
	note: 'Watered the beds',
	includeInReport: true
};

describe('parseAirNotesResponse', () => {
	it('maps a plain list of API notes', () => {
		expect(parseAirNotesResponse([RAW_NOTE])).toEqual([NOTE]);
	});

	it('finds the list inside every envelope the API has used', () => {
		const envelopes = [
			{ data: [RAW_NOTE] },
			{ result: [RAW_NOTE] },
			{ items: [RAW_NOTE] },
			{ data: { data: [RAW_NOTE] } },
			{ data: { items: [RAW_NOTE] } },
			{ result: { data: [RAW_NOTE] } },
			{ result: { items: [RAW_NOTE] } }
		];

		for (const envelope of envelopes) {
			expect(parseAirNotesResponse(envelope)).toEqual([NOTE]);
		}
	});

	it('prefers the outermost list', () => {
		expect(parseAirNotesResponse({ data: [RAW_NOTE], items: [{ ...RAW_NOTE, id: 7 }] })).toEqual([
			NOTE
		]);
	});

	it('returns no notes when there is no list', () => {
		for (const payload of [null, undefined, {}, { data: {} }, { data: 'none' }, 'notes', 3]) {
			expect(parseAirNotesResponse(payload)).toEqual([]);
		}
	});

	it('reads the report flag from either spelling, as a boolean or a string', () => {
		const flags = [
			{ include_in_report: true },
			{ include_in_report: 'true' },
			{ includeInReport: true },
			{ includeInReport: 'true' },
			{ include_in_report: false },
			{ include_in_report: 'yes' },
			{ includeInReport: 'false' },
			{}
		];

		expect(
			parseAirNotesResponse(flags.map((flag) => ({ ...BASE, ...flag }))).map(
				(note) => note.includeInReport
			)
		).toEqual([true, true, true, true, false, false, false, false]);
	});

	it('marks a note CropWatch staff wrote (the API leaves its author empty for customers)', () => {
		const [staffNote, staffAuthorShown] = parseAirNotesResponse([
			{ ...RAW_NOTE, created_by: null, created_by_staff: true },
			{ ...RAW_NOTE, created_by: 'kevin@cropwatch.io', created_by_staff: true }
		]);

		expect(staffNote).toEqual({ ...NOTE, created_by: '', createdByStaff: true });
		expect(staffAuthorShown).toEqual({
			...NOTE,
			created_by: 'kevin@cropwatch.io',
			createdByStaff: true
		});
	});

	it('fills in missing or malformed fields', () => {
		const [fromText, fromIndex, empty] = parseAirNotesResponse([
			{ created_at: '2026-10-21T03:00:00.000Z', note: 'Vent opened' },
			{ created_at: 5, note: '   ', title: 9, created_by: null },
			null
		]);

		// Without an id, one is made from the reading time and the note (or its position).
		expect(fromText).toEqual({
			id: '2026-10-21T03:00:00.000Z-Vent opened',
			created_at: '2026-10-21T03:00:00.000Z',
			created_by: '',
			createdByStaff: false,
			title: '',
			note: 'Vent opened',
			includeInReport: false
		});
		expect(fromIndex).toEqual({
			id: 'note-1',
			created_at: '',
			created_by: '',
			createdByStaff: false,
			title: '',
			note: '   ',
			includeInReport: false
		});
		expect(empty).toEqual({
			id: 'note-2',
			created_at: '',
			created_by: '',
			createdByStaff: false,
			title: '',
			note: '',
			includeInReport: false
		});
	});
});

describe('noteAuthor', () => {
	it('names the author the API sent', () => {
		expect(noteAuthor({ ...NOTE, created_by: '  Kevin  ' })).toBe('Kevin');
	});

	it('calls an unnamed staff author CropWatch support', () => {
		expect(noteAuthor({ ...NOTE, created_by: '', createdByStaff: true })).toBe(
			m.common_staff_author()
		);
	});

	it('is empty without an author', () => {
		expect(noteAuthor({ ...NOTE, created_by: ' ', createdByStaff: false })).toBe('');
		expect(noteAuthor({ ...NOTE, created_by: '', createdByStaff: undefined })).toBe('');
	});
});
