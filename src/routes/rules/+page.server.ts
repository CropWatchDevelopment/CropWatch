import { ApiService } from '$lib/api/api.service';
import type { LayoutServerLoad } from '../$types';

export const load: LayoutServerLoad = async ({ locals, fetch }) => {
	const session = locals.jwt ?? null;
	const authToken = locals.jwtString ?? null;

	if (!authToken) {
		return {
			session,
			devices: [],
			totalDeviceCount: 0,
			triggeredRulesCount: 0
		};
	}

	const apiServiceInstance = new ApiService({
		fetchFn: fetch,
		authToken
	});

	const rules = await apiServiceInstance.getRules().catch(() => []);

	const ruleResult = rules.map((rule) => {
		const deviceRecord =
			rule.cw_devices && typeof rule.cw_devices === 'object'
				? (rule.cw_devices as Record<string, unknown>)
				: null;
		const locationRecord =
			deviceRecord?.cw_locations && typeof deviceRecord.cw_locations === 'object'
				? (deviceRecord.cw_locations as Record<string, unknown>)
				: null;

		return {
			location_name:
				typeof locationRecord?.name === 'string' && locationRecord.name.trim().length > 0
					? locationRecord.name
					: '',
			...rule
		};
	});

	return {
		session,
		authToken,
		rules: ruleResult
	};
};
