import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';
import { i18n } from '$lib/i18n/index.svelte';
import type { DeviceDataRecord } from '$lib/models/DeviceDataRecord';
import type { ReportAlertPoint } from '$lib/models/Report';
import type { TableCell, TableRow } from '$lib/pdf';
import { createPDFDataTable } from '$lib/pdf/pdfDataTable';
import { addFooterPageNumber } from '$lib/pdf/pdfFooterPageNumber';
import { createPDFLineChart } from '$lib/pdf/pdfLineChart';
import { checkMatch, getValue } from '$lib/pdf/utils';
import { DeviceRepository } from '$lib/repositories/DeviceRepository';
import { LocationRepository } from '$lib/repositories/LocationRepository';
import { DeviceDataService } from '$lib/services/DeviceDataService';
import { DeviceService } from '$lib/services/DeviceService';
import { LocationService } from '$lib/services/LocationService';
import { formatNumber, getColorNameByKey, getNumericKeys } from '$lib/utilities/stats';
import { error, json } from '@sveltejs/kit';
import fs from 'fs';
import { DateTime } from 'luxon';
import path from 'path';
import PDFDocument from 'pdfkit';
import { _ } from 'svelte-i18n';
import { get } from 'svelte/store';
import type { RequestHandler } from './$types';

/**
 * JWT-authenticated PDF generation endpoint for device data reports
 * Designed for server-to-server calls (Node-RED, automation tools, etc.)
 *
 * Usage:
 * GET /api/devices/{devEui}/pdf?start=2025-05-01&end=2025-06-06
 * Headers: Authorization: Bearer {jwt-token}
 *
 * Returns: PDF file as binary response
 */
