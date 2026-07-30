import { redirect } from '@sveltejs/kit';
import { ApiService } from '$lib/api/api.service';
import type { DeviceStatusSummary, RuleTemplateDto } from '$lib/api/api.dtos';
import { withRedirectParam } from '$lib/utils/auth-redirect';
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
	triggeredRules: RuleTemplateDto[];
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

export const load: LayoutServerLoad = async ({ locals, fetch, url, untrack }) => {
	let profile;
	let preferences;
	let overview = {
		deviceStatuses: EMPTY_DEVICE_STATUSES,
		triggeredRules: [] as RuleTemplateDto[],
		triggeredRulesCount: 0
	};

	// Read untracked so adding `url` does not make this load (and its API
	// batch) re-run on every client-side navigation.
	const currentPath = untrack(() => `${url.pathname}${url.search}`);

	if (locals.jwtString) {
		const apiServiceInstance = new ApiService({
			fetchFn: fetch,
			authToken: locals.jwtString
		});

		const [profileResult, preferencesResult, overviewResult, legalResult] =
			await Promise.allSettled([
				apiServiceInstance.getUserProfile(),
				apiServiceInstance.getPreferences(),
				loadOverviewData(apiServiceInstance),
				apiServiceInstance.getLegalStatus()
			]);

		if (profileResult.status === 'fulfilled') {
			profile = profileResult.value;
		} else {
			console.error('Failed to fetch authenticated user:', profileResult.reason);
		}

		if (preferencesResult.status === 'fulfilled') {
			preferences = preferencesResult.value;
		} else {
			console.error('Failed to fetch preferences:', preferencesResult.reason);
		}

		if (overviewResult.status === 'fulfilled') {
			overview = overviewResult.value;
		} else {
			console.error('Failed to fetch overview data:', overviewResult.reason);
		}

		// Gate on updated legal documents — fail open: only a well-formed,
		// positive answer redirects, so an unreachable or older API (whose
		// catch-all serves 200 HTML) can never lock users out. /auth/* is
		// exempt so the interstitial, login, and logout stay reachable.
		let needsLegalAcceptance = false;
		if (legalResult.status === 'fulfilled') {
			const legalStatus = legalResult.value;
			if (legalStatus && Array.isArray(legalStatus.documents)) {
				needsLegalAcceptance = legalStatus.needs_acceptance === true;
			}
		} else {
			console.error('Failed to fetch legal status (fail-open):', legalResult.reason);
		}

		if (needsLegalAcceptance && !currentPath.startsWith('/auth')) {
			redirect(303, withRedirectParam('/auth/accept-terms', currentPath));
		}
	}

	return {
		session: locals.jwt ?? null,
		authToken: locals.jwtString ?? null,
		profile,
		preferences,
		overview
	};
};
