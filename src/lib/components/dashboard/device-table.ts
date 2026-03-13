import type { CwTableQuery, CwTableResult } from '@cropwatchdevelopment/cwui';
import type { LatestPrimaryDataQuery, LocationDto } from '$lib/api/api.dtos';
import type { IDevice } from '$lib/interfaces/device.interface';

export interface DashboardDeviceFilters {
	group: string;
	locationGroup: string;
	location: string;
}

export const DASHBOARD_DEVICE_BATCH_SIZE = 25;
export const DASHBOARD_DEVICE_PAGE_SIZE_OPTIONS = [25, 50, 75, 100];
export const DASHBOARD_DEVICE_ROW_HEIGHT = 52;
export const DASHBOARD_DEVICE_OVERSCAN = 16;

type SortDirection = 'asc' | 'desc';

const LOCATION_GROUP_VALUE_KEYS = ['location_group', 'group', 'name', 'value', 'label'] as const;

function toTrimmedString(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

function readGroupValue(value: unknown): string {
	if (typeof value === 'string') {
		return value.trim();
	}

	if (!value || typeof value !== 'object') {
		return '';
	}

	const record = value as Record<string, unknown>;
	for (const key of LOCATION_GROUP_VALUE_KEYS) {
		const candidate = toTrimmedString(record[key]);
		if (candidate) {
			return candidate;
		}
	}

	return '';
}

export function getLocationGroupName(location: LocationDto | undefined): string {
	if (!location) {
		return '';
	}

	const record = location as Record<string, unknown>;
	return readGroupValue(record.location_group) || readGroupValue(record.group);
}

function buildLocationGroupById(locations: LocationDto[]): Map<number, string> {
	return new Map(
		locations.map(
			(location) => [Number(location.location_id), getLocationGroupName(location)] as const
		)
	);
}

export function buildDashboardTableFilters(
	filters: DashboardDeviceFilters
): Record<string, string[]> {
	return {
		...(filters.group ? { group: [filters.group] } : {}),
		...(filters.locationGroup ? { locationGroup: [filters.locationGroup] } : {}),
		...(filters.location ? { location: [filters.location] } : {})
	};
}

export function buildDashboardLatestPrimaryDataQuery(
	filters: DashboardDeviceFilters
): LatestPrimaryDataQuery {
	return {
		group: filters.group || undefined,
		locationGroup: filters.locationGroup || undefined,
		location: filters.location || undefined
	};
}

export function filterDashboardDevices(
	devices: IDevice[],
	locations: LocationDto[],
	filters: DashboardDeviceFilters
): IDevice[] {
	const locationGroupById = buildLocationGroupById(locations);

	return devices.filter((device) => {
		if (filters.group && device.group !== filters.group) {
			return false;
		}

		if (filters.location && String(device.location_id) !== filters.location) {
			return false;
		}

		if (
			filters.locationGroup &&
			locationGroupById.get(Number(device.location_id)) !== filters.locationGroup
		) {
			return false;
		}

		return true;
	});
}

export function listDashboardDevices(
	devices: IDevice[],
	locations: LocationDto[],
	filters: DashboardDeviceFilters,
	search = ''
): IDevice[] {
	return searchDashboardDevices(filterDashboardDevices(devices, locations, filters), search);
}

export function countDashboardDevices(
	devices: IDevice[],
	locations: LocationDto[],
	filters: DashboardDeviceFilters
): number {
	return filterDashboardDevices(devices, locations, filters).length;
}

function searchDashboardDevices(devices: IDevice[], search: string): IDevice[] {
	const term = search.trim().toLowerCase();
	if (!term) {
		return devices;
	}

	return devices.filter((device) =>
		[device.name, device.dev_eui, device.location_name].some((value) =>
			value.toLowerCase().includes(term)
		)
	);
}

function getSortValue(device: IDevice, column: string): number | string {
	if (column === 'created_at') {
		return device.created_at instanceof Date
			? device.created_at.getTime()
			: new Date(device.created_at).getTime();
	}

	const value = (device as unknown as Record<string, unknown>)[column];
	if (typeof value === 'number') {
		return value;
	}

	return value != null ? String(value) : '';
}

function compareSortValues(
	left: number | string,
	right: number | string,
	direction: SortDirection
): number {
	const order = direction === 'asc' ? 1 : -1;

	if (typeof left === 'number' && typeof right === 'number') {
		return (left - right) * order;
	}

	return (
		left
			.toString()
			.localeCompare(right.toString(), undefined, { numeric: true, sensitivity: 'base' }) * order
	);
}

function sortDashboardDevices(devices: IDevice[], query: CwTableQuery): IDevice[] {
	if (!query.sort) {
		return devices;
	}

	const { column, direction } = query.sort;
	return [...devices].sort((left, right) =>
		compareSortValues(getSortValue(left, column), getSortValue(right, column), direction)
	);
}

export function queryDashboardDevices(
	devices: IDevice[],
	locations: LocationDto[],
	filters: DashboardDeviceFilters,
	query: CwTableQuery
): CwTableResult<IDevice> {
	const filteredDevices = filterDashboardDevices(devices, locations, filters);
	const searchedDevices = searchDashboardDevices(filteredDevices, query.search);
	const sortedDevices = sortDashboardDevices(searchedDevices, query);
	const start = (query.page - 1) * query.pageSize;
	const end = start + query.pageSize;

	return {
		rows: sortedDevices.slice(start, end),
		total: sortedDevices.length
	};
}