export const GET: RequestHandler = async ({ params, url, locals: { supabase } }) => {
	const { devEui } = params;

	try {
		// const supabase = await validateAuth(request);
		if (!supabase || supabase === null) {
			return json({ error: 'Unauthorized access' }, { status: 401 });
		}
		const { data: userData, error: userError } = await supabase.auth.getUser();
		if (userError || !userData) {
			console.error('Failed to get user from JWT:', userError?.message);
			return json(
				{ error: `Unauthorized access - ${userError?.message}` },
				{ status: userError?.status }
			);
		}
		const { user } = userData;

		if (!user) {
			throw error(404, 'Device not found');
		}

		const { data: userProfile } = await supabase
			.from('profiles')
			.select(`full_name, employer`)
			.eq('id', user.id)
			.single();

		const {
			start: startDateParam,
			end: endDateParam,
			dataKeys: dataKeysParam = '',
			alertPoints: alertPointsParam,
			locale: localeParam = 'ja'
		} = Object.fromEntries(url.searchParams);

		const selectedKeys = dataKeysParam
			.split(',')
			.map((key) => key.trim())
			.filter(Boolean);

		const requestedAlertPoints = (() => {
			try {
				const points = alertPointsParam ? JSON.parse(alertPointsParam) : [];

				if (!Array.isArray(points)) {
					throw new Error('alertPoints must be an array');
				}

				return points;
			} catch {
				return [];
			}
		})() as ReportAlertPoint[];

		// Determine if this is a report or a specific data request
		const isReport = !requestedAlertPoints.length;

		// Initialize i18n for localized strings
		await i18n.initialize({ initialLocale: localeParam });
		const $_ = get(_);

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
		let deviceData: DeviceDataRecord[] = [];
		let alertPoints: ReportAlertPoint[] = requestedAlertPoints;

		const errorHandler = new ErrorHandlingService();
		const deviceRepo = new DeviceRepository(supabase, errorHandler);
		const deviceService = new DeviceService(deviceRepo);
		const device = await deviceService.getDeviceWithTypeByEui(devEui);

		if (!device) {
			throw error(404, 'Device not found');
		}

		const locationId = device.location_id;

		if (!locationId) {
			throw error(400, 'Invalid location ID');
		}

		const locationRepo = new LocationRepository(supabase, errorHandler);
		const locationService = new LocationService(locationRepo, deviceRepo);
		const location = await locationService.getLocationById(locationId);

		if (!location) {
			throw error(404, 'Location not found');
		}

		try {
			const deviceDataResponse = isReport
				? await deviceDataService.getDeviceDataForReport({
						devEui,
						startDate,
						endDate,
						timezone: 'Asia/Tokyo',
						columns: requestedAlertPoints.map((point) => point.data_point_key as string),
						ops: requestedAlertPoints.map((point) => point.operator as string),
						mins: requestedAlertPoints.map((point) => (point.min ?? point.value) as number),
						maxs: requestedAlertPoints.map((point) => point.max ?? null),
						intervalMinutes: 30 // Default interval in minutes
					})
				: await deviceDataService.getDeviceDataByDateRange(devEui, startDate, endDate);

			if (deviceDataResponse && deviceDataResponse.length > 0) {
				deviceData = deviceDataResponse;

				// Get alert points for the device if no specific keys are selected
				if (!alertPoints.length) {
					alertPoints = await deviceDataService.getAlertPointsForDevice(devEui);
				}
			} else {
				throw new Error(
					`No device data found for ${devEui} in the specified date range: ${startDate.toISOString()} to ${endDate.toISOString()}`
				);
			}
		} catch {
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
		const doc = new PDFDocument({
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
			} catch {
				//console.log(`Could not load font from: ${fontPath}`);
			}
		}

		if (!fontLoaded) {
			//console.log('Using default font - Japanese characters may not display correctly');
		}

		// Professional header with Japanese styling
		doc.fontSize(16).text(`CropWatch ${$_('device_report')}`);
		doc.fontSize(10).moveDown();

		// Report metadata
		doc
			.text(
				`${$_('generated_at')}: ${DateTime.now().setZone('Asia/Tokyo').toFormat('yyyy-MM-dd HH:mm:ss')}`,
				{ width: 280 }
			)
			.text(`${$_('generated_by')}: ${userProfile?.full_name || user.email || $_('Unknown')}`, {
				width: 280
			})
			.text(`${$_('Company')}: ${userProfile?.employer || $_('Unknown')}`, { width: 280 })
			.text(`${$_('Device Type')}: ${device.cw_device_type?.name || $_('Unknown')}`, {
				width: 280
			})
			.text(`${$_('Device Name')}: ${device.name || $_('Unknown')}`, { width: 280 })
			.text(`${$_('EUI')}: ${devEui}`, { width: 280 })
			.text(`${$_('installed_at')}: ${location.name || $_('Unknown')}`, { width: 280 });

		// Date, signature section
		doc.rect(320, 40, 240, 40).stroke();
		doc.fontSize(10).text($_('date'), 325, 45);
		doc.rect(320, 85, 80, 100).stroke();
		doc.text($_('created'), 325, 90);
		doc.rect(400, 85, 80, 100).stroke();
		doc.text($_('verified'), 405, 90);
		doc.rect(480, 85, 80, 100).stroke();
		doc.text($_('approved'), 485, 90);
		doc.fontSize(12).text($_('comment'), 320, 200);

		doc
			.fontSize(10)
			.text(`${$_('date_range')}: ${startDateParam} – ${endDateParam}`, 40, 200)
			.text(`${$_('sampling_size')}: ${deviceData.length}`);

		doc.moveDown(4);

		const numericKeys = getNumericKeys(deviceData);
		const validKeys =
			isReport || !selectedKeys.length
				? numericKeys
				: numericKeys.filter((key) => selectedKeys.includes(key));

		const keyColumns: TableCell[] = validKeys.map((key) => ({
			label: $_(key),
			value: '',
			width: 40,
			color: getColorNameByKey(key)
		}));

		const dataHeader: TableRow = {
			header: { label: $_('datetime'), value: '', width: 60 },
			cells: [...keyColumns, { label: $_('comment'), width: 60 }]
		};

		const getDataRows = (keys: string[] = validKeys): TableRow[] =>
			deviceData.map((data) => ({
				header: {
					label: DateTime.fromISO(data.created_at)
						.setZone('Asia/Tokyo')
						.toFormat('yyyy-MM-dd HH:mm'),
					value: new Date(data.created_at)
				},
				cells: keys.map((key) => {
					const rawValue = data[key];
					const value = typeof rawValue === 'number' && !isNaN(rawValue) ? rawValue : 0;

					return {
						label:
							typeof rawValue === 'number' && !isNaN(rawValue)
								? formatNumber({ key, value, adjustFractionDigits: true })
								: '',
						value,
						bgColor:
							alertPoints.find((point) => point.data_point_key === key && checkMatch(value, point))
								?.hex_color ?? '#ffffff'
					};
				})
			}));

		// Chart
		for (const key of validKeys) {
			createPDFLineChart({
				doc,
				dataHeader: {
					header: { label: $_('datetime'), value: '', width: 60 },
					cells: [
						{
							label: $_(key),
							value: '',
							width: 40,
							color: getColorNameByKey(key)
						}
					]
				},
				dataRows: getDataRows([key]),
				alertPoints,
				config: {
					title: $_(key),
					width: 600,
					height: 300
				}
			});
		}

		doc.moveUp(2);

		// Prepare data rows for the table
		const dataRows = getDataRows();

		// Summary table
		createPDFDataTable({
			doc,
			config: {
				caption: $_('summary')
			},
			dataHeader: {
				header: { label: $_('status'), width: 60 },
				cells: [...keyColumns, { label: `${$_('comment')}:`, width: 60 }]
			},
			dataRows: [
				...alertPoints.map((alertPoint) => {
					const { data_point_key, name, hex_color } = alertPoint;

					return {
						header: { label: name, value: '' },
						cells: validKeys.map((key, index) => {
							if (key !== data_point_key) {
								return { label: '-', value: '' };
							}

							const valueList = dataRows.map((row) => row.cells[index].value as number);
							const count = valueList.filter((value) => checkMatch(value, alertPoint)).length;

							return {
								label:
									`${new Intl.NumberFormat(localeParam, { maximumFractionDigits: 2 }).format(count)} ` +
									`(${new Intl.NumberFormat(localeParam, { style: 'percent' }).format(count / valueList.length)})`,
								value: count,
								bgColor: hex_color || '#ffffff'
							};
						})
					};
				}),
				...['min', 'max', 'avg', 'stddev'].map((indicator) => ({
					header: { label: $_(indicator), value: '' },
					cells: validKeys.map((key, index) => {
						const valueList = dataRows.map((row) => row.cells[index].value as number);
						const value = getValue(valueList, indicator);

						return { label: formatNumber({ key, value }), value };
					})
				}))
			]
		});

		doc.addPage(); // Add Page break because the data table should always start on a new page.

		// Full data table
		createPDFDataTable({
			doc,
			config: {
				caption: $_('data_history')
			},
			dataHeader,
			dataRows
		});

		addFooterPageNumber(doc, `${device.name} | ${devEui} | ${startDateParam} - ${endDateParam}`);

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
