import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Get historical data for a specific device.
 * Query params:
 * - start: ISO date string for start of range
 * - end: ISO date string for end of range
 * - metric: 'temperature' | 'humidity' | 'co2' (defaults to temperature)
 * - limit: max number of points to return (defaults to 1000)
 */
export const GET: RequestHandler = async ({ params, url, locals }) => {
	// Verify authentication
	const { session } = await locals.safeGetSession();
	if (!session) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	const supabase = locals.supabase;

	// Get authenticated user for security
	const { data: { user }, error: userError } = await supabase.auth.getUser();
	if (userError || !user) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	const devEui = params.dev_eui;

	// Validate input
	if (!devEui || typeof devEui !== 'string') {
		return json({ success: false, error: 'Device EUI is required' }, { status: 400 });
	}

	// Parse query parameters
	const startParam = url.searchParams.get('start');
	const endParam = url.searchParams.get('end');
	const metric = url.searchParams.get('metric') || 'temperature';
	const limit = Math.min(parseInt(url.searchParams.get('limit') || '1000', 10), 5000);

	// Default to last 7 days if no dates provided
	const end = endParam ? new Date(endParam) : new Date();
	const start = startParam ? new Date(startParam) : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

	// Validate dates
	if (isNaN(start.getTime()) || isNaN(end.getTime())) {
		return json({ success: false, error: 'Invalid date range' }, { status: 400 });
	}

	// Validate metric
	const validMetrics = ['temperature', 'humidity', 'co2'];
	if (!validMetrics.includes(metric)) {
		return json({ success: false, error: 'Invalid metric' }, { status: 400 });
	}

	try {
		// First verify user has access to this device
		const { data: ownership, error: ownershipError } = await supabase
			.from('cw_device_owners')
			.select('dev_eui')
			.eq('dev_eui', devEui)
			.eq('user_id', user.id)
			.maybeSingle();

		if (ownershipError) {
			console.error('Error checking device ownership:', ownershipError);
			return json({ success: false, error: 'Failed to verify device access' }, { status: 500 });
		}

		if (!ownership) {
			return json({ success: false, error: 'Device not found or access denied' }, { status: 404 });
		}

		// Map metric to database column
		const columnMap: Record<string, string> = {
			temperature: 'temperature_c',
			humidity: 'humidity',
			co2: 'co2'
		};
		const column = columnMap[metric];

		// Fetch historical data from cw_air_data
		const { data: history, error: historyError } = await supabase
			.from('cw_air_data')
			.select(`created_at, ${column}`)
			.eq('dev_eui', devEui)
			.gte('created_at', start.toISOString())
			.lte('created_at', end.toISOString())
			.order('created_at', { ascending: true })
			.limit(limit);

		if (historyError) {
			console.error('Error fetching device history:', historyError);
			return json({ success: false, error: 'Failed to fetch history' }, { status: 500 });
		}

		// Transform to response format
		const points = (history || [])
			.filter((row) => row[column] !== null)
			.map((row) => ({
				timestamp: row.created_at,
				value: row[column]
			}));

		return json({
			success: true,
			devEui,
			metric,
			start: start.toISOString(),
			end: end.toISOString(),
			points,
			count: points.length
		});

	} catch (error) {
		console.error('Error fetching device history:', error);
		return json({ 
			success: false, 
			error: 'An unexpected error occurred.' 
		}, { status: 500 });
	}
};
