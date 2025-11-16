import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';
import { RuleRepository } from '$lib/repositories/RuleRepository';

export const POST: RequestHandler = async ({ locals, params }) => {
	const user = locals.user;
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const ruleId = Number(params.ruleId);
	if (Number.isNaN(ruleId)) {
		return json({ error: 'Invalid rule id' }, { status: 400 });
	}

	const errorHandler = new ErrorHandlingService();
	const ruleRepository = new RuleRepository(locals.supabase, errorHandler);
	const rule = await ruleRepository.findById(ruleId);

	if (!rule) {
		return json({ error: 'Alert not found' }, { status: 404 });
	}

	if (rule.profile_id !== user.id) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}

	try {
		const updated = await ruleRepository.update(ruleId, {
			is_triggered: false
		});

		return json({ success: true, alert: updated });
	} catch (error) {
		console.error('Failed to resolve alert', error);
		return json({ error: 'Failed to resolve alert' }, { status: 500 });
	}
};
