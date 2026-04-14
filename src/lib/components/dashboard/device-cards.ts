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

export interface DashboardLocationSensorCardDeviceBinding {
	devEui: string;
	locationId: number;
	sourceDevice: IDevice;
}

export interface DashboardLocationSensorCard {
	id: string;
	renderKey: string;
	locationId: number;
	title: string;
	devices: CwSensorCardDevice[];
	deviceBindingsByLabel: Record<string, DashboardLocationSensorCardDeviceBinding>;
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

function getDeviceStatus(device: IDevice, uploadIntervalMinutes?: number | null): 'online' | 'offline' {
	return isDashboardDeviceOffline(device, uploadIntervalMinutes) ? 'offline' : 'online';
}

function resolveUploadIntervalMinutes(
	device: IDevice,
	typeConfig: DeviceTypeConfig | undefined
): number {
	return (
		(device.upload_interval != null && device.upload_interval > 0 ? device.upload_interval : null) ??
		typeConfig?.default_upload_interval ??
		DASHBOARD_DEVICE_REFRESH_ALARM_AFTER_MINUTES
	);
}

function toCardRenderKey(locationId: number, devices: IDevice[]): string {
	return [
		`location:${locationId}`,
		...devices.map((device) => `${device.dev_eui}:${device.created_at.toISOString()}`)
	].join('|');
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
	depth_cm:            { label: 'Water Depth',       unit: 'cm',   icon: 'drop'   },
	deapth_cm:           { label: 'Water Depth',       unit: 'cm',   icon: 'drop'   },
	spo2:                { label: 'SpO₂',             unit: '%',    icon: 'drop'   },
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
	deviceLabel: string,
	uploadIntervalMinutes?: number
): CwSensorCardDetailRow[] {
	const rows: CwSensorCardDetailRow[] = [];

	for (const [key, rawValue] of Object.entries(rawData)) {
		if (SENSOR_SKIP_KEYS.has(key)) continue;
		if (typeof rawValue !== 'number' || !Number.isFinite(rawValue)) continue;

		const isPrimary = typeConfig?.primary_data_key === key;
		const isSecondary = typeConfig?.secondary_data_key === key;

		const displayValue = isPrimary
			? applyTransform(rawValue, typeConfig?.primary_multiplier, typeConfig?.primary_divider)
			: isSecondary
				? applyTransform(rawValue, typeConfig?.secondary_multiplier, typeConfig?.secondary_divider)
				: rawValue;

		const known = KNOWN_SENSOR_FIELDS[key];
		const label = known?.label ?? formatKeyLabel(key);
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
				expectedUpdateAfter: uploadIntervalMinutes ?? DASHBOARD_DEVICE_REFRESH_ALARM_AFTER_MINUTES
			});
		}
	}

	return rows;
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

			const deviceBindingsByLabel: DashboardLocationSensorCard['deviceBindingsByLabel'] = {};
			const sensorDevices = sortedLocationDevices.map((device) => {
				const label = getDeviceLabel(device, duplicateCounts);

				deviceBindingsByLabel[label] = {
					devEui: device.dev_eui,
					locationId: Number(device.location_id),
					sourceDevice: device
				};

				const typeConfig = resolveDeviceTypeConfig(device, deviceTypeLookup);
				const uploadIntervalMinutes = resolveUploadIntervalMinutes(device, typeConfig);

				if (device.has_primary_data === false) {
					return {
						label,
						primaryValue: 0,
						primaryUnit: typeConfig?.primary_data_notation ?? '°C',
						status: 'offline',
						detailRows: buildUnavailableDetailRows(label, typeConfig)
					} satisfies CwSensorCardDevice;
				}

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

				return {
					label,
					primaryValue,
					primaryUnit: typeConfig?.primary_data_notation ?? '°C',
					secondaryValue,
					secondaryUnit: typeConfig?.secondary_data_notation ?? '%',
					status: getDeviceStatus(device, uploadIntervalMinutes),
					lastSeenAt: device.last_data_updated_at ?? device.created_at,
					expireAfterMinutes: uploadIntervalMinutes
				} satisfies CwSensorCardDevice;
			});

			return {
				id: `location:${locationId}`,
				renderKey: toCardRenderKey(locationId, sortedLocationDevices),
				locationId,
				title: getLocationTitle(locationId, locationsById, sortedLocationDevices),
				devices: sensorDevices,
				deviceBindingsByLabel
			} satisfies DashboardLocationSensorCard;
		})
		.sort((left, right) =>
			left.title.localeCompare(right.title, undefined, { numeric: true, sensitivity: 'base' })
		);
}
