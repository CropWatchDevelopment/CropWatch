import type { CwSensorCardDetailRow, CwSensorCardDevice } from '@cropwatchdevelopment/cwui';
import type { LocationDto } from '$lib/api/api.dtos';
import type { IDevice } from '$lib/interfaces/device.interface';
import {
	resolveDeviceTypeConfig,
	type DeviceTypeConfig,
	type DeviceTypeLookup
} from './dashboard-device-data';
import {
	DASHBOARD_DEVICE_REFRESH_ALARM_AFTER_MINUTES,
	isDashboardDeviceOffline
} from './dashboard-device-refresh';

export const DASHBOARD_SENSOR_CARD_LOCATION_BATCH_SIZE = 10;
export const DASHBOARD_SENSOR_CARD_PREFETCH_REMAINING = 5;

export interface DashboardSensorCardEntry {
	id: string;
	storageKey: string;
	devEui: string;
	locationId: number;
	sourceDevice: IDevice;
	sensor: CwSensorCardDevice;
}

export interface DashboardLocationSensorCard {
	id: string;
	locationId: number;
	title: string;
	sensors: DashboardSensorCardEntry[];
}

function getDeviceBaseLabel(device: IDevice): string {
	return device.name.trim() || device.dev_eui;
}

function getDeviceLabel(device: IDevice, duplicateCounts: Map<string, number>): string {
	const baseLabel = getDeviceBaseLabel(device);
	return (duplicateCounts.get(baseLabel) ?? 0) > 1 ? `${baseLabel} (${device.dev_eui})` : baseLabel;
}


function getDeviceStatus(device: IDevice, nowMs: number): 'online' | 'offline' {
	return isDashboardDeviceOffline(device, nowMs) ? 'offline' : 'online';
}

