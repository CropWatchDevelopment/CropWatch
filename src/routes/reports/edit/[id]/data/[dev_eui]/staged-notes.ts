import type { Note } from '$lib/components/displays/AirDisplay/interfaces/note.interface';

/**
 * A note change staged on the report-data edit page. Nothing is written until
 * the user saves; then every op is applied through the API and a report
 * regeneration is queued.
 *
 * Keys: `note:<noteId>` for update/delete of a server note, `new:<rowCreatedAt>`
 * for a create (one staged create per data point).
 */
export interface StagedOp {
	kind: 'create' | 'update' | 'delete';
	key: string;
	rowCreatedAt: string;
	noteId?: number;
	title: string;
	note: string;
	includeInReport: boolean;
}

/** A server note (or staged create) with any staged op overlaid for display. */
export interface DisplayNote extends Note {
	staged?: StagedOp['kind'];
	stagedKey?: string;
}

/**
 * Overlays staged ops onto a row's server notes: updates replace the note's
 * fields, deletes mark it struck-through, creates append a synthetic note.
 */
export function overlayStagedNotes(
	rowCreatedAt: string,
	serverNotes: Note[],
	ops: ReadonlyMap<string, StagedOp>
): DisplayNote[] {
	const result: DisplayNote[] = serverNotes.map((note) => {
		const op = ops.get(`note:${note.id}`);
		if (!op) return { ...note };
		if (op.kind === 'delete') {
			return { ...note, staged: 'delete', stagedKey: op.key };
		}
		return {
			...note,
			title: op.title,
			note: op.note,
			includeInReport: op.includeInReport,
			staged: 'update',
			stagedKey: op.key
		};
	});

	const create = ops.get(`new:${rowCreatedAt}`);
	if (create) {
		result.push({
			id: create.key,
			created_at: rowCreatedAt,
			created_by: '',
			title: create.title,
			note: create.note,
			includeInReport: create.includeInReport,
			staged: 'create',
			stagedKey: create.key
		});
	}

	return result;
}
