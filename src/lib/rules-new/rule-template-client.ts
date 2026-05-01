import type {
	RuleTemplateDto,
	RuleTemplateListQuery,
	RuleTemplateSaveRequest
} from './rule-template.types';

type FetchLike = typeof fetch;

export class RuleTemplateApiError extends Error {
	public readonly status: number;
	public readonly payload: unknown;

	public constructor(status: number, payload: unknown) {
		super(`Rule template API request failed (${status})`);
		this.name = 'RuleTemplateApiError';
		this.status = status;
		this.payload = payload;
	}
}

export async function listRuleTemplates(
	query: RuleTemplateListQuery = {},
	options: { fetchFn?: FetchLike; signal?: AbortSignal } = {}
): Promise<RuleTemplateDto[]> {
	const search = query.search?.trim();
	const params = new URLSearchParams();
	if (search) params.set('search', search);

	const suffix = params.toString();
	return requestJson<RuleTemplateDto[]>(`/api/rules-new${suffix ? `?${suffix}` : ''}`, {
		fetchFn: options.fetchFn,
		signal: options.signal
	});
}

export function getRuleTemplate(
	id: number,
	options: { fetchFn?: FetchLike; signal?: AbortSignal } = {}
): Promise<RuleTemplateDto> {
	return requestJson<RuleTemplateDto>(`/api/rules-new/${encodeURIComponent(String(id))}`, {
		fetchFn: options.fetchFn,
		signal: options.signal
	});
}

export function createRuleTemplate(
	payload: RuleTemplateSaveRequest,
	options: { fetchFn?: FetchLike; signal?: AbortSignal } = {}
): Promise<RuleTemplateDto> {
	return requestJson<RuleTemplateDto>('/api/rules-new', {
		method: 'POST',
		body: payload,
		fetchFn: options.fetchFn,
		signal: options.signal
	});
}

export function updateRuleTemplate(
	id: number,
	payload: RuleTemplateSaveRequest,
	options: { fetchFn?: FetchLike; signal?: AbortSignal } = {}
): Promise<RuleTemplateDto> {
	return requestJson<RuleTemplateDto>(`/api/rules-new/${encodeURIComponent(String(id))}`, {
		method: 'PATCH',
		body: payload,
		fetchFn: options.fetchFn,
		signal: options.signal
	});
}

export function deleteRuleTemplate(
	id: number,
	options: { fetchFn?: FetchLike; signal?: AbortSignal } = {}
): Promise<{ id: number }> {
	return requestJson<{ id: number }>(`/api/rules-new/${encodeURIComponent(String(id))}`, {
		method: 'DELETE',
		fetchFn: options.fetchFn,
		signal: options.signal
	});
}

export function readRuleTemplateApiError(error: unknown, fallback: string): string {
	if (error instanceof RuleTemplateApiError) {
		return readMessage(error.payload) ?? fallback;
	}

	if (error instanceof Error) {
		const message = error.message.trim();
		return message.length > 0 ? message : fallback;
	}

	return fallback;
}

async function requestJson<T>(
	path: string,
	options: {
		method?: string;
		body?: unknown;
		fetchFn?: FetchLike;
		signal?: AbortSignal;
	} = {}
): Promise<T> {
	const fetchFn = options.fetchFn ?? fetch;
	const headers = new Headers();
	headers.set('Accept', 'application/json');

	let body: string | undefined;
	if (options.body !== undefined) {
		headers.set('Content-Type', 'application/json');
		body = JSON.stringify(options.body);
	}

	const response = await fetchFn(path, {
		method: options.method ?? 'GET',
		headers,
		body,
		signal: options.signal,
		credentials: 'same-origin'
	});
	const payload = await parsePayload(response);

	if (!response.ok) {
		throw new RuleTemplateApiError(response.status, payload);
	}

	return payload as T;
}

async function parsePayload(response: Response): Promise<unknown> {
	const text = await response.text();
	if (!text) return null;

	try {
		return JSON.parse(text);
	} catch {
		return text;
	}
}

function readMessage(value: unknown): string | null {
	if (typeof value === 'string') {
		const trimmed = value.trim();
		return trimmed.length > 0 ? trimmed : null;
	}

	if (Array.isArray(value)) {
		for (const item of value) {
			const message = readMessage(item);
			if (message) return message;
		}
		return null;
	}

	if (!isRecord(value)) {
		return null;
	}

	return readMessage(value.message) ?? readMessage(value.error) ?? readMessage(value.payload);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}
