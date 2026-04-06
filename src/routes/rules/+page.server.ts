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
		const deviceOwners = Array.isArray(deviceRecord?.cw_device_owners)
			? (deviceRecord.cw_device_owners as Array<{
					user_id?: string | null;
					permission_level?: number | null;
				}>)
			: [];
		const locationRecord =
			deviceRecord?.cw_locations && typeof deviceRecord.cw_locations === 'object'
				? (deviceRecord.cw_locations as Record<string, unknown>)
				: null;

		return {
			device_name:
				deviceRecord?.name && typeof deviceRecord.name === 'string' ? deviceRecord.name : '',
			location_name:
				typeof locationRecord?.name === 'string' && locationRecord.name.trim().length > 0
					? locationRecord.name
					: '',
			hasPermission: rule.hasPermission || false,
			permission_level:
				deviceOwners.find((owner) => owner.user_id === session?.sub)?.permission_level ?? null,

			last_triggered: rule.last_triggered ? new Date(rule.last_triggered) : null,
			...rule
		};
	});

	return {
		session,
		authToken,
		rules: ruleResult
	};
};
