import { PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../database.types';
import type { AppState } from '$lib/Interfaces/appState.interface';
import type { Device } from '$lib/Interfaces/device.interface';
import type { Facility } from '$lib/Interfaces/facility.interface';
import type { Location } from '$lib/Interfaces/location.interface';
import type { AppStateState } from '$lib/data/AppState.svelte';
import type { Alert } from '$lib/Interfaces/alert.interface';

type DeviceRow = Database['public']['Tables']['cw_devices']['Row'];
type LocationRow = Database['public']['Tables']['cw_locations']['Row'];
type DeviceTypeRow = Database['public']['Tables']['cw_device_type']['Row'];
type CwRuleRow = Database['public']['Tables']['cw_rules']['Row'];
type CwAirRow = Database['public']['Tables']['cw_air_data']['Row'];
type CwSoilRow = Database['public']['Tables']['cw_soil_data']['Row'];
type CwWaterRow = Database['public']['Tables']['cw_water_data']['Row'];
type CwPowerRow = Database['public']['Tables']['cw_power_data']['Row'];

type DeviceJoined = DeviceRow & {
	location?: LocationRow | null;
	device_type?: DeviceTypeRow | null;
	alerts?: CwRuleRow[] | null;
};

type AuthSession = { access_token: string; refresh_token?: string | null };
export type DataTabKey = 'air' | 'soil' | 'water' | 'power';
export type DataTableRow = CwAirRow | CwSoilRow | CwWaterRow | CwPowerRow;

const DATA_TABLE_MAP = {
	air: 'cw_air_data',
	soil: 'cw_soil_data',
	water: 'cw_water_data',
	power: 'cw_power_data'
} as const;
type DataTableName = (typeof DATA_TABLE_MAP)[keyof typeof DATA_TABLE_MAP];
const DATA_TABLE_NAMES = Object.values(DATA_TABLE_MAP) as DataTableName[];

function isDataTableName(value: string): value is DataTableName {
	return DATA_TABLE_NAMES.includes(value as DataTableName);
}

// Singleton client instance to avoid multiple GoTrueClient instances
let supabaseClientInstance: SupabaseClient<Database> | null = null;
let currentSessionTokens: { access_token: string; refresh_token?: string | null } | null = null;

async function createSupabaseClient(session?: AuthSession): Promise<SupabaseClient<Database>> {
	if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY) {
		throw new Error('Supabase environment variables are not set.');
	}

	// Check if we can reuse the existing client
	const sessionChanged =
		session != null &&
		currentSessionTokens != null &&
		(
			session.access_token !== currentSessionTokens.access_token ||
			(session.refresh_token ?? null) !== (currentSessionTokens.refresh_token ?? null)
		);

	// Reuse existing client if no session change
	if (supabaseClientInstance && !sessionChanged && (!session || currentSessionTokens)) {
		return supabaseClientInstance;
	}

	// Create a new client only if needed
	if (!supabaseClientInstance) {
		supabaseClientInstance = createClient<Database>(
			PUBLIC_SUPABASE_URL,
			PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
			{
				auth: {
					autoRefreshToken: false,
					persistSession: false
				}
			}
		);
	}

	// Update session if provided
	if (session?.access_token && session?.refresh_token) {
		await supabaseClientInstance.auth.setSession({
			access_token: session.access_token,
			refresh_token: session.refresh_token
		});
		currentSessionTokens = { ...session };
	} else if (session?.access_token) {
		currentSessionTokens = { access_token: session.access_token, refresh_token: session.refresh_token ?? null };
	}

	return supabaseClientInstance;
}

const fToC = (value: number | null) => (value == null ? null : (value - 32) / 1.8);
const kToC = (value: number | null) => (value == null ? null : value - 273.15);
const isTempKind = (kind: string | null | undefined) =>
	!!kind && kind.toLowerCase().includes('temp');
