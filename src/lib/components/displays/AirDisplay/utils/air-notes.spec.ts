import { describe, expect, it } from 'vitest';
import { parseAirNotesResponse } from './air-notes';

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
			title: '',
			note: 'Vent opened',
			includeInReport: false
		});
		expect(fromIndex).toEqual({
			id: 'note-1',
			created_at: '',
			created_by: '',
			title: '',
			note: '   ',
			includeInReport: false
		});
		expect(empty).toEqual({
			id: 'note-2',
			created_at: '',
			created_by: '',
			title: '',
			note: '',
			includeInReport: false
		});
	});
});
