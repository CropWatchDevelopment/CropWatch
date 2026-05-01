import { ApiService } from '$lib/api/api.service';
import type { DeviceStatusSummary, RuleDto } from '$lib/api/api.dtos';
import type { LayoutServerLoad } from './$types';

const EMPTY_DEVICE_STATUSES: DeviceStatusSummary = { online: 0, offline: 0 };

function readTriggeredRulesCount(rawTriggeredRulesCount: unknown): number {
	if (typeof rawTriggeredRulesCount === 'number' && Number.isFinite(rawTriggeredRulesCount)) {
		return rawTriggeredRulesCount;
	}

	if (rawTriggeredRulesCount && typeof rawTriggeredRulesCount === 'object') {
		const record = rawTriggeredRulesCount as Record<string, unknown>;
		const maybeCount = record.count ?? record.triggered_count;

		if (typeof maybeCount === 'number' && Number.isFinite(maybeCount)) {
			return maybeCount;
		}
	}

	return 0;
}

async function loadOverviewData(apiServiceInstance: ApiService): Promise<{
	deviceStatuses: DeviceStatusSummary;
	triggeredRules: RuleDto[];
	triggeredRulesCount: number;
}> {
	const [deviceStatusesResult, triggeredRulesResult, triggeredRulesCountResult] =
		await Promise.allSettled([
			apiServiceInstance.getDeviceStatuses(),
			apiServiceInstance.getTriggeredRules(),
			apiServiceInstance.getTriggeredRulesCount()
		]);

	if (deviceStatusesResult.status === 'rejected') {
		console.error('Failed to fetch overview device statuses:', deviceStatusesResult.reason);
	}

	if (triggeredRulesResult.status === 'rejected') {
		console.error('Failed to fetch overview triggered rules:', triggeredRulesResult.reason);
	}

	if (triggeredRulesCountResult.status === 'rejected') {
		console.error(
			'Failed to fetch overview triggered rule count:',
			triggeredRulesCountResult.reason
		);
	}

	return {
		deviceStatuses:
			deviceStatusesResult.status === 'fulfilled'
				? deviceStatusesResult.value
				: EMPTY_DEVICE_STATUSES,
		triggeredRules: triggeredRulesResult.status === 'fulfilled' ? triggeredRulesResult.value : [],
		triggeredRulesCount:
			triggeredRulesCountResult.status === 'fulfilled'
				? readTriggeredRulesCount(triggeredRulesCountResult.value)
				: 0
	};
}

export const load: LayoutServerLoad = async ({ locals, fetch }) => {
	let profile;
	let overview = {
		deviceStatuses: EMPTY_DEVICE_STATUSES,
		triggeredRules: [] as RuleDto[],
		triggeredRulesCount: 0
	};

	if (locals.jwtString) {
		const apiServiceInstance = new ApiService({
			fetchFn: fetch,
			authToken: locals.jwtString
		});

		const [profileResult, overviewResult] = await Promise.allSettled([
			apiServiceInstance.getUserProfile(),
			loadOverviewData(apiServiceInstance)
		]);

		if (profileResult.status === 'fulfilled') {
			profile = profileResult.value;
		} else {
			console.error('Failed to fetch authenticated user:', profileResult.reason);
		}

		if (overviewResult.status === 'fulfilled') {
			overview = overviewResult.value;
		} else {
			console.error('Failed to fetch overview data:', overviewResult.reason);
		}
	}

	return {
		session: locals.jwt ?? null,
		authToken: locals.jwtString ?? null,
		profile,
		overview
	};
};