const isFahrenheit = (kind: string | null | undefined) =>
	!!kind && (kind.toLowerCase().includes('_f') || kind.toLowerCase().endsWith('f'));
const isKelvin = (kind: string | null | undefined) =>
	!!kind && (kind.toLowerCase().includes('_k') || kind.toLowerCase().endsWith('k'));
const isHumidityKind = (kind: string | null | undefined) =>
	!!kind && kind.toLowerCase().includes('humid');
const isCo2Kind = (kind: string | null | undefined) =>
	!!kind && kind.toLowerCase().includes('co2');

function normalizeTemperature(kind: string | null | undefined, value: number | null) {
	if (value == null) return null;
	if (isFahrenheit(kind)) return fToC(value);
	if (isKelvin(kind)) return kToC(value);
	return value;
}

function getGroupKey(group: string | null): string {
	const normalized = group?.trim();
	return normalized && normalized.length > 0 ? normalized.toLowerCase() : 'ungrouped';
}

function mapFacility(loc: LocationRow): Facility {
	const group = loc.group ?? null;
	const id = getGroupKey(group);
	const display = group?.trim() || 'Ungrouped';
	const code = display.slice(0, 3).toUpperCase();
	return {
		id,
		name: display,
		code
	};
}

function mapLocation(loc: LocationRow): Location {
	const group = loc.group ?? null;
	const groupKey = getGroupKey(group);
	return {
		id: String(loc.location_id),
		name: loc.name ?? 'Unknown location',
		facilityId: groupKey,
		group
	};
}

function computeStatus(
	lastSeen: string | null,
	deviceUploadInterval: number | null,
	defaultUploadInterval: number | null
) {
	const minutes =
		deviceUploadInterval ??
		defaultUploadInterval ??
		30; // fallback to 30 minutes if nothing is configured

	const allowanceMs = minutes * 60 * 1000;
	const lastSeenDate = lastSeen ? new Date(lastSeen) : null;
	if (!lastSeenDate || Number.isNaN(lastSeenDate.getTime())) return 'offline';

	const ageMs = Date.now() - lastSeenDate.getTime();
	return ageMs > allowanceMs ? 'offline' : 'online';
}

function mapAlert(row: CwRuleRow): Alert {
	return row;
}

function mapDevice(row: DeviceJoined): Device {
	const deviceType = row.device_type;
	const primaryKind = deviceType?.primary_data_v2 ?? deviceType?.primary_data ?? 'temperature_c';
	const secondaryKind = deviceType?.secondary_data_v2 ?? deviceType?.secondary_data ?? 'humidity';
	const dataTable = deviceType?.data_table_v2 ?? deviceType?.data_table ?? null;
	const deviceTypeName = deviceType?.name ?? null;
	const deviceTypeManufacturer = deviceType?.manufacturer ?? null;
	const deviceTypeModel = deviceType?.model ?? null;

	const temperatureC = isTempKind(primaryKind)
		? normalizeTemperature(primaryKind, row.primary_data ?? null)
		: isTempKind(secondaryKind)
			? normalizeTemperature(secondaryKind, row.secondary_data ?? null)
			: null;

	const humidity = isHumidityKind(secondaryKind)
		? row.secondary_data ?? null
		: isHumidityKind(primaryKind)
			? row.primary_data ?? null
			: null;

	const co2 =
		isCo2Kind(primaryKind) && row.primary_data != null
			? Number(row.primary_data)
			: isCo2Kind(secondaryKind) && row.secondary_data != null
				? Number(row.secondary_data)
				: null;

	const loc = row.location;
	const lastSeen = row.last_data_updated_at ?? row.installed_at ?? '';
	const status = computeStatus(
		lastSeen,
		row.upload_interval ?? null,
		deviceType?.default_upload_interval ?? null
	);
	const groupKey = loc ? getGroupKey(loc.group ?? null) : 'ungrouped';

	return {
		id: row.dev_eui,
		name: row.name,
		locationId: loc ? String(loc.location_id) : 'unknown',
		facilityId: groupKey,
		dataTable,
		deviceTypeName,
		deviceTypeManufacturer,
		deviceTypeModel,
		temperatureC: temperatureC ?? 0,
		humidity: humidity ?? 0,
		co2: co2 ?? null,
		lastSeen,
		status,
		hasAlert: false,
		data: []
	};
}

