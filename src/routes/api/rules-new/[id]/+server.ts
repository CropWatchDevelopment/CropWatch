import {
	deleteRuleTemplateForUser,
	getRuleTemplateForUser,
	updateRuleTemplateForUser
} from '$lib/server/rules-new/rule-template.repository';
import {
	parseRuleTemplateId,
	repositoryErrorResponse,
	requireRuleTemplateRequestContext
} from '$lib/server/rules-new/route-helpers';
import { m } from '$lib/paraglide/messages.js';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	const context = requireRuleTemplateRequestContext(event);
	if (context instanceof Response) return context;

	const templateId = parseRuleTemplateId(event.params.id);
	if (templateId instanceof Response) return templateId;

	try {
		return json(await getRuleTemplateForUser(context, templateId));
	} catch (error) {
		return repositoryErrorResponse(error, m.rules_new_load_failed());
	}
};

export const PATCH: RequestHandler = async (event) => {
	const context = requireRuleTemplateRequestContext(event);
	if (context instanceof Response) return context;

	const templateId = parseRuleTemplateId(event.params.id);
	if (templateId instanceof Response) return templateId;

	try {
		const payload = await event.request.json();
		return json(await updateRuleTemplateForUser(context, templateId, payload));
	} catch (error) {
		return repositoryErrorResponse(error, m.rules_new_save_failed());
	}
};

export const DELETE: RequestHandler = async (event) => {
	const context = requireRuleTemplateRequestContext(event);
	if (context instanceof Response) return context;

	const templateId = parseRuleTemplateId(event.params.id);
	if (templateId instanceof Response) return templateId;

	try {
		return json(await deleteRuleTemplateForUser(context, templateId));
	} catch (error) {
		return repositoryErrorResponse(error, m.rules_new_delete_failed());
	}
};
