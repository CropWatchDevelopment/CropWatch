import type { CwSensorCardDetailRow, CwSensorCardDevice } from '@cropwatchdevelopment/cwui';
import type { LocationDto } from '$lib/api/api.dtos';
import type { IDevice } from '$lib/interfaces/device.interface';
import { resolveDeviceTypeConfig, type DeviceTypeLookup } from './dashboard-device-data';

export const DASHBOARD_SENSOR_CARD_EXPECTED_UPDATE_AFTER_MINUTES = 10;
export const DASHBOARD_SENSOR_CARD_LOCATION_BATCH_SIZE = 10;
export const DASHBOARD_SENSOR_CARD_PREFETCH_REMAINING = 5;

const DASHBOARD_SENSOR_CARD_EXPECTED_UPDATE_AFTER_MS =
	DASHBOARD_SENSOR_CARD_EXPECTED_UPDATE_AFTER_MINUTES * 60_000;

/** Stop arming the CwDuration alarm once a device is stale beyond this (ms). */
const DASHBOARD_SENSOR_CARD_ALARM_CUTOFF_MS = 60 * 60_000; // 1 hour

export interface DashboardLocationSensorCard {
	id: string;
	locationId: number;
	title: string;
	devices: CwSensorCardDevice[];
	deviceRouteParamsByLabel: Record<string, { devEui: string; locationId: number }>;
}

function getDeviceBaseLabel(device: IDevice): string {
	return device.name.trim() || device.dev_eui;
}

function getDeviceLabel(device: IDevice, duplicateCounts: Map<string, number>): string {
	const baseLabel = getDeviceBaseLabel(device);
	return (duplicateCounts.get(baseLabel) ?? 0) > 1 ? `${baseLabel} (${device.dev_eui})` : baseLabel;
}

function applyTransform(rawValue: unknown, multiplier?: number | null, divider?: number | null): number {
	let value = typeof rawValue === 'number' ? rawValue : Number(rawValue ?? 0) || 0;
	if (multiplier != null && multiplier !== 0) {
		value *= multiplier;
	}
	if (divider != null && divider !== 0) {
		value /= divider;
	}
	return value;
}

function getDeviceStatus(device: IDevice): 'online' | 'offline' {
	if (device.has_primary_data === false) {
		return 'offline';
	}

	return Date.now() - new Date(device.created_at).getTime() >
		DASHBOARD_SENSOR_CARD_EXPECTED_UPDATE_AFTER_MS
		? 'offline'
		: 'online';
}

function buildUnavailableDetailRows(label: string, typeConfig: DeviceTypeConfig | undefined): CwSensorCardDetailRow[] {
	const primaryLabel = typeConfig?.primary_data_key ?? 'Temperature';
	const secondaryLabel = typeConfig?.secondary_data_key ?? 'Humidity';
	return [
		{
			id: `${label}-primary`,
			label: primaryLabel,
			value: 'No reading',
			icon: 'thermo'
		},
		{
			id: `${label}-secondary`,
			label: secondaryLabel,
			value: 'No reading',
			icon: 'drop'
		},
		{
			id: `${label}-updated`,
			label: 'Last Update',
			value: 'No primary data yet',
			icon: 'timer'
		}
	];
}

function getLocationTitle(
	locationId: number,
	locationsById: Map<number, LocationDto>,
	locationDevices: IDevice[]
): string {
	const location = locationsById.get(locationId);
	if (location?.name?.trim()) {
		return location.name.trim();
	}

	const deviceLocationName = locationDevices.find((device) =>
		device.location_name.trim()
	)?.location_name;
	if (deviceLocationName) {
		return deviceLocationName.trim();
	}

	return locationId > 0 ? `Location ${locationId}` : 'Unassigned';
}