async function fetchCachedRow<Row>(
	cache: Map<number, Row>,
	key: number,
	fetcher: () => Promise<Row | null>
) {
	if (cache.has(key)) return cache.get(key) as Row;
	const data = await fetcher();
	if (data) cache.set(key, data);
	return data ?? null;
}

async function fetchCachedRowById<Row>(
	client: SupabaseClient<Database>,
	table: keyof Database['public']['Tables'],
	idColumn: string,
	id: number,
	cache: Map<number, Row>
) {
	return fetchCachedRow(cache, id, async () => {
		const { data, error } = await client
			.from(table)
			.select('*')
			.eq(idColumn, id)
			.maybeSingle();
		if (error) throw error;
		return (data as Row | null) ?? null;
	});
}

type BroadcastChangePayload<Row> = {
	event: string;
	payload?: {
		record?: Row | null;
		old_record?: Row | null;
		schema?: string;
		table?: string;
		operation?: string;
	};
};

type BroadcastContext = {
	client: SupabaseClient<Database>;
	appState: AppStateState;
	typeCache: Map<number, DeviceTypeRow>;
	locationCache: Map<number, LocationRow>;
};

type DevicePostgresChangePayload = {
	eventType: 'INSERT' | 'UPDATE' | 'DELETE';
	new: DeviceRow | null;
	old: DeviceRow | null;
};

async function ensureRealtimeAuthToken(
	client: SupabaseClient<Database>,
	session?: AuthSession
) {
	const token = session?.access_token ?? null;
	if (!token) return false;
	await client.realtime.setAuth(token);
	return true;
}

async function hydrateAndUpsertDevice(
	row: DeviceRow,
	client: SupabaseClient<Database>,
	appState: AppStateState,
	typeCache: Map<number, DeviceTypeRow>,
	locationCache: Map<number, LocationRow>
) {
	let device_type: DeviceTypeRow | null = null;
	if (row.type != null) {
		device_type = await fetchCachedRowById(
			client,
			'cw_device_type',
			'id',
			row.type,
			typeCache
		);
	}

	let location: LocationRow | null = null;
	if (row.location_id != null) {
		location = await fetchCachedRowById(
			client,
			'cw_locations',
			'location_id',
			row.location_id,
			locationCache
		);
	}

	const mapped = mapDevice({
		...row,
		device_type: device_type ?? undefined,
		location: location ?? undefined
	});

	upsertDeviceInState(appState, mapped);
}

function upsertDeviceInState(appState: AppStateState, mapped: Device) {
	const idx = appState.devices.findIndex((d) => d.id === mapped.id);
	if (idx >= 0) {
		appState.devices = [
			...appState.devices.slice(0, idx),
			mapped,
			...appState.devices.slice(idx + 1)
		];
	} else {
		appState.devices = [mapped, ...appState.devices];
	}
}

function removeDeviceFromState(appState: AppStateState, devEui: string) {
	const idx = appState.devices.findIndex((d) => d.id === devEui);
	if (idx >= 0) {
		appState.devices = [
			...appState.devices.slice(0, idx),
			...appState.devices.slice(idx + 1)
		];
	}
}

/**
 * Subscribe to realtime inserts/updates on cw_devices and merge into appState.devices.
 * Returns an unsubscribe function.
 */
