import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { DeviceDataService } from '$lib/services/DeviceDataService';
import { DateTime } from 'luxon';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import PDFDocument from 'pdfkit';
import { createPDFDataTable } from '$lib/pdf/pdfDataTable';
import fs from 'fs';
import path from 'path';
import { createPDFLineChart } from '$lib/pdf/pdfLineChart';
import { addFooterPageNumber } from '$lib/pdf/pdfFooterPageNumber';

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
export const GET: RequestHandler = async ({ params, url, request, locals: { supabase } }) => {
	const { devEui } = params;

	try {
		// const supabase = await validateAuth(request);
		if (!supabase || supabase === null) {
			return json({ error: 'Unauthorized access' }, { status: 401 });
		}
		let { data: userData, error: userError } = await supabase.auth.getUser();
		if (userError || !userData) {
			console.error('Failed to get user from JWT:', userError?.message);
			return json(
				{ error: `Unauthorized access - ${userError?.message}` },
				{ status: userError?.status }
			);
		}
		let user = userData.user;
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

		// Get device data using JWT-authenticated client (same method as browser version)
		const deviceDataService = new DeviceDataService(supabase);
		let deviceData: any[] = [];
		let reportInfo: any = {};

		try {
			const deviceDataResponse = await deviceDataService.getDeviceDataForReport(
				devEui,
				startDate,
				endDate,
				'Asia/Tokyo',
				30 // Default interval in minutes
			);
			if (deviceDataResponse && deviceDataResponse.length > 0) {
				deviceData = deviceDataResponse;

				// Get alert points for the device
				const alertPoints = await deviceDataService.getAlertPointsForDevice(devEui);

				// Create proper report info structure
				reportInfo = {
					dev_eui: devEui,
					alert_points: alertPoints
				};
			} else {
				throw new Error(
					`No device data found for ${devEui} in the specified date range: ${startDate.toISOString()} to ${endDate.toISOString()}`
				);
			}
		} catch (reportError) {
			//console.log('getDeviceDataForReport failed, continuing with empty data:', reportError instanceof Error ? reportError.message : 'Unknown error');
			deviceData = [];
		}

		if (!deviceData || deviceData.length === 0) {
			return json(
				{
					error: `No data found for device ${devEui} in the specified date range`,
					device: devEui,
					dateRange: { start: startDateParam, end: endDateParam },
					user: user?.email || 'Unknown user',
					suggestion: 'Try a different date range or check if the device has been sending data'
				},
				{ status: 404 }
			);
		}

		// Step 3: Sort the array by `created_at`
		deviceData.sort((a, b) => {
			const dateA = new Date(a.created_at).getTime();
			const dateB = new Date(b.created_at).getTime();
			return dateA - dateB; // Ascending
		});

		// Generate professional PDF using PDFKit (same as browser version)
		const doc: PDFDocument = new PDFDocument({
			size: 'A4',
			margin: 40,
			info: {
				Title: `Device ${devEui} Report`,
				Author: `CropWatch API`,
				Subject: `Data report for device ${devEui} from ${startDateParam} to ${endDateParam}`,
				Creator: 'CropWatch API'
			},
			bufferPages: true
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
					//console.log(`Loading Japanese font from: ${fontPath}`);
					doc.registerFont('NotoSansJP', fontPath);
					doc.font('NotoSansJP');
					fontLoaded = true;
					break;
				}
			} catch (e) {
				//console.log(`Could not load font from: ${fontPath}`);
			}
		}

		if (!fontLoaded) {
			//console.log('Using default font - Japanese characters may not display correctly');
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
			.text(`生成者: ${user?.email || 'Unknown user'}`, { align: 'left' })
			.text(`生成日時: ${DateTime.now().setZone('Asia/Tokyo').toFormat('yyyy-MM-dd HH:mm:ss')}`, {
				align: 'left'
			})
			.text(`総レコード数: ${deviceData.length}`, { align: 'left' });
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

		createPDFLineChart(doc, dataa, reportInfo.alert_points, {
			title: 'センサーデータトレンド',
			width: 600,
			height: 400,
			xAxisLabel: '時間',
			yAxisLabel: '測定値'
		});
		createPDFDataTable(doc, dataa, reportInfo);

		addFooterPageNumber(doc, devEui, startDateParam, endDateParam);

		// 5) finalize
		doc.end();

		// Get the PDF as a buffer (async operation)
		const chunks: Buffer[] = [];
		doc.on('data', (chunk: any) => chunks.push(Buffer.from(chunk)));

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

			doc.on('error', (err: any) => {
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
				user: 'Unknown user'
			},
			{ status: 500 }
		);
	}
};

// const validateAuth = async (request: Request): Promise<SupabaseClient> => {
// 	const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
// 	const jwt = authHeader?.replace(/^Bearer\s+/i, '').trim();
// 	if (!jwt) {
// 		throw error(401, 'Unauthorized access: No JWT token provided');
// 	}
// 	const jwtSupabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
// 		global: {
// 			headers: { Authorization: `Bearer ${jwt}` }
// 		},
// 		auth: { persistSession: false }
// 	});
// 	return jwtSupabase;
// };