export function buildDashboardLocationSensorCards(
	devices: IDevice[],
	locations: LocationDto[],
	deviceTypeLookup?: DeviceTypeLookup
): DashboardLocationSensorCard[] {
	const locationsById = new Map(
		locations.map((location) => [Number(location.location_id), location] as const)
	);
	const devicesByLocationId = new Map<number, IDevice[]>();

	for (const device of devices) {
		const locationId = Number(device.location_id);
		const locationDevices = devicesByLocationId.get(locationId);

		if (locationDevices) {
			locationDevices.push(device);
			continue;
		}

		devicesByLocationId.set(locationId, [device]);
	}

	return Array.from(devicesByLocationId.entries())
		.map(([locationId, locationDevices]) => {
			const sortedLocationDevices = [...locationDevices].sort(
				(left, right) =>
					getDeviceBaseLabel(left).localeCompare(getDeviceBaseLabel(right), undefined, {
						numeric: true,
						sensitivity: 'base'
					}) ||
					left.dev_eui.localeCompare(right.dev_eui, undefined, {
						numeric: true,
						sensitivity: 'base'
					})
			);
			const duplicateCounts = new Map<string, number>();

			for (const device of sortedLocationDevices) {
				const baseLabel = getDeviceBaseLabel(device);
				duplicateCounts.set(baseLabel, (duplicateCounts.get(baseLabel) ?? 0) + 1);
			}

			const deviceRouteParamsByLabel: DashboardLocationSensorCard['deviceRouteParamsByLabel'] = {};
			const sensorDevices = sortedLocationDevices.map((device) => {
				const label = getDeviceLabel(device, duplicateCounts);

				deviceRouteParamsByLabel[label] = {
					devEui: device.dev_eui,
					locationId: Number(device.location_id)
				};

				if (device.has_primary_data === false) {
					const typeConfig = resolveDeviceTypeConfig(device, deviceTypeLookup);
					return {
						label,
						primaryValue: 0,
						primaryUnit: typeConfig?.primary_data_notation ?? '°C',
						status: 'offline',
						detailRows: buildUnavailableDetailRows(label, typeConfig)
					} satisfies CwSensorCardDevice;
				}

				const typeConfig = resolveDeviceTypeConfig(device, deviceTypeLookup);
				const primaryKey = typeConfig?.primary_data_key;
				const secondaryKey = typeConfig?.secondary_data_key;

				// Resolve primary value: try dynamic key from raw_data, fall back to temperature_c
				const rawPrimary = primaryKey && device.raw_data?.[primaryKey] !== undefined
					? device.raw_data[primaryKey]
					: device.temperature_c;
				const primaryValue = applyTransform(rawPrimary, typeConfig?.primary_multiplier, typeConfig?.primary_divider);

				// Resolve secondary value: try dynamic key from raw_data, fall back to humidity
				const rawSecondary = secondaryKey && device.raw_data?.[secondaryKey] !== undefined
					? device.raw_data[secondaryKey]
					: device.humidity;
				const secondaryValue = applyTransform(rawSecondary, typeConfig?.secondary_multiplier, typeConfig?.secondary_divider);

				const staleness = Date.now() - new Date(device.created_at).getTime();
				return {
					label,
					primaryValue,
					primaryUnit: typeConfig?.primary_data_notation ?? '°C',
					secondaryValue,
					secondaryUnit: typeConfig?.secondary_data_notation ?? '%',
					status: getDeviceStatus(device),
					lastUpdated: device.created_at,
					expectedUpdateAfterMinutes:
						staleness <= DASHBOARD_SENSOR_CARD_ALARM_CUTOFF_MS
							? DASHBOARD_SENSOR_CARD_EXPECTED_UPDATE_AFTER_MINUTES
							: undefined
				} satisfies CwSensorCardDevice;
			});

			return {
				id: `location:${locationId}`,
				locationId,
				title: getLocationTitle(locationId, locationsById, sortedLocationDevices),
				devices: sensorDevices,
				deviceRouteParamsByLabel
			} satisfies DashboardLocationSensorCard;
		})
		.sort((left, right) =>
			left.title.localeCompare(right.title, undefined, { numeric: true, sensitivity: 'base' })
		);
}