export async function startDeviceRealtime(appState: AppStateState, session?: AuthSession) {
	const supabase = await createSupabaseClient(session);
	const typeCache = new Map<number, DeviceTypeRow>();
	const locationCache = new Map<number, LocationRow>();
	const broadcastCapable = await ensureRealtimeAuthToken(supabase, session);
	const broadcastContext = {
		client: supabase,
		appState,
		typeCache,
		locationCache
	};
	
	const channel = supabase.channel(
		'cw_devices_realtime',
		broadcastCapable
			? {
					config: {
						private: true,
						broadcast: { self: false }
					}
				}
			: { config: { broadcast: { self: false } } }
	);

	if (broadcastCapable) {
		channel
			.on('broadcast', { event: 'INSERT' }, async (payload) => {
				await handleBroadcastChange(
					'INSERT',
					payload as BroadcastChangePayload<DeviceRow>,
					broadcastContext
				);
			})
			.on('broadcast', { event: 'UPDATE' }, async (payload) => {
				await handleBroadcastChange(
					'UPDATE',
					payload as BroadcastChangePayload<DeviceRow>,
					broadcastContext
				);
			})
			.on('broadcast', { event: 'DELETE' }, async (payload) => {
				await handleBroadcastChange(
					'DELETE',
					payload as BroadcastChangePayload<DeviceRow>,
					broadcastContext
				);
			});
	} else {
		channel.on(
			'postgres_changes',
			{ event: '*', schema: 'public', table: 'cw_devices' },
			async (payload) => {
				await handlePostgresChange(
					payload as unknown as DevicePostgresChangePayload,
					broadcastContext
				);
			}
		);
	}

	channel.subscribe((status) => {
		if (status === 'CHANNEL_ERROR') {
			console.error('Device realtime channel failed to subscribe');
		}
	});

	return () => {
		void supabase.removeChannel(channel);
	};
}

async function handleBroadcastChange(
	op: 'INSERT' | 'UPDATE' | 'DELETE',
	payload: BroadcastChangePayload<DeviceRow>,
	context: BroadcastContext
) {
	const { client, appState, typeCache, locationCache } = context;
	const record = payload?.payload?.record ?? null;
	const previous = payload?.payload?.old_record ?? null;
	const target = (record ?? previous) as DeviceRow | null;
	if (op === 'DELETE') {
		const devEui = record?.dev_eui ?? previous?.dev_eui;
		if (devEui) {
			removeDeviceFromState(appState, devEui);
		}
		return;
	}
	if (!target?.dev_eui) return;
	await hydrateAndUpsertDevice(target, client, appState, typeCache, locationCache);
}

async function handlePostgresChange(
	payload: DevicePostgresChangePayload,
	context: BroadcastContext
) {
	await handleBroadcastChange(
		payload.eventType,
		{
			event: payload.eventType,
			payload: {
				record: payload.new ?? null,
				old_record: payload.old ?? null,
				table: 'cw_devices',
				operation: payload.eventType
			}
		},
		context
	);
}

export async function fetchDevicePage({
	limit = 50,
	cursor,
	locationId,
	session
}: {
	limit?: number;
	cursor?: string;
	locationId?: number;
	session?: AuthSession;
}) {
	const supabase = await createSupabaseClient(session);



	let query = supabase
		.from('cw_devices')
		.select(
			[
				'dev_eui',
				'name',
				'primary_data',
				'secondary_data',
				'upload_interval',
				'location_id',
				'last_data_updated_at',
				'installed_at',
				'type',
				'location:cw_locations(location_id,name,lat,long,owner_id,group)',
				'device_type:cw_device_type(primary_data_v2,secondary_data_v2,primary_data_notation,secondary_data_notation,default_upload_interval,data_table_v2,data_table,name,manufacturer,model)',
				'alerts:cw_rules(*)'
			].join(',')
		)
		.order('dev_eui', { ascending: true })
		.limit(limit + 1);

	if (cursor) {
		query = query.gt('dev_eui', cursor);
	}

	if (locationId !== undefined) {
		query = query.eq('location_id', locationId);
	}

	const { data, error } = await query;
	if (error) {
		throw error;
	}
	const deviceRows = (data ?? []) as unknown as DeviceJoined[];
	const pageItems = deviceRows.slice(0, limit);
	const nextCursor = deviceRows.length > limit ? (deviceRows[limit]?.dev_eui ?? null) : null;

	const devices = pageItems.map((row) => mapDevice(row as DeviceJoined));

	const alerts = pageItems.flatMap((row) => ((row as DeviceJoined).alerts ?? []).map(mapAlert));

	const locationsMap = new Map<string, Location>();
	const facilitiesMap = new Map<string, Facility>();

	for (const row of pageItems) {
		const loc = (row as DeviceJoined).location;
		if (loc) {
			const mappedLocation = mapLocation(loc);
			locationsMap.set(mappedLocation.id, mappedLocation);
			facilitiesMap.set(mappedLocation.facilityId, mapFacility(loc));
		}
	}

	return {
		devices,
		alerts,
		locations: Array.from(locationsMap.values()),
		facilities: Array.from(facilitiesMap.values()),
		nextCursor
	};
}

