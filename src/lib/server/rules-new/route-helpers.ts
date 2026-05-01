import { m } from '$lib/paraglide/messages.js';
import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import { RuleTemplateRepositoryError } from './rule-template.repository';

export interface RuleTemplateRequestContext {
	authToken: string;
	userId: string;
	fetchFn: typeof fetch;
}

export function requireRuleTemplateRequestContext(
	event: RequestEvent
): RuleTemplateRequestContext | Response {
	const authToken = event.locals.jwtString ?? null;
	const userId = event.locals.jwt?.sub ?? null;

	if (!authToken || !userId) {
		return json({ message: m.auth_not_authenticated() }, { status: 401 });
	}

	return {
		authToken,
		userId,
		fetchFn: event.fetch
	};
}

export function parseRuleTemplateId(rawId: string | undefined): number | Response {
	const id = Number(rawId);
	if (!Number.isInteger(id) || id <= 0) {
		return json({ message: m.rules_new_invalid_template_id() }, { status: 400 });
	}

	return id;
}

export function repositoryErrorResponse(error: unknown, fallback: string): Response {
	if (error instanceof RuleTemplateRepositoryError) {
		if (error.status >= 500) {
			console.error(fallback, error);
		}
		return json({ message: fallback }, { status: error.status });
	}

	console.error(fallback, error);
	return json({ message: fallback }, { status: 500 });
}
