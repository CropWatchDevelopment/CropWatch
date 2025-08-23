import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';
import { i18n } from '$lib/i18n/index.svelte';
import type { DeviceDataRecord } from '$lib/models/DeviceDataRecord';
import type { ReportAlertPoint } from '$lib/models/Report';
import type { TableCell, TableRow } from '$lib/pdf';
import { createPDFDataTable } from '$lib/pdf/pdfDataTable';
import { addFooterPageNumber } from '$lib/pdf/pdfFooterPageNumber';
import { createPDFLineChartImage } from '$lib/pdf/pdfLineChartImage';
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

		// const requestedAlertPoints = (() => {
		// 	try {
		// 		const points = alertPointsParam ? JSON.parse(alertPointsParam) : [];

		// 		if (!Array.isArray(points)) {
		// 			throw new Error('alertPoints must be an array');
		// 		}

		// 		return points;
		// 	} catch {
		// 		return [];
		// 	}
		// })() as ReportAlertPoint[];
		// Pull alert points from the database if not provided
		const { data: reportParams, error } = await supabase
			.from('reports')
			.select('report_id, report_alert_points(*)')
			.eq('dev_eui', devEui)
			.limit(1) // This intruduces a bug where it will ignore multiple reports....
			.single();
		console.log('alertPointsParamData', reportParams);

		if (error) {
			console.error('Error fetching report parameters:', error.message);
			return json(
				{ error: `Failed to fetch report parameters - ${error.message}` },
				{ status: 404 }
			);
		}

		let requestedAlertPoints: ReportAlertPoint[] = [];
		for (const point of reportParams?.report_alert_points || []) {
			if (!point.data_point_key) {
				console.warn(`Alert point with ID ${point.id} has no data_point_key, skipping this point`);
				continue;
			}
			const pooint = {
				created_at: point.created_at,
				data_point_key: point.data_point_key,
				hex_color: point.hex_color || '#ffffff',
				id: point.id,
				max: point.max ?? null,
				min: point.min ?? null,
				name: point.name || point.data_point_key,
				operator: point.operator || 'eq',
				report_id: point.report_id,
				user_id: point.user_id,
				value: point.value ?? 0
			};
			requestedAlertPoints.push(pooint as ReportAlertPoint);
		}

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

		const {
			top: marginTop,
			right: marginRight,
			bottom: marginBottom,
			left: marginLeft
		} = doc.page.margins;

		const contentWidth = doc.page.width - marginLeft - marginRight;

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
				console.error(`Could not load font from: ${fontPath}`);
			}
		}

		if (!fontLoaded) {
			console.error('Using default font - Japanese characters may not display correctly');
		}

		// Professional header with Japanese styling
		doc.fontSize(16).text(`CropWatch ${$_('device_report')}`);

		// Signature section
		doc.fontSize(7).strokeColor('#ccc');
		doc.rect(400, marginTop, 50, 60).stroke();
		doc.rect(450, marginTop, 50, 60).stroke();
		doc.rect(500, marginTop, 50, 60).stroke();
		doc.text($_('created'), 405, 45);
		doc.text($_('verified'), 455, 45);
		doc.text($_('approved'), 505, 45);

		doc.x = marginLeft;
		doc.y = 70;

		const metaTextOptions = { width: 320 };

		// Report metadata
		doc
			.fontSize(8)
			.text(
				`${$_('generated_at')}: ${DateTime.now().setZone('Asia/Tokyo').toFormat('yyyy-MM-dd HH:mm:ss')}`,
				metaTextOptions
			)
			.text(
				`${$_('generated_by')}: ${userProfile?.full_name || user.email || $_('Unknown')}`,
				metaTextOptions
			);

		if (userProfile?.employer) {
			doc.text(`${$_('Company')}: ${userProfile?.employer || $_('Unknown')}`, metaTextOptions);
		}

		doc
			.moveDown(0.5)
			.text(`${$_('installed_at')}: ${location.name || $_('Unknown')}`, metaTextOptions)
			.text(
				`${$_('Device Type')}: ${device.cw_device_type?.name || $_('Unknown')}`,
				metaTextOptions
			)
			.text(`${$_('Device Name')}: ${device.name || $_('Unknown')}`, metaTextOptions)
			.text(`${$_('EUI')}: ${devEui}`, metaTextOptions);

		doc.moveUp(2);
		doc.x = 400;

		doc
			.text(`${$_('date_range')}: ${startDateParam} - ${endDateParam}`)
			.text(`${$_('sampling_size')}: ${deviceData.length}`);

		doc.x = marginLeft;
		doc.moveDown();

		const numericKeys = getNumericKeys(deviceData);
		const validKeys =
			isReport || !selectedKeys.length
				? numericKeys
				: numericKeys.filter((key) => selectedKeys.includes(key));

		// Only show columns in the final data table that participate in at least one alert
		const alertKeySet = new Set(alertPoints.map((p) => p.data_point_key));
		const alertKeys = validKeys.filter((k) => alertKeySet.has(k));
		const tableKeys = alertKeys.length ? alertKeys : validKeys; // fallback if no alerts

		const keyColumns: TableCell[] = validKeys.map((key) => ({
			label: $_(key),
			value: '',
			width: 30,
			color: getColorNameByKey(key)
		}));

		const dataHeader: TableRow = {
			header: { label: $_('datetime'), value: '', width: 40 },
			cells: [...keyColumns, { label: $_('comment'), width: 40 }]
		};

		const getDataRows = (keys: string[] = validKeys): TableRow[] =>
			deviceData.map((data, index) => {
				const date = DateTime.fromISO(data.created_at).setZone('Asia/Tokyo');
				const previousData = index > 0 ? deviceData[index - 1] : null;
				const previousDate = previousData
					? DateTime.fromISO(previousData.created_at).setZone('Asia/Tokyo')
					: null;
				const fullDateTime = date.toFormat('M/d H:mm');

				return {
					header: {
						value: new Date(data.created_at),
						label: fullDateTime,
						shortLabel:
							// If the date is the same as the previous entry, show only time
							previousDate?.toFormat('M/d') === date.toFormat('M/d')
								? date.toFormat('H:mm')
								: fullDateTime
					},
					cells: keys.map((key) => {
						const rawValue = data[key];
						const value = typeof rawValue === 'number' && !isNaN(rawValue) ? rawValue : 0;

						return {
							value,
							label:
								typeof rawValue === 'number' && !isNaN(rawValue)
									? formatNumber({ key, value, adjustFractionDigits: true })
									: '',
							bgColor:
								alertPoints.find(
									(point) => point.data_point_key === key && checkMatch(value, point)
								)?.hex_color ?? '#ffffff'
						};
					})
				} as TableRow;
			});

		// Prepare data rows for the table
		const dataRows = getDataRows();
		const tableKeyColumns: TableCell[] = tableKeys.map((key) => ({
			label: $_(key),
			value: '',
			width: 30,
			color: getColorNameByKey(key)
		}));
		const dataHeaderTable: TableRow = {
			header: { label: $_('datetime'), value: '', width: 40 },
			cells: [...tableKeyColumns, { label: $_('comment'), width: 40 }]
		};
		const dataRowsTable = getDataRows(tableKeys);

		// Summary table
		createPDFDataTable({
			doc,
			config: {
				caption: $_('summary')
			},
			dataHeader: {
				header: { label: $_('status'), width: 60 },
				cells: [...keyColumns, { label: $_('comment'), width: 60 }]
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

		const chartWidth = contentWidth;
		const chartHeight = contentWidth * 0.4;

		// Charts (restricted to the same alert-linked columns used for the data table)
		const chartKeys = tableKeys; // tableKeys already falls back to validKeys if no alerts
		for (const key of chartKeys) {
			// Add a new page if the content exceeds the current page height
			if (doc.y > doc.page.height - marginBottom - chartHeight + 20) {
				doc.addPage();
			} else {
				doc.moveDown(2);
			}

			createPDFLineChartImage({
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
					width: chartWidth,
					height: chartHeight
				}
			});
		}

		// After the last chart, force a page break before the full data table for clarity
		if (chartKeys.length > 0) {
			doc.addPage();
		}
		// Position after page break (or just add spacing if no charts)
		if (chartKeys.length === 0) {
			doc.moveDown(2);
		}

		// Full data table (restricted to alert-linked columns)
		createPDFDataTable({ doc, dataHeader: dataHeaderTable, dataRows: dataRowsTable });

		const footerText = [
			location.name,
			device.name,
			devEui,
			`${startDateParam} - ${endDateParam}`
		].join(' | ');

		addFooterPageNumber(doc, footerText);

		// 5) finalize
		doc.end();

		// Get the PDF as a buffer (async operation)
		const chunks: Buffer[] = [];
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
							'Content-Disposition': `attachment; filename*=UTF-8''device-${devEui}-report-${startDateParam}-to-${endDateParam}.pdf`,
							'Content-Length': pdfBuffer.length.toString(),
							'Access-Control-Allow-Origin': '*',
							'Access-Control-Allow-Methods': 'GET',
							'Access-Control-Allow-Headers': 'Content-Type, Authorization'
						}
					})
				);
			});

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
