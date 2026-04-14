import { env as publicEnv } from '$env/dynamic/public';
import { ApiService } from '$lib/api/api.service';
import type {
	DevicePrimaryDataDto,
	LocationDto,
	TriggeredRulesCountResponse
} from '$lib/api/api.dtos';
import type { PageServerLoad } from './$types';

const DEFAULT_TABLE_PAGE_SIZE = 25;

type DashboardFilters = {
	group: string;
	locationGroup: string;
	location: string;
};

type DashboardSummaryState = {
	totalDevices: number;
	onlineDevices: number;
	offlineDevices: number;
	activeAlertCount: number;
	error: string | null;
};

type DashboardFilterOptionsState = {
	deviceGroups: string[];
	locationGroups: string[];
	locations: Array<{ location_id: number; name: string }>;
	error: string | null;
};

type DashboardInitialTableState = {
	query: {
		page: number;
		pageSize: number;
		filters: Record<string, string[]>;
	};
	rows: DevicePrimaryDataDto[];
	total: number;
	error: string | null;
};

function resolveDashboardApiBaseUrl(url: URL): string {
	const configuredBaseUrl = publicEnv.PUBLIC_API_BASE_URL?.trim();
	return configuredBaseUrl && configuredBaseUrl.length > 0 ? configuredBaseUrl : url.origin;
}

function readDashboardFilters(url: URL): DashboardFilters {
	return {
		group: url.searchParams.get('group')?.trim() ?? '',
		locationGroup: url.searchParams.get('locationGroup')?.trim() ?? '',
		location: url.searchParams.get('location')?.trim() ?? ''
	};
}

function toTableFilters(filters: DashboardFilters): Record<string, string[]> {
	return Object.fromEntries(
		Object.entries(filters)
			.filter(([, value]) => value.length > 0)
			.map(([key, value]) => [key, [value]])
	);
}

function normalizeStringList(values: readonly unknown[] | null | undefined): string[] {
	if (!Array.isArray(values)) {
		return [];
	}

	return Array.from(
		new Set(
			values
				.map((value) => (typeof value === 'string' ? value.trim() : ''))
				.filter((value) => value.length > 0)
		)
	).sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }));
}

function normalizeLocations(values: LocationDto[]): Array<{ location_id: number; name: string }> {
	return values
		.map((location) => ({
			location_id: Number(location.location_id),
			name: typeof location.name === 'string' ? location.name.trim() : ''
		}))
		.filter(
			(location) =>
				Number.isFinite(location.location_id) && location.location_id > 0 && location.name
		)
		.sort(
			(left, right) =>
				left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: 'base' }) ||
				left.location_id - right.location_id
		);
}

function readTriggeredRulesCount(value: TriggeredRulesCountResponse): number {
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value;
	}

	if (value && typeof value === 'object' && typeof value.count === 'number') {
		return Number.isFinite(value.count) ? value.count : 0;
	}

	return 0;
}

function toErrorMessage(error: unknown, fallback: string): string {
	if (error instanceof Error && error.message.trim()) {
		return error.message;
	}

	return fallback;
}

function createEmptySummary(error: string | null = null): DashboardSummaryState {
	return {
		totalDevices: 0,
		onlineDevices: 0,
		offlineDevices: 0,
		activeAlertCount: 0,
		error
	};
}

function createEmptyFilterOptions(error: string | null = null): DashboardFilterOptionsState {
	return {
		deviceGroups: [],
		locationGroups: [],
		locations: [],
		error
	};
}

function createEmptyInitialTable(
	filters: DashboardFilters,
	error: string | null = null
): DashboardInitialTableState {
	return {
		query: {
			page: 1,
			pageSize: DEFAULT_TABLE_PAGE_SIZE,
			filters: toTableFilters(filters)
		},
		rows: [],
		total: 0,
		error
	};
}

