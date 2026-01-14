import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

type GatewayRecord = {
	id: number;
	gateway_id: string;
	gateway_name: string;
	is_online: boolean;
	is_public: boolean;
	created_at: string;
	updated_at: string | null;
};

type GatewayConnection = {
	gateway_id: string;
	gateway_name: string;
	rssi: number | null;
	snr: number | null;
	last_update: string;
};

type DeviceInfo = {
	dev_eui: string;
	name: string | null;
	location_id: number | null;
	location_name?: string | null;
	gateways: GatewayConnection[];
};

type GatewayWithDevices = GatewayRecord & {
	devices: DeviceInfo[];
	device_count: number;
	access_via?: 'owner' | 'public';
};

export const load: PageServerLoad = async ({ locals }) => {
	const { session } = await locals.safeGetSession();

	if (!session) {
		throw redirect(303, '/auth');
	}

	const { supabase } = locals;

	const { data: ownedAccess, error: ownedError } = await supabase
		.from('cw_gateways_owners')
		.select(
			`
			gateway:cw_gateways (
				id,
				gateway_id,
				gateway_name,
				is_online,
				is_public,
				created_at,
				updated_at
			)
		`
		)
		.eq('user_id', session.user.id);

	if (ownedError) {
		console.error('Error fetching owned gateways', ownedError);
	}

	const { data: publicGateways, error: publicError } = await supabase
		.from('cw_gateways')
		.select('id, gateway_id, gateway_name, is_online, is_public, created_at, updated_at')
		.eq('is_public', true);

	if (publicError) {
		console.error('Error fetching public gateways', publicError);
	}

	const gatewayMap = new Map<string, GatewayWithDevices>();

	(ownedAccess ?? []).forEach((row) => {
		const gatewayData = Array.isArray(row.gateway) ? row.gateway[0] : row.gateway;
		if (gatewayData) {
			gatewayMap.set(gatewayData.gateway_id, { ...gatewayData, devices: [], device_count: 0, access_via: 'owner' });
		}
	});

	(publicGateways ?? []).forEach((gateway) => {
		if (!gatewayMap.has(gateway.gateway_id)) {
			gatewayMap.set(gateway.gateway_id, { ...gateway, devices: [], device_count: 0, access_via: 'public' });
		}
	});

	const gateways = Array.from(gatewayMap.values());
	const gatewayIds = gateways.map((g) => g.gateway_id);

	if (gatewayIds.length > 0) {
		const { data: deviceLinks, error: deviceError } = await supabase
			.from('cw_device_gateway')
			.select(
				`
				gateway_id,
				rssi,
				snr,
				last_update,
				device:cw_devices (
					dev_eui,
					name,
					location_id,
					location:cw_locations (
						name
					)
				)
			`
			)
			.in('gateway_id', gatewayIds);

		if (deviceError) {
			console.error('Error fetching gateway devices', deviceError);
		}

		// Group devices by gateway, preserving connection info
		const grouped = (deviceLinks ?? []).reduce(
			(acc, link) => {
				const key = link.gateway_id;
				const deviceData = Array.isArray(link.device) ? link.device[0] : link.device;
				if (!acc[key]) acc[key] = [];
				if (deviceData) {
					const gateway = gateways.find((g) => g.gateway_id === key);
					const locationData = Array.isArray(deviceData.location) ? deviceData.location[0] : deviceData.location;
					acc[key].push({
						dev_eui: deviceData.dev_eui,
						name: deviceData.name,
						location_id: deviceData.location_id,
						location_name: locationData?.name ?? null,
						gateways: [{
							gateway_id: key,
							gateway_name: gateway?.gateway_name ?? key,
							rssi: link.rssi,
							snr: link.snr,
							last_update: link.last_update
						}]
					});
				}
				return acc;
			},
			{} as Record<string, DeviceInfo[]>
		);

		gateways.forEach((gw) => {
			const list = grouped[gw.gateway_id] ?? [];
			gw.devices = list;
			gw.device_count = list.length;
		});
	}

	// Sort newest first
	gateways.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

	return {
		session,
		gateways
	};
};