function getSensorStorageKey(device: IDevice): string {
	return `dashboard-device-card:${device.dev_eui}`;
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

/** Metadata keys present in the /latest-data payload that are not sensor readings. */
const SENSOR_SKIP_KEYS = new Set([
	'dev_eui', 'name', 'location_id', 'location_name', 'group',
	'data_table', 'data_table_v2', 'type', 'id',
	'created_at', 'cw_device_type', 'cw_locations', 'cw_device_owners'
]);

interface SensorFieldMeta { label: string; unit: string; icon: string }

const KNOWN_SENSOR_FIELDS: Record<string, SensorFieldMeta> = {
	temperature_c:       { label: 'Temperature',      unit: '°C',   icon: 'thermo' },
	humidity:            { label: 'Humidity',          unit: '%',    icon: 'drop'   },
	co2:                 { label: 'CO₂',              unit: 'ppm',  icon: 'thermo' },
	moisture:            { label: 'Moisture',          unit: '%',    icon: 'drop'   },
	ec:                  { label: 'EC',                unit: 'dS/m', icon: 'drop'   },
	battery:             { label: 'Battery',           unit: '%',    icon: 'timer'  },
	pressure:            { label: 'Pressure',          unit: 'hPa',  icon: 'thermo' },
	light:               { label: 'Light',             unit: 'lux',  icon: 'thermo' },
	light_level:         { label: 'Light',             unit: 'lux',  icon: 'thermo' },
	voltage:             { label: 'Voltage',           unit: 'V',    icon: 'timer'  },
	deapth_cm:           { label: 'Depth',             unit: 'cm',   icon: 'drop'   },
	depth_cm:            { label: 'Depth',             unit: 'cm',   icon: 'drop'   },
};

function formatKeyLabel(key: string): string {
	return key
		.replace(/_c$/, '')
		.replace(/_/g, ' ')
		.replace(/\b\w/g, (c) => c.toUpperCase());
}

export function buildDeviceLoadingDetailRows(deviceLabel: string): CwSensorCardDetailRow[] {
	return [
		{ id: `${deviceLabel}-loading-primary`, label: 'Loading…', value: '—', icon: 'thermo' },
		{ id: `${deviceLabel}-loading-secondary`, label: 'Loading…', value: '—', icon: 'drop' }
	];
}

/**
 * Builds detail rows from the raw /latest-data payload, showing every numeric
 * sensor field. Type-config transforms are applied to the primary/secondary keys.
 */
export function buildDeviceExpandedDetailRows(
	rawData: Record<string, unknown>,
	typeConfig: DeviceTypeConfig | undefined,
	deviceLabel: string
): CwSensorCardDetailRow[] {
	const rows: CwSensorCardDetailRow[] = [];

	for (const [key, rawValue] of Object.entries(rawData)) {
		if (SENSOR_SKIP_KEYS.has(key)) continue;
		if (typeof rawValue !== 'number' || !Number.isFinite(rawValue)) continue;

		const isPrimary = typeConfig?.primary_data_key === key;
		const isSecondary = typeConfig?.secondary_data_key === key;

		const displayValue = rawValue;

		const known = KNOWN_SENSOR_FIELDS[key];
		const label = isPrimary
			? (known?.label ?? typeConfig?.primary_data_key ?? formatKeyLabel(key))
			: isSecondary
				? (known?.label ?? typeConfig?.secondary_data_key ?? formatKeyLabel(key))
				: (known?.label ?? formatKeyLabel(key));
		const unit = isPrimary
			? (typeConfig?.primary_data_notation ?? known?.unit ?? '')
			: isSecondary
				? (typeConfig?.secondary_data_notation ?? known?.unit ?? '')
				: (known?.unit ?? '');
		const icon = known?.icon ?? 'thermo';

		rows.push({
			id: `${deviceLabel}-${key}`,
			label,
			value: displayValue.toLocaleString('en-US', {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2
			}),
			unit,
			icon
		});
	}

	// Last updated timestamp
	const createdAt = rawData.created_at;
	if (createdAt != null) {
		const lastUpdatedDate = createdAt instanceof Date ? createdAt : new Date(String(createdAt));
		if (Number.isFinite(lastUpdatedDate.getTime())) {
			rows.push({
				id: `${deviceLabel}-updated`,
				label: 'Last Update',
				icon: 'timer',
				lastUpdated: lastUpdatedDate,
				expectedUpdateAfter: DASHBOARD_DEVICE_REFRESH_ALARM_AFTER_MINUTES
			});
		}
	}

	return rows;
}

function buildDashboardSensorCardEntry(
	device: IDevice,
	duplicateCounts: Map<string, number>,
	nowMs: number,
	deviceTypeLookup?: DeviceTypeLookup
): DashboardSensorCardEntry {
	const label = getDeviceLabel(device, duplicateCounts);
	const typeConfig = resolveDeviceTypeConfig(device, deviceTypeLookup);

	if (device.has_primary_data === false) {
		return {
			id: `sensor:${device.dev_eui}`,
			storageKey: getSensorStorageKey(device),
			devEui: device.dev_eui,
			locationId: Number(device.location_id),
			sourceDevice: device,
			sensor: {
				label,
				primaryValue: 0,
				primaryUnit: typeConfig?.primary_data_notation ?? '°C',
				status: 'offline',
				detailRows: buildUnavailableDetailRows(label, typeConfig)
			} satisfies CwSensorCardDevice
		};
	}

	const rawPrimary = device.raw_data?.[typeConfig?.primary_data_key];
	const rawSecondary = device.raw_data?.[typeConfig?.secondary_data_key] || null;

	console.log(device);
	return {
		id: `sensor:${device.dev_eui}`,
		storageKey: getSensorStorageKey(device),
		devEui: device.dev_eui,
		locationId: Number(device.location_id),
		sourceDevice: device,
		sensor: {
			label,
			primaryValue: typeof rawPrimary === 'number' ? rawPrimary : Number(rawPrimary ?? 0) || 0,
			primaryUnit: typeConfig?.primary_data_notation ?? '°C',
			...(rawSecondary !== null && {
				secondaryValue: typeof rawSecondary === 'number' ? rawSecondary : Number(rawSecondary) || 0,
				secondaryUnit: typeConfig?.secondary_data_notation ?? '%',
			}),
			status: getDeviceStatus(device, nowMs),
			lastUpdated: device.created_at
		} satisfies CwSensorCardDevice
	};
}

export function buildDashboardLocationSensorCards(
	devices: IDevice[],
	locations: LocationDto[],
	nowMs: number,
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

			return {
				id: `location:${locationId}`,
				locationId,
				title: getLocationTitle(locationId, locationsById, sortedLocationDevices),
				sensors: sortedLocationDevices.map((device) =>
					buildDashboardSensorCardEntry(device, duplicateCounts, nowMs, deviceTypeLookup)
				)
			} satisfies DashboardLocationSensorCard;
		})
		.sort((left, right) =>
			left.title.localeCompare(right.title, undefined, { numeric: true, sensitivity: 'base' })
		);
}
