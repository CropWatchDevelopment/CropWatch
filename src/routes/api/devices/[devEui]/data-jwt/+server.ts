import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { DeviceDataService } from '$lib/services/DeviceDataService';
import { DateTime } from 'luxon';
import type { DeviceDataRecord } from '$lib/models/DeviceDataRecord';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

/**
 * JWT-specific endpoint for device data retrieval
 * Optimized for external API access (Node-RED, automation tools, etc.)
 *
 * Usage:
 * GET /api/devices/{devEui}/data-jwt?start=2025-05-01&end=2025-06-06
 * Headers: Authorization: Bearer {jwt-token}
 *
 * Uses JWT-authenticated Supabase client to make RLS work properly with JWT tokens.
 */
export const GET: RequestHandler = async ({ params, url, request, locals: { supabase } }) => {
	const { devEui } = params;

	// Extract JWT token from Authorization header
	const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
	const jwt = authHeader?.replace(/^Bearer\s+/i, '').trim();

	if (!jwt) {
		console.error('No JWT token provided for device data API');
		throw error(401, 'Authorization header with Bearer token is required');
	}

	// Create a new Supabase client with JWT context for RLS to work properly
	// This is the key fix - RLS needs the JWT in the client headers
	const jwtSupabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		global: {
			headers: { Authorization: `Bearer ${jwt}` }
		},
		auth: { persistSession: false }
	});

	// Validate JWT token and get user
	let user = null;
	try {
		console.log('Validating JWT token for device data access');
		const { data, error: authError } = await jwtSupabase.auth.getUser(jwt);

		if (authError || !data?.user) {
			console.error('Invalid JWT token:', authError?.message);
			throw error(401, 'Invalid or expired JWT token');
		}

		user = data.user;
		console.log(
			`JWT-authenticated device data request from user: ${user.email} for device: ${devEui}`
		);
		console.log('User ID from JWT:', user.id); // Confirm JWT identity

		// Check if user has permission to access this device using JWT client
		const { data: deviceOwnership, error: permissionError } = await jwtSupabase
			.from('cw_device_owners')
			.select('permission_level')
			.eq('dev_eui', devEui)
			.eq('user_id', user.id)
			.maybeSingle();

		if (permissionError) {
			console.error('Error checking device ownership:', permissionError);
			throw error(500, 'Failed to verify device permissions');
		}

		if (!deviceOwnership) {
			console.warn(`User ${user.email} does not have permission to access device ${devEui}`);
			throw error(403, 'You do not have permission to access this device');
		}

		console.log(
			`User ${user.email} has permission level ${deviceOwnership.permission_level} for device ${devEui}`
		);
	} catch (authErr) {
		console.error('JWT validation error:', authErr);
		throw error(401, 'Failed to validate JWT token');
	}

	try {
		// Get query parameters for date range
		const startDateParam = url.searchParams.get('start');
		const endDateParam = url.searchParams.get('end');

		if (!startDateParam || !endDateParam) {
			throw error(
				400,
				'Missing required parameters: Both start and end dates are required. Example: ?start=2025-05-01&end=2025-06-06'
			);
		}

		let startDate = new Date(startDateParam);
		let endDate = new Date(endDateParam);

		// Validate dates
		if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
			throw error(
				400,
				'Invalid date format: Dates must be in ISO format (YYYY-MM-DD). Example: ?start=2025-05-01&end=2025-06-06'
			);
		}

		// include the full day in the results
		startDate = DateTime.fromJSDate(startDate).startOf('day').toJSDate();
		endDate = DateTime.fromJSDate(endDate).endOf('day').toJSDate();

		console.log(
			`[JWT API] Fetching data for device ${devEui} from ${startDate.toISOString()} to ${endDate.toISOString()}`
		);

		let historicalData: DeviceDataRecord[] = [];

		try {
			// Use the JWT-authenticated Supabase client for all queries
			// This ensures RLS sees the correct user context
			console.log('Using JWT-authenticated Supabase client for data queries...');

			// First attempt: Use DeviceDataService with JWT-authenticated client
			const deviceDataService = new DeviceDataService(jwtSupabase, undefined, jwt);
			historicalData = await deviceDataService.getDeviceDataByDateRange(devEui, startDate, endDate);

			if (historicalData && historicalData.length > 0) {
				console.log(
					`[JWT API] DeviceDataService succeeded: Found ${historicalData.length} records`
				);
			} else {
				console.log('DeviceDataService returned no data, trying direct table queries...');

				// Second attempt: Direct table queries using JWT client
				// Try cw_air_data first (most common)
				const { data: airData, error: airError } = await jwtSupabase
					.from('cw_air_data')
					.select('*')
					.eq('dev_eui', devEui)
					.gte('created_at', startDate.toISOString())
					.lte('created_at', endDate.toISOString())
					.order('created_at', { ascending: false });

				if (airError) {
					console.error('Error querying cw_air_data:', airError);
				}

				if (airData && airData.length > 0) {
					historicalData = airData as DeviceDataRecord[];
					console.log(`[JWT API] Found ${airData.length} air data records`);
				} else {
					// Try cw_soil_data if no air data found
					const { data: soilData, error: soilError } = await jwtSupabase
						.from('cw_soil_data')
						.select('*')
						.eq('dev_eui', devEui)
						.gte('created_at', startDate.toISOString())
						.lte('created_at', endDate.toISOString())
						.order('created_at', { ascending: false });

					if (soilError) {
						console.error('Error querying cw_soil_data:', soilError);
					}

					if (soilData && soilData.length > 0) {
						historicalData = soilData as DeviceDataRecord[];
						console.log(`[JWT API] Found ${soilData.length} soil data records`);
					} else {
						console.log(
							`[JWT API] No data found in either air or soil tables for device ${devEui}`
						);
					}
				}
			}

			if (!historicalData || historicalData.length === 0) {
				console.warn(
					`[JWT API] No historical data found for device ${devEui} in the specified date range`
				);
				return json({
					success: false,
					message: 'No historical data found for the specified date range.',
					data: [],
					metadata: {
						device: devEui,
						user: user.email,
						dateRange: {
							start: startDate.toISOString(),
							end: endDate.toISOString()
						},
						requestedAt: new Date().toISOString()
					}
				});
			}

			console.log(`[JWT API] Found ${historicalData.length} records for device ${devEui}`);

			// Return structured response for API consumption
			return json({
				success: true,
				data: historicalData,
				metadata: {
					device: devEui,
					user: user.email,
					count: historicalData.length,
					dateRange: {
						start: startDate.toISOString(),
						end: endDate.toISOString()
					},
					requestedAt: new Date().toISOString()
				}
			});
		} catch (dataError) {
			console.error(`[JWT API] Error fetching historical data for device ${devEui}:`, dataError);

			const errorMessage =
				dataError instanceof Error ? dataError.message : 'Unknown error occurred';

			// Return detailed error information for API consumers
			if (errorMessage.includes('Date range too large')) {
				throw error(400, 'Date range too large: Please limit the date range to 3 months or less');
			}

			if (errorMessage.includes('timeout')) {
				throw error(408, 'Request timeout: Please try with a smaller date range or use pagination');
			}

			throw error(500, `Data retrieval failed for device ${devEui}: ${errorMessage}`);
		}
	} catch (err) {
		console.error(`[JWT API] Error in device data API for ${devEui}:`, err);

		// If it's already a SvelteKit error, re-throw it
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		if (err instanceof Error) {
			throw error(500, `Internal server error for device ${devEui}: ${err.message}`);
		} else {
			throw error(500, `Unknown error occurred for device ${devEui}`);
		}
	}
};
