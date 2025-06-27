import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { DeviceDataService } from '$lib/services/DeviceDataService';
import { DateTime } from 'luxon';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import PDFDocument from 'pdfkit';
import { createPDFDataTable } from '$lib/pdf/pdfDataTable';
import fs from 'fs';
import path from 'path';

/**
 * JWT-authenticated PDF generation endpoint for device data reports
 * Designed for server-to-server calls (Node-RED, automation tools, etc.)
 *
 * Usage:
 * GET /api/devices/{devEui}/data-jwt-pdf?start=2025-05-01&end=2025-06-06
 * Headers: Authorization: Bearer {jwt-token}
 *
 * Returns: PDF file as binary response
 */
export const GET: RequestHandler = async ({ params, url, request }) => {
	const { devEui } = params;

	// Extract JWT token from Authorization header
	const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
	const jwt = authHeader?.replace(/^Bearer\s+/i, '').trim();

	if (!jwt) {
		console.error('No JWT token provided for PDF generation API');
		return json({ error: 'Authorization header with Bearer token is required' }, { status: 401 });
	}

	// Create a new Supabase client with JWT context for RLS to work properly
	const jwtSupabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		global: {
			headers: { Authorization: `Bearer ${jwt}` }
		},
		auth: { persistSession: false }
	});

	// Validate JWT token and get user
	let user = null;
	try {
		console.log('Validating JWT token for PDF generation');
		const { data, error: authError } = await jwtSupabase.auth.getUser(jwt);

		if (authError || !data?.user) {
			console.error('Invalid JWT token:', authError?.message);
			return json({ error: 'Invalid or expired JWT token' }, { status: 401 });
		}

		user = data.user;
		console.log(
			`JWT-authenticated PDF generation request from user: ${user.email} for device: ${devEui}`
		);

		// Check if user has permission to access this device
		const { data: deviceOwnership, error: permissionError } = await jwtSupabase
			.from('cw_device_owners')
			.select('permission_level')
			.eq('dev_eui', devEui)
			.eq('user_id', user.id)
			.maybeSingle();

		if (permissionError) {
			console.error('Error checking device ownership:', permissionError);
			return json({ error: 'Failed to verify device permissions' }, { status: 500 });
		}

		if (!deviceOwnership) {
			console.warn(`User ${user.email} does not have permission to access device ${devEui}`);
			return json({ error: 'You do not have permission to access this device' }, { status: 403 });
		}

		console.log(
			`User ${user.email} has permission level ${deviceOwnership.permission_level} for device ${devEui}`
		);
	} catch (authErr) {
		console.error('JWT validation error:', authErr);
		return json({ error: 'Failed to validate JWT token' }, { status: 401 });
	}

	try {
		// Get query parameters for date range
		const startDateParam = url.searchParams.get('start');
		const endDateParam = url.searchParams.get('end');

		if (!startDateParam || !endDateParam) {
			return json(
				{
					error: 'Missing required parameters: Both start and end dates are required',
					example: '?start=2025-05-01&end=2025-06-06'
				},
				{ status: 400 }
			);
		}

		let startDate = new Date(startDateParam);
		let endDate = new Date(endDateParam);

		// Validate dates
		if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
			return json(
				{
					error: 'Invalid date format: Dates must be in ISO format (YYYY-MM-DD)',
					example: '?start=2025-05-01&end=2025-06-06'
				},
				{ status: 400 }
			);
		}

		// Convert dates to Japan timezone and include full day
		const tokyoStartDate = DateTime.fromJSDate(startDate).setZone('Asia/Tokyo').startOf('day');
		const tokyoEndDate = DateTime.fromJSDate(endDate).setZone('Asia/Tokyo').endOf('day');

		// Convert back to UTC for database queries
		startDate = tokyoStartDate.toUTC().toJSDate();
		endDate = tokyoEndDate.toUTC().toJSDate();

		console.log(
			`Tokyo date range: ${tokyoStartDate.toFormat('yyyy-MM-dd HH:mm')} to ${tokyoEndDate.toFormat('yyyy-MM-dd HH:mm')}`
		);
		console.log(`UTC date range for DB: ${startDate.toISOString()} to ${endDate.toISOString()}`);

		console.log(
			`[JWT PDF API] Generating PDF report for device ${devEui} from ${startDate.toISOString()} to ${endDate.toISOString()}`
		);

		// Get device data using JWT-authenticated client (same method as browser version)
		const deviceDataService = new DeviceDataService(jwtSupabase);
		let deviceData: any[] = [];

		try {
			console.log('Using simple date range query (avoiding column errors)...');

			// Use simple date range query to avoid column-specific errors
			deviceData = await deviceDataService.getDeviceDataByDateRange(devEui, startDate, endDate);

			console.log(`Raw data count: ${deviceData?.length || 0}`);

			// If no data, try getDeviceDataForReport as fallback (but handle errors)
			if (!deviceData || deviceData.length === 0) {
				console.log('No data from simple query, trying getDeviceDataForReport...');

				try {
					deviceData = await deviceDataService.getDeviceDataForReport(
						devEui,
						startDate,
						endDate,
						30, // interval in minutes - sample every 30 minutes
						'temperature_c', // target column for filtering
						'>', // comparison operator
						-20 // minimum temperature threshold (filters out invalid readings)
					);
				} catch (reportError) {
					console.log(
						'getDeviceDataForReport failed, continuing with empty data:',
						reportError instanceof Error ? reportError.message : 'Unknown error'
					);
					deviceData = [];
				}
			}

			if (!deviceData || deviceData.length === 0) {
				return json(
					{
						error: `No data found for device ${devEui} in the specified date range`,
						device: devEui,
						dateRange: { start: startDateParam, end: endDateParam },
						user: user.email,
						suggestion: 'Try a different date range or check if the device has been sending data'
					},
					{ status: 404 }
				);
			}

			console.log(
				`Found ${deviceData.length} records for PDF generation using professional method`
			);

			// Sort data chronologically (oldest first) to ensure proper date order in PDF
			deviceData.sort((a, b) => {
				const dateA = new Date(a.created_at).getTime();
				const dateB = new Date(b.created_at).getTime();
				return dateA - dateB; // Ascending order (oldest first)
			});

			console.log(
				`Data sorted chronologically from ${deviceData[0]?.created_at} to ${deviceData[deviceData.length - 1]?.created_at}`
			);
		} catch (dataError) {
			console.error('Error fetching device data:', dataError);
			return json(
				{
					error: 'Failed to fetch device data',
					details: dataError instanceof Error ? dataError.message : 'Unknown error'
				},
				{ status: 500 }
			);
		}

		// Generate professional PDF using PDFKit (same as browser version)
		const doc = new PDFDocument({
			size: 'A4',
			margin: 40,
			info: {
				Title: `Device ${devEui} Report`,
				Author: `CropWatch - ${user.email}`,
				Subject: `Data report for device ${devEui} from ${startDateParam} to ${endDateParam}`,
				Creator: 'CropWatch API'
			}
		});

		// Define possible font paths for NotoSansJP (Japanese font support)
		const possibleFontPaths = [
			path.join(process.cwd(), 'static/fonts/NotoSansJP-Regular.ttf'),
			path.join(process.cwd(), 'src/lib/fonts/NotoSansJP-Regular.ttf'),
			path.join(process.cwd(), 'server/fonts/NotoSansJP-Regular.ttf'),
			'static/fonts/NotoSansJP-Regular.ttf'
		];

		// Try to load Japanese font
		let fontLoaded = false;
		for (const fontPath of possibleFontPaths) {
			try {
				if (fs.existsSync(fontPath)) {
					console.log(`Loading Japanese font from: ${fontPath}`);
					doc.registerFont('NotoSansJP', fontPath);
					doc.font('NotoSansJP');
					fontLoaded = true;
					break;
				}
			} catch (e) {
				console.log(`Could not load font from: ${fontPath}`);
			}
		}

		if (!fontLoaded) {
			console.log('Using default font - Japanese characters may not display correctly');
		}

		// Professional header with Japanese styling
		doc.fontSize(24).text(`デバイスレポート: ${devEui}`, {
			align: 'center'
		});

		doc.moveDown();

		// Report metadata
		doc
			.fontSize(12)
			.text(`期間: ${startDateParam} ～ ${endDateParam}`, { align: 'left' })
			.text(`生成者: ${user.email}`, { align: 'left' })
			.text(`生成日時: ${DateTime.now().setZone('Asia/Tokyo').toFormat('yyyy-MM-dd HH:mm:ss')}`, {
				align: 'left'
			})
			.text(`総レコード数: ${deviceData.length}`, { align: 'left' });

		doc.moveDown();
		doc.fontSize(14).text('データテーブル', { align: 'left' });

		// Transform data for the professional table format (exactly like browser version)
		const dataa: { date: string; values: number[] }[] = [];

		// Process device data exactly like the browser version (temperature only)
		deviceData.forEach((data) => {
			const date = DateTime.fromISO(data.created_at)
				.setZone('Asia/Tokyo')
				.toFormat('yyyy-MM-dd HH:mm');

			// Only include temperature (single column like browser version)
			if (typeof data.temperature_c === 'number') {
				dataa.push({
					date,
					values: [data.temperature_c] // Single temperature value only
				});
			}
		});

		console.log(`Processed ${dataa.length} temperature records for PDF table`);

		// Create the professional data table (same as browser version)
		if (dataa.length > 0) {
			createPDFDataTable(doc, dataa);
		} else {
			doc.text('指定された期間にデータが見つかりませんでした。', { align: 'center' });
		}

		// Finalize the PDF
		doc.end();

		// Get the PDF as a buffer (async operation)
		const chunks: Buffer[] = [];
		doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));

		return new Promise<Response>((resolve, reject) => {
			doc.on('end', () => {
				const pdfBuffer = Buffer.concat(chunks);

				// Return the PDF with proper headers
				resolve(
					new Response(pdfBuffer, {
						status: 200,
						headers: {
							'Content-Type': 'application/pdf',
							'Content-Disposition': `attachment; filename="device-${devEui}-report-${startDateParam}-to-${endDateParam}.pdf"`,
							'Content-Length': pdfBuffer.length.toString(),
							'Access-Control-Allow-Origin': '*',
							'Access-Control-Allow-Methods': 'GET',
							'Access-Control-Allow-Headers': 'Content-Type, Authorization'
						}
					})
				);
			});

			doc.on('error', (err) => {
				reject(
					json(
						{
							error: 'Failed to generate PDF',
							details: err.message,
							device: devEui,
							user: user?.email || 'Unknown user'
						},
						{ status: 500 }
					)
				);
			});
		});
	} catch (err) {
		console.error(`Error generating PDF for device ${devEui}:`, err);
		return json(
			{
				error: 'Failed to generate PDF report',
				details: err instanceof Error ? err.message : 'Unknown error',
				device: devEui,
				user: user?.email || 'Unknown user'
			},
			{ status: 500 }
		);
	}
};