export async function loadInitialAppState(
	session?: AuthSession
): Promise<AppState & { nextCursor: string | null }> {
	const { devices, alerts, locations, facilities, nextCursor } = await fetchDevicePage({
		limit: 1000,
		session
	});
	return {
		devices,
		alerts,
		locations,
		facilities,
		nextCursor,
		isLoggedIn: !!session,
		profile: null,
		userEmail: null
	};
}

export async function fetchDataTableRows({
	tab,
	limit = 200,
	session
}: {
	tab: DataTabKey;
	limit?: number;
	session?: AuthSession;
}) {
	const supabase = await createSupabaseClient(session);
	const table = DATA_TABLE_MAP[tab];
	const { data: deviceRows, error: deviceError } = await supabase
		.from('cw_devices')
		.select('dev_eui,device_type:cw_device_type(data_table_v2,data_table)')
		.or(`data_table_v2.eq.${table},data_table.eq.${table}`, {
			foreignTable: 'device_type'
		});

	if (deviceError) throw deviceError;

	const devEuiSet = new Set(
		(deviceRows ?? [])
			.map((row) => row.dev_eui)
			.filter((devEui): devEui is string => typeof devEui === 'string' && devEui.length > 0)
	);
	const devEuis = Array.from(devEuiSet);

	if (!devEuis.length) return [] as DataTableRow[];

	const rowLimit = Math.max(limit, devEuis.length);
	const { data, error } = await supabase
		.from(table)
		.select('*')
		.in('dev_eui', devEuis)
		.order('created_at', { ascending: false, nullsFirst: false })
		.limit(rowLimit);

	if (error) throw error;
	const latestByDevice = new Map<string, DataTableRow>();
	for (const row of (data ?? []) as DataTableRow[]) {
		if (!row?.dev_eui || latestByDevice.has(row.dev_eui)) continue;
		latestByDevice.set(row.dev_eui, row);
	}
	return Array.from(latestByDevice.values());
}

export type DeviceHistoryPoint = {
	timestamp: string;
	primary: number | null;
	secondary: number | null;
	co2?: number | null;
	battery?: number | null;
	raw: Record<string, unknown>;
};

type HistoryRow = Record<string, unknown>;

const toFiniteNumber = (value: unknown) => {
	const num = Number(value);
	return Number.isFinite(num) ? num : null;
};

const getHistoryTimestamp = (row: HistoryRow) =>
	(typeof row.created_at === 'string' && row.created_at) ||
	(typeof row.timestamp === 'string' && row.timestamp) ||
	'';

const getCo2Key = (primaryKey?: string | null, secondaryKey?: string | null) => {
	if (primaryKey && primaryKey.toLowerCase().includes('co2')) return primaryKey;
	if (secondaryKey && secondaryKey.toLowerCase().includes('co2')) return secondaryKey;
	return 'co2';
};

