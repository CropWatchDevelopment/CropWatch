import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from '../../$types';
import { SessionService } from '$lib/services/SessionService';
import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';
import { RuleRepository } from '$lib/repositories/RuleRepository';
import { RuleService } from '$lib/services/RuleService';
import { DeviceRepository } from '$lib/repositories/DeviceRepository';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
	const sessionService = new SessionService(supabase);
	const { session, user } = await sessionService.getSafeSession();

	if (!session || !user) {
		throw redirect(302, '/auth/login');
	}

	const ruleRepository = new RuleRepository(supabase, new ErrorHandlingService());
	const deviceRepository = new DeviceRepository(supabase, new ErrorHandlingService());
	const ruleService = new RuleService(ruleRepository);

	const notifications = await ruleService.getRulesByProfile(user.id);
	for (let notification of notifications) {
		notification['cw_device'] = await deviceRepository.findById(notification.dev_eui);
	}

	return {
		notifications
	};
};
