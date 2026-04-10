import type { Note } from '../interfaces/note.interface';

type NotesEnvelope = {
	data?: unknown;
	items?: unknown;
	result?: unknown;
};

type RawAirNote = {
	id?: string | number;
	created_at?: string;
	created_by?: string;
	title?: string;
	note?: string;
	include_in_report?: boolean | string;
	includeInReport?: boolean | string;
};

export function parseAirNotesResponse(payload: unknown): Note[] {
	const envelope = (payload ?? {}) as NotesEnvelope;
	const data = envelope.data as NotesEnvelope | undefined;
	const result = envelope.result as NotesEnvelope | undefined;
	const items =
		[
			payload,
			envelope.data,
			envelope.result,
			envelope.items,
			data?.data,
			data?.items,
			result?.data,
			result?.items
		].find(Array.isArray) ?? [];

	return (items as unknown[]).map((item, index) => {
		const note = (item ?? {}) as RawAirNote;
		const fallbackId = `${typeof note.created_at === 'string' ? note.created_at : 'note'}-${
			typeof note.note === 'string' && note.note.trim().length > 0 ? note.note : index
		}`;

		return {
			id: String(note.id ?? fallbackId),
			created_at: typeof note.created_at === 'string' ? note.created_at : '',
			created_by: typeof note.created_by === 'string' ? note.created_by : '',
			title: typeof note.title === 'string' ? note.title : '',
			note: typeof note.note === 'string' ? note.note : '',
			includeInReport:
				note.include_in_report === true ||
				note.include_in_report === 'true' ||
				note.includeInReport === true ||
				note.includeInReport === 'true'
		};
	});
}
