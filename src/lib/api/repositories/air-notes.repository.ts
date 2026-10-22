import type { HttpClient } from '../http/http-client';
import { replacePathParams } from '../http/url';

export interface CreateAirNoteRequest {
	note: string;
	title: string;
	include_in_report: boolean;
	created_at: string;
	dev_eui: string;
}

export interface UpdateAirNoteRequest {
	note?: string;
	title?: string;
	include_in_report?: boolean;
}

/** Notes attached to an air sensor's readings (shown on charts and in reports). */
export interface AirNoteRepository {
	createAirNote(payload: CreateAirNoteRequest): Promise<Record<string, unknown> | null>;
	updateAirNote(
		noteId: number,
		payload: UpdateAirNoteRequest
	): Promise<Record<string, unknown> | null>;
	deleteAirNote(noteId: number): Promise<Record<string, unknown> | null>;
	/** The notes in `date`'s month (local calendar). */
	getAllAirNotesForMonth(payload: {
		dev_eui: string;
		date: Date;
	}): Promise<Record<string, unknown> | null>;
}

export class HttpAirNoteRepository implements AirNoteRepository {
	readonly #http: HttpClient;
	readonly #notesEndpoint: string;
	readonly #noteByIdEndpoint: string;
	readonly #notesForMonthEndpoint: string;

	public constructor(http: HttpClient, endpoints: { airNotes: string; airNotesForMonth: string }) {
		this.#http = http;
		this.#notesEndpoint = endpoints.airNotes;
		this.#noteByIdEndpoint = `${endpoints.airNotes}/{note_id}`;
		this.#notesForMonthEndpoint = endpoints.airNotesForMonth;
	}

	public createAirNote(payload: CreateAirNoteRequest): Promise<Record<string, unknown> | null> {
		return this.#http.request<Record<string, unknown> | null>(this.#notesEndpoint, {
			method: 'POST',
			body: payload
		});
	}

	public updateAirNote(
		noteId: number,
		payload: UpdateAirNoteRequest
	): Promise<Record<string, unknown> | null> {
		return this.#http.request<Record<string, unknown> | null>(
			replacePathParams(this.#noteByIdEndpoint, { note_id: noteId }),
			{ method: 'PATCH', body: payload }
		);
	}

	public deleteAirNote(noteId: number): Promise<Record<string, unknown> | null> {
		return this.#http.request<Record<string, unknown> | null>(
			replacePathParams(this.#noteByIdEndpoint, { note_id: noteId }),
			{ method: 'DELETE' }
		);
	}

	public getAllAirNotesForMonth(payload: {
		dev_eui: string;
		date: Date;
	}): Promise<Record<string, unknown> | null> {
		const requestUrl = replacePathParams(this.#notesForMonthEndpoint, {
			dev_eui: payload.dev_eui,
			month: String(payload.date.getMonth() + 1).padStart(2, '0'),
			year: String(payload.date.getFullYear())
		});
		return this.#http.request<Record<string, unknown> | null>(requestUrl, { method: 'GET' });
	}
}
