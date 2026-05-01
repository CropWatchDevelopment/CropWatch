import {
	createRuleTemplateForUser,
	listRuleTemplatesForUser
} from '$lib/server/rules-new/rule-template.repository';
import {
	repositoryErrorResponse,
	requireRuleTemplateRequestContext
} from '$lib/server/rules-new/route-helpers';
import { m } from '$lib/paraglide/messages.js';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const context = requireRuleTemplateRequestContext(event);
	if (context instanceof Response) return context;

	try {
		const search = event.url.searchParams.get('search') ?? undefined;
		return json(await listRuleTemplatesForUser(context, { search }));
	} catch (error) {
		return repositoryErrorResponse(error, m.rules_new_load_failed());
	}
};

export const POST: RequestHandler = async (event) => {
	const context = requireRuleTemplateRequestContext(event);
	if (context instanceof Response) return context;

	try {
		const payload = await event.request.json();
		const rule = await createRuleTemplateForUser(context, payload);
		return json(rule, { status: 201 });
	} catch (error) {
		return repositoryErrorResponse(error, m.rules_new_save_failed());
	}
};
