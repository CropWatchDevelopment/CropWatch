import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';
import { RuleRepository } from '$lib/repositories/RuleRepository';
import { RuleService } from '$lib/services/RuleService';
import { DeviceRepository } from '$lib/repositories/DeviceRepository';
import type { Rule } from '$lib/models/Rule';
import type { Database } from '../../../../database.types';
import type { Device } from '$lib/models/Device';

type RuleTriggered = Database['public']['Tables']['cw_rule_triggered']['Row'];
type RuleWithHistory = Rule & { cw_rule_triggered?: RuleTriggered[] };

export const GET: RequestHandler = async ({ locals }) => {
	const user = locals.user;

	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const errorHandler = new ErrorHandlingService();
		const ruleRepository = new RuleRepository(locals.supabase, errorHandler);
		const deviceRepository = new DeviceRepository(locals.supabase, errorHandler);
		const ruleService = new RuleService(ruleRepository);

		const rules = (await ruleService.getRulesByProfile(user.id)) as RuleWithHistory[];
		const triggeredRules = rules.filter((rule) => rule.is_triggered);

		const deviceCache = new Map<string, Device | null>();
		const alerts = await Promise.all(
			triggeredRules.map(async (rule) => {
				let device: Device | null = null;
				const devEui = rule.dev_eui ?? undefined;

				if (devEui) {
					if (!deviceCache.has(devEui)) {
						deviceCache.set(devEui, await deviceRepository.findById(devEui));
					}
					device = deviceCache.get(devEui) ?? null;
				}

				const triggeredHistory = rule.cw_rule_triggered ?? [];
				const recentHistory = triggeredHistory
					.map((entry) => entry.created_at)
					.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

				return {
					id: rule.id,
					name: rule.name,
					ruleGroupId: rule.ruleGroupId,
					dev_eui: rule.dev_eui,
					last_triggered: rule.last_triggered ?? recentHistory[0] ?? null,
					trigger_count: rule.trigger_count,
					device: device
						? {
								dev_eui: device.dev_eui,
								location_id: device.location_id,
								name: device.name
							}
						: null
				};
			})
		);

		return json({ alerts });
	} catch (error) {
		console.error('Failed to load triggered alerts:', error);
		return json({ error: 'Failed to load alerts' }, { status: 500 });
	}
};
