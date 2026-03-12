import type { CwSensorCardDevice } from '@cropwatchdevelopment/cwui';
import type { LocationDto } from '$lib/api/api.dtos';
import type { IDevice } from '$lib/interfaces/device.interface';

export const DASHBOARD_SENSOR_CARD_EXPECTED_UPDATE_AFTER_MINUTES = 10;

const DASHBOARD_SENSOR_CARD_EXPECTED_UPDATE_AFTER_MS =
	DASHBOARD_SENSOR_CARD_EXPECTED_UPDATE_AFTER_MINUTES * 60_000;

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

function getDeviceStatus(device: IDevice): 'online' | 'offline' {
	return Date.now() - new Date(device.created_at).getTime() >
		DASHBOARD_SENSOR_CARD_EXPECTED_UPDATE_AFTER_MS
		? 'offline'
		: 'online';
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
	locations: LocationDto[]
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
			const sortedLocationDevices = [...locationDevices].sort((left, right) =>
				getDeviceBaseLabel(left).localeCompare(getDeviceBaseLabel(right), undefined, {
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

				return {
					label,
					primaryValue: Number(device.temperature_c ?? 0),
					primaryUnit: '°C',
					secondaryValue: Number(device.humidity ?? 0),
					secondaryUnit: '%',
					status: getDeviceStatus(device),
					lastUpdated: device.created_at,
					expectedUpdateAfterMinutes: DASHBOARD_SENSOR_CARD_EXPECTED_UPDATE_AFTER_MINUTES
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