async function loadSummary(api: ApiService): Promise<DashboardSummaryState> {
	const [deviceStatusesResult, alertCountResult] = await Promise.allSettled([
		api.getDeviceStatuses(),
		api.getTriggeredRulesCount()
	]);

	const onlineDevices =
		deviceStatusesResult.status === 'fulfilled' &&
		typeof deviceStatusesResult.value.online === 'number'
			? deviceStatusesResult.value.online
			: 0;
	const offlineDevices =
		deviceStatusesResult.status === 'fulfilled' &&
		typeof deviceStatusesResult.value.offline === 'number'
			? deviceStatusesResult.value.offline
			: 0;
	const activeAlertCount =
		alertCountResult.status === 'fulfilled' ? readTriggeredRulesCount(alertCountResult.value) : 0;
	const errors = [
		deviceStatusesResult.status === 'rejected'
			? toErrorMessage(deviceStatusesResult.reason, 'Failed to load device status summary.')
			: null,
		alertCountResult.status === 'rejected'
			? toErrorMessage(alertCountResult.reason, 'Failed to load active alert count.')
			: null
	].filter((value): value is string => value !== null);

	return {
		totalDevices: onlineDevices + offlineDevices,
		onlineDevices,
		offlineDevices,
		activeAlertCount,
		error: errors.length > 0 ? errors.join(' ') : null
	};
}

async function loadFilterOptions(api: ApiService): Promise<DashboardFilterOptionsState> {
	const [deviceGroupsResult, locationGroupsResult, locationsResult] = await Promise.allSettled([
		api.getDeviceGroups(),
		api.getLocationGroups(),
		api.getLocations()
	]);

	const errors = [
		deviceGroupsResult.status === 'rejected'
			? toErrorMessage(deviceGroupsResult.reason, 'Failed to load device groups.')
			: null,
		locationGroupsResult.status === 'rejected'
			? toErrorMessage(locationGroupsResult.reason, 'Failed to load location groups.')
			: null,
		locationsResult.status === 'rejected'
			? toErrorMessage(locationsResult.reason, 'Failed to load locations.')
			: null
	].filter((value): value is string => value !== null);

	return {
		deviceGroups:
			deviceGroupsResult.status === 'fulfilled'
				? normalizeStringList(deviceGroupsResult.value)
				: [],
		locationGroups:
			locationGroupsResult.status === 'fulfilled'
				? normalizeStringList(locationGroupsResult.value)
				: [],
		locations:
			locationsResult.status === 'fulfilled' ? normalizeLocations(locationsResult.value) : [],
		error: errors.length > 0 ? errors.join(' ') : null
	};
}

async function loadInitialTable(
	api: ApiService,
	filters: DashboardFilters
): Promise<DashboardInitialTableState> {
	try {
		const result = await api.getLatestPrimaryDeviceData({
			skip: 0,
			take: DEFAULT_TABLE_PAGE_SIZE,
			group: filters.group || undefined,
			locationGroup: filters.locationGroup || undefined,
			location: filters.location || undefined
		});

		return {
			query: {
				page: 1,
				pageSize: DEFAULT_TABLE_PAGE_SIZE,
				filters: toTableFilters(filters)
			},
			rows: result.data ?? [],
			total:
				typeof result.total === 'number' && Number.isFinite(result.total)
					? result.total
					: (result.data ?? []).length,
			error: null
		};
	} catch (error) {
		return createEmptyInitialTable(
			filters,
			toErrorMessage(error, 'Failed to load the latest device readings.')
		);
	}
}

export const load: PageServerLoad = async ({ locals, fetch, url }) => {
	const authToken = locals.jwtString ?? null;
	const filters = readDashboardFilters(url);

	if (!authToken) {
		return {
			authToken: null,
			summary: Promise.resolve(createEmptySummary()),
			filterOptions: Promise.resolve(createEmptyFilterOptions()),
			initialTable: Promise.resolve(createEmptyInitialTable(filters))
		};
	}

	const api = new ApiService({
		authToken,
		baseUrl: resolveDashboardApiBaseUrl(url),
		fetchFn: fetch
	});

	return {
		authToken,
		summary: loadSummary(api),
		filterOptions: loadFilterOptions(api),
		initialTable: loadInitialTable(api, filters)
	};
};
