import type { PageServerLoad } from './$types';
import { fetchDeviceHistory } from '$lib/data/SourceOfTruth.svelte';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const { session } = await locals.safeGetSession?.();
	const tokens = session
		? { access_token: session.access_token, refresh_token: session.refresh_token }
		: undefined;

	const { data: deviceInfo, error: deviceInfoError } = await locals.supabase
		.from('cw_devices')
		.select('dev_eui, type, device_type:cw_device_type(name, manufacturer, model)')
		.eq('dev_eui', params.dev_eui)
		.maybeSingle();

	if (deviceInfoError) {
		console.error('Error fetching device type:', deviceInfoError);
	}

	const { points } = await fetchDeviceHistory({
		devEui: params.dev_eui,
		limit: 2000,
		hoursBack: 24,
		session: tokens
	});

	const trafficStartParam = url.searchParams.get('trafficStart');
	const trafficEndParam = url.searchParams.get('trafficEnd');
	const trafficStart = trafficStartParam ? new Date(trafficStartParam) : null;
	const trafficEnd = trafficEndParam ? new Date(trafficEndParam) : null;
	const hasTrafficRange =
		trafficStart &&
		trafficEnd &&
		Number.isFinite(trafficStart.getTime()) &&
		Number.isFinite(trafficEnd.getTime());

	const end = hasTrafficRange ? trafficEnd : new Date();
	const start = hasTrafficRange ? trafficStart : new Date(end);
	if (!hasTrafficRange) {
		start.setUTCDate(end.getUTCDate() - 30);
	}

	const trafficQuery = locals.supabase
		.from('cw_traffic2')
		.select(
			'dev_eui, created_at, traffic_hour, line_number, people_count, bicycle_count, car_count, truck_count, bus_count'
		)
		.eq('dev_eui', params.dev_eui)
		.gte('created_at', start.toISOString())
		.lte('created_at', end.toISOString())
		.order('created_at', { ascending: true });

	const { data: trafficRows, error: trafficError } = await trafficQuery;

	if (trafficError) {
		console.error('Error fetching traffic data:', trafficError);
	}

	// if (deviceError || !device) {
	// 	console.error('Error fetching device:', deviceError);
	// 	throw new Error('Device not found');
	// }

	return {
		initialHistory: points ? points?.map((p) => ({
			timestamp: p.timestamp,
			primary: p.primary,
			secondary: p.secondary
		})) : [],
		deviceType: deviceInfo?.device_type ?? null,
		trafficRows: trafficRows ?? []
	};
};