const findCo2Value = (row: HistoryRow, co2Key: string) => {
	const co2Value = Number(row[co2Key] ?? null);
	const fallbackCo2 =
		co2Value && Number.isFinite(co2Value)
			? co2Value
			: (() => {
					const foundKey = Object.keys(row).find((k) => k.toLowerCase().includes('co2'));
					if (!foundKey) return null;
					const val = Number(row[foundKey]);
					return Number.isFinite(val) ? val : null;
				})();

	const resolved = co2Value ?? fallbackCo2;
	return Number.isFinite(resolved) ? resolved : null;
};

const mapHistoryRow = (
	row: HistoryRow,
	primaryKey: string | null | undefined,
	secondaryKey: string | null | undefined,
	co2Key: string
): DeviceHistoryPoint => {
	const primary = primaryKey ? toFiniteNumber(row[primaryKey] ?? null) : null;
	const secondary = secondaryKey ? toFiniteNumber(row[secondaryKey] ?? null) : null;
	const battery = 'battery_level' in row ? toFiniteNumber(row['battery_level']) : null;

	return {
		timestamp: getHistoryTimestamp(row),
		primary,
		secondary,
		co2: findCo2Value(row, co2Key),
		battery,
		raw: row
	};
};

/**
 * Fetch historic data for a device based on its device_type.data_table_v2 definition.
 * This is intentionally client-friendly (uses publishable key) and limits rows to avoid heavy pulls.
 */
export async function fetchDeviceHistory({
	devEui,
	limit = 500,
	hoursBack = 24,
	start,
	end,
	session
}: {
	devEui: string;
	limit?: number;
	hoursBack?: number;
	start?: Date;
	end?: Date;
	session?: AuthSession;
}) {
	const supabase = await createSupabaseClient(session);

	const { data: deviceRow, error: deviceError } = await supabase
		.from('cw_devices')
		.select(
			'dev_eui,type,device_type:cw_device_type(data_table_v2,primary_data_v2,secondary_data_v2)'
		)
		.eq('dev_eui', devEui)
		.maybeSingle();

	if (deviceError) throw deviceError;
	const deviceType = deviceRow?.device_type;
	const rawTable = deviceType?.data_table_v2;
	if (!deviceType || !rawTable || !isDataTableName(rawTable)) {
		return { points: [] as DeviceHistoryPoint[], meta: null as unknown as Record<string, unknown> };
	}

	const table: DataTableName = rawTable;
	const primaryKey = deviceType.primary_data_v2;
	const secondaryKey = deviceType.secondary_data_v2;
	const co2Key = getCo2Key(primaryKey, secondaryKey);
	const validStart = start instanceof Date && Number.isFinite(start.getTime()) ? start : null;
	const validEnd = end instanceof Date && Number.isFinite(end.getTime()) ? end : null;
	const normalizedStart =
		validStart && validEnd && validStart.getTime() > validEnd.getTime() ? validEnd : validStart;
	const normalizedEnd =
		validStart && validEnd && validStart.getTime() > validEnd.getTime() ? validStart : validEnd;
	const sinceIso =
		normalizedStart?.toISOString() ??
		(hoursBack ? new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString() : null);
	const untilIso = normalizedEnd?.toISOString() ?? null;

	let query = supabase
		.from(table)
		.select('*')
		.eq('dev_eui', devEui)
		.order('created_at', { ascending: false, nullsFirst: false });

	if (sinceIso) {
		query = query.gte('created_at', sinceIso);
	}

	if (untilIso) {
		query = query.lte('created_at', untilIso);
	}

	if (limit) {
		query = query.limit(limit);
	}

	const { data: rows, error: historyError } = await query;

	if (historyError) throw historyError;

	const points: DeviceHistoryPoint[] =
		rows?.map((row: HistoryRow) => mapHistoryRow(row, primaryKey, secondaryKey, co2Key)) ?? [];

	return {
		points,
		meta: {
			table,
			primaryKey,
			secondaryKey
		}
	};
}
