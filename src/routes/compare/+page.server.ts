import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { session } = await locals.safeGetSession();

	if (!session) {
		throw redirect(303, '/auth');
	}

	const { supabase } = locals;

	// Get authenticated user for security
	const { data: { user }, error: userError } = await supabase.auth.getUser();
	if (userError || !user) {
		throw redirect(303, '/auth');
	}

	// Fetch all devices the user has access to via cw_device_owners
	const { data: deviceOwners, error: ownersError } = await supabase
		.from('cw_device_owners')
		.select(`
			dev_eui,
			permission_level,
			device:cw_devices (
				dev_eui,
				name,
				type,
				upload_interval,
				last_data_updated_at,
				device_type:cw_device_type (
					id,
					name
				)
			)
		`)
		.eq('user_id', user.id);

	if (ownersError) {
		console.error('Error fetching device owners:', ownersError);
		return {
			devices: [],
			deviceTypes: []
		};
	}

	// Get unique dev_euis for fetching related data (user may have duplicate ownership records)
	const devEuis = [...new Set((deviceOwners || []).map((d) => d.dev_eui))];

	if (devEuis.length === 0) {
		return {
			devices: [],
			deviceTypes: []
		};
	}

	// Fetch latest air data for each device - fetch individually to avoid timeout
	// This is more efficient than fetching all records and filtering
	const latestAirData = new Map<string, {
		dev_eui: string;
		created_at: string | null;
		temperature_c: number | null;
		humidity: number | null;
		co2: number | null;
		battery_level: number | null;
	}>();

	// Fetch latest record for each device in parallel
	const airDataPromises = devEuis.map(async (devEui) => {
		const { data, error } = await supabase
			.from('cw_air_data')
			.select('dev_eui, created_at, temperature_c, humidity, co2, battery_level')
			.eq('dev_eui', devEui)
			.order('created_at', { ascending: false })
			.limit(1)
			.maybeSingle();

		if (error) {
			console.error(`Error fetching air data for ${devEui}:`, error);
			return null;
		}
		return data;
	});

	const airDataResults = await Promise.all(airDataPromises);
	airDataResults.forEach((row) => {
		if (row) {
			latestAirData.set(row.dev_eui, row);
		}
	});

	// Fetch gateway connections
	const { data: gatewayData, error: gatewayError } = await supabase
		.from('cw_device_gateway')
		.select('dev_eui, gateway_id, rssi, snr, last_update')
		.in('dev_eui', devEuis);

	if (gatewayError) {
		console.error('Error fetching gateway data:', gatewayError);
	}

	// Group gateways by dev_eui
	const gatewaysByDevice = new Map<string, typeof gatewayData>();
	(gatewayData || []).forEach((row) => {
		const existing = gatewaysByDevice.get(row.dev_eui) || [];
		existing.push(row);
		gatewaysByDevice.set(row.dev_eui, existing);
	});

	// Transform the data to match the interface - deduplicate by dev_eui
	const seenDevEuis = new Set<string>();
	const transformedDevices = (deviceOwners || [])
		.filter((owner) => owner.device) // Filter out orphaned owners
		.filter((owner) => {
			// Deduplicate by dev_eui
			if (seenDevEuis.has(owner.dev_eui)) return false;
			seenDevEuis.add(owner.dev_eui);
			return true;
		})
		.map((owner) => {
			const device = Array.isArray(owner.device) ? owner.device[0] : owner.device;
			if (!device) return null;

			const deviceType = Array.isArray(device.device_type) 
				? device.device_type[0] 
				: device.device_type;
			
			const latestData = latestAirData.get(device.dev_eui);
			const gateways = gatewaysByDevice.get(device.dev_eui) || [];
			const gatewayCount = gateways.length;
			const strongestSignal = gateways.reduce((max, g) => 
				(g.rssi && g.rssi > max ? g.rssi : max), -999);
			
			// Determine status based on last data
			let status: 'online' | 'warning' | 'offline' = 'offline';
			const lastUpdate = latestData?.created_at || device.last_data_updated_at;
			if (lastUpdate) {
				const lastSeen = new Date(lastUpdate);
				const now = new Date();
				const hoursDiff = (now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60);
				if (hoursDiff < 1) status = 'online';
				else if (hoursDiff < 24) status = 'warning';
			}

			return {
				id: device.dev_eui,
				name: device.name || device.dev_eui,
				type: deviceType?.name || 'Unknown',
				typeId: device.type,
				temperatureC: latestData?.temperature_c || 0,
				humidity: latestData?.humidity || 0,
				co2: latestData?.co2 || 0,
				battery: latestData?.battery_level || 0,
				lastSeen: lastUpdate ? new Date(lastUpdate) : new Date(0),
				status,
				gatewayCount,
				strongestSignal: strongestSignal > -999 ? strongestSignal : null,
				gateways: gateways.map((g) => ({
					id: g.gateway_id,
					rssi: g.rssi,
					snr: g.snr,
					lastUpdate: g.last_update ? new Date(g.last_update) : null
				}))
			};
		})
		.filter(Boolean);

	// Get unique device types
	const deviceTypes = [...new Set(transformedDevices.map((d) => d?.type))].filter(Boolean) as string[];

	return {
		devices: transformedDevices,
		deviceTypes
	};
};
