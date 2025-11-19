import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';
import { i18n } from '$lib/i18n/index.svelte';
import type { DeviceDataRecord } from '$lib/models/DeviceDataRecord';
import type { ReportAlertPoint } from '$lib/models/Report';
import type { TableCell, TableRow } from '$lib/pdf';
import {
	createPDFDataTable,
	sampleDataRowsForTable,
	sampleDataRowsByInterval
} from '$lib/pdf/pdfDataTable';
import { addFooterPageNumber } from '$lib/pdf/pdfFooterPageNumber';
import { createPDFLineChartImage } from '$lib/pdf/pdfLineChartImage';
import { checkMatch, getValue } from '$lib/pdf/utils';
import { parseDeviceInstant } from '$lib/pdf/parseDeviceInstant';
import { DeviceRepository } from '$lib/repositories/DeviceRepository';
import { LocationRepository } from '$lib/repositories/LocationRepository';
import { DeviceDataService } from '$lib/services/DeviceDataService';
import { DeviceService } from '$lib/services/DeviceService';
import { LocationService } from '$lib/services/LocationService';
import { formatNumber, getColorNameByKey, getNumericKeys } from '$lib/utilities/stats';
import { error as httpError, json } from '@sveltejs/kit';
import fs from 'fs';
import { DateTime } from 'luxon';
import path from 'path';
import PDFDocument from 'pdfkit';
import { _ } from 'svelte-i18n';
import { get } from 'svelte/store';
import type { RequestHandler } from './$types';
import { drawSummaryPanel } from './drawSummaryPanel';
import { drawRightAlertPanel } from './drawRightAlertPanel';

function normalizeDeviceDataTimestamps(records: DeviceDataRecord[], timezone: string) {
	if (!records || !records.length) return records ?? [];
	return records.map((record) => {
		const next = { ...record } as Record<string, unknown>;
		const stampKeys: Array<keyof DeviceDataRecord> = ['created_at', 'traffic_hour'];
		for (const key of stampKeys) {
			const raw = next[key];
			if (!raw) continue;
			const parsed = parseDeviceInstant(raw as string | Date, timezone);
			if (parsed.isValid) {
				next[key] = parsed.toISO();
			}
		}
		return next as DeviceDataRecord;
	});
}

/**
 * JWT-authenticated PDF generation endpoint for device data reports
 * Designed for server-to-server calls (Node-RED, automation tools, etc.)
 *
 * GET /api/devices/{devEui}/pdf?start=2025-05-01&end=2025-06-06&timezone=Asia/Tokyo&locale=ja
 * Headers: Authorization: Bearer {jwt-token}
 */
export const GET: RequestHandler = async ({ params, url, locals: { supabase } }) => {
	const { devEui } = params;

	try {
		if (!supabase) {
			return json({ error: 'Unauthorized access' }, { status: 401 });
		}
		const { data: userData, error: userError } = await supabase.auth.getUser();
		if (userError || !userData) {
			return json(
				{ error: `Unauthorized access - ${userError?.message}` },
				{ status: userError?.status ?? 401 }
			);
		}
		const { user } = userData;
		if (!user) throw httpError(404, 'Device not found');

		const { data: userProfile } = await supabase
			.from('profiles')
			.select(`full_name, employer`)
			.eq('id', user.id)
			.single();

		const {
			start: startDateParam,
			end: endDateParam,
			dataKeys: dataKeysParam = '',
			alertPoints: _alertPointsParam, // (kept for parity; not used — we source from DB)
			locale: localeParam = 'ja',
			timezone: timezoneParam = 'Asia/Tokyo'
		} = Object.fromEntries(url.searchParams);

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

		// Parse and normalize requested window in the user’s timezone, then convert to UTC for DB
		let startDate = new Date(startDateParam);
		let endDate = new Date(endDateParam);
		if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
			return json(
				{
					error: 'Invalid date format: Dates must be YYYY-MM-DD (or ISO8601).',
					example: '?start=2025-05-01&end=2025-06-06'
				},
				{ status: 400 }
			);
		}
		const userStart = DateTime.fromJSDate(startDate).setZone(timezoneParam).startOf('day');
		const userEnd = DateTime.fromJSDate(endDate).setZone(timezoneParam).endOf('day');
		const startLabel = userStart.toFormat('yyyy-MM-dd HH:mm');
		const endLabel = userEnd.toFormat('yyyy-MM-dd HH:mm');
		startDate = userStart.toUTC().toJSDate();
		endDate = userEnd.toUTC().toJSDate();

		const selectedKeys = dataKeysParam
			.split(',')
			.map((k) => k.trim())
			.filter(Boolean);

		// Pull alert points from DB (same behavior as older code)
		const { data: reportParams, error: reportFetchErr } = await supabase
			.from('reports')
			.select('report_id, report_alert_points(*)')
			.eq('dev_eui', devEui)
			.limit(1) // NOTE: maintained to match existing behavior
			.single();

		if (reportFetchErr) {
			return json(
				{ error: `Failed to fetch report parameters - ${reportFetchErr.message}` },
				{ status: 404 }
			);
		}

		let requestedAlertPoints: ReportAlertPoint[] = [];
		for (const point of reportParams?.report_alert_points || []) {
			if (!point.data_point_key) {
				console.warn(`Alert point with ID ${point.id} has no data_point_key, skipping`);
				continue;
			}
			requestedAlertPoints.push({
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
			});
		}

		// Determine "report" mode to use getDeviceDataForReport
		const isReport = !requestedAlertPoints.length;

		// Repos/Services
		const errorHandler = new ErrorHandlingService();
		const deviceRepo = new DeviceRepository(supabase, errorHandler);
		const deviceService = new DeviceService(deviceRepo);
		const device = await deviceService.getDeviceWithTypeByEui(devEui);
		if (!device) throw httpError(404, 'Device not found');

		const locationRepo = new LocationRepository(supabase, errorHandler);
		const locationService = new LocationService(locationRepo, deviceRepo);
		const location = await locationService.getLocationById(device.location_id!);
		if (!location) throw httpError(404, 'Location not found');

		const deviceDataService = new DeviceDataService(supabase);

		// Fetch data using the timezone-aware path
		const deviceDataResponse = isReport
			? await deviceDataService.getDeviceDataForReport({
					devEui,
					startDate,
					endDate,
					timezone: timezoneParam,
					columns: requestedAlertPoints.map((p) => p.data_point_key as string),
					ops: requestedAlertPoints.map((p) => p.operator as string),
					mins: requestedAlertPoints.map((p) => (p.min ?? p.value) as number),
					maxs: requestedAlertPoints.map((p) => p.max ?? null),
					intervalMinutes: 30
				})
			: await deviceDataService.getDeviceDataByDateRange(devEui, startDate, endDate, timezoneParam);

		let deviceData: DeviceDataRecord[] = [];
		let alertPoints: ReportAlertPoint[] = requestedAlertPoints;

		if (deviceDataResponse?.length) {
			console.log('PDF report raw timestamp sample', {
				devEui,
				timezone: timezoneParam,
				firstRaw: deviceDataResponse[0]?.created_at,
				lastRaw: deviceDataResponse[deviceDataResponse.length - 1]?.created_at
			});
			deviceData = normalizeDeviceDataTimestamps(deviceDataResponse, timezoneParam);
			console.log('PDF report normalized timestamp sample', {
				devEui,
				timezone: timezoneParam,
				firstNormalized: deviceData[0]?.created_at,
				lastNormalized: deviceData[deviceData.length - 1]?.created_at
			});
			const windowStart = userStart.toMillis();
			const windowEnd = userEnd.toMillis();
			const beforeFilterCount = deviceData.length;
			deviceData = deviceData.filter((record) => {
				const dt = parseDeviceInstant(record.created_at as string, timezoneParam);
				const ms = dt.toMillis();
				return ms >= windowStart && ms <= windowEnd;
			});
			console.log('PDF report filtered dataset', {
				devEui,
				beforeFilterCount,
				afterFilterCount: deviceData.length,
				firstAfterFilter: deviceData[0]?.created_at,
				lastAfterFilter: deviceData[deviceData.length - 1]?.created_at
			});
			if (!alertPoints.length) {
				alertPoints = await deviceDataService.getAlertPointsForDevice(devEui);
			}
		} else {
			return json(
				{
					error: `No data found for device ${devEui} in the specified range`,
					device: devEui,
					dateRange: { start: startDateParam, end: endDateParam }
				},
				{ status: 404 }
			);
		}

		// Sort by created_at using timezone-correct parser
		deviceData.sort((a, b) => {
			const aMs = parseDeviceInstant(a.created_at as string, timezoneParam).toMillis();
			const bMs = parseDeviceInstant(b.created_at as string, timezoneParam).toMillis();
			return aMs - bMs;
		});

		// Build PDF — keep the **old layout** with header, signature boxes, charts, full table, footer
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

		// Load JP font if available
		const possibleFontPaths = [
			path.join(process.cwd(), 'static/fonts/NotoSansJP-Regular.ttf'),
			path.join(process.cwd(), 'src/lib/fonts/NotoSansJP-Regular.ttf'),
			path.join(process.cwd(), 'server/fonts/NotoSansJP-Regular.ttf'),
			'static/fonts/NotoSansJP-Regular.ttf'
		];
		for (const fp of possibleFontPaths) {
			try {
				if (fs.existsSync(fp)) {
					doc.registerFont('NotoSansJP', fp);
					doc.font('NotoSansJP');
					break;
				}
			} catch {
				// ignore
			}
		}

		const {
			top: marginTop,
			right: marginRight,
			bottom: marginBottom,
			left: marginLeft
		} = doc.page.margins;
		const contentWidth = doc.page.width - marginLeft - marginRight;

		// Title
		const totalRangeDays = Math.abs(userEnd.diff(userStart, 'days').days);
		const isWeekly = Math.abs(totalRangeDays - 7) < 0.1;
		const chartIntervalMinutes = totalRangeDays > 7 ? 60 : totalRangeDays > 3 ? 30 : 0;
		const tableDisplayIntervalMinutes = 30;
		// const titleText = isWeekly ? $_('device_report_weekly') : $_('device_report_monthly');
		// doc.fontSize(16).text(`${titleText} ${$_('device_report')}`);
		doc.fontSize(16).text(`${$_('device_report')}`);

		// Signature boxes (old layout)
		doc.fontSize(10).strokeColor('#ccc');
		doc.rect(400, marginTop, 50, 60).stroke();
		doc.rect(450, marginTop, 50, 60).stroke();
		doc.rect(500, marginTop, 50, 60).stroke();
		doc.text($_('approved'), 405, 45);
		doc.text($_('verified'), 455, 45);
		doc.text($_('created'), 505, 45);

		doc.x = marginLeft;
		doc.y = 70;

		const metaTextOptions = { width: 320 };

		// Metadata block
		// doc
		// 	.fontSize(8)
		// 	.text(
		// 		`${$_('generated_at')}: ${DateTime.now().setZone(timezoneParam).toFormat('yyyy-MM-dd HH:mm:ss')}`,
		// 		metaTextOptions
		// 	)
		// 	.text(
		// 		`${$_('generated_by')}: ${userProfile?.full_name || user.email || $_('Unknown')}`,
		// 		metaTextOptions
		// 	);
		// if (userProfile?.employer) {
		// 	doc.text(`${$_('Company')}: ${userProfile?.employer || $_('Unknown')}`, metaTextOptions);
		// }
		doc
			.moveDown(0.5)
			.text(`${$_('installed_at')}: ${location.name || $_('Unknown')}`, metaTextOptions)
			.text(
				`${$_('Device Type')}: ${device.cw_device_type?.name || $_('Unknown')}`,
				metaTextOptions
			)
			.text(`${$_('Device Name')}: ${device.name || $_('Unknown')}`, metaTextOptions)
			.text(`${$_('EUI')}: ${devEui}`, metaTextOptions);

		// Right side quick facts
		// doc.moveUp(2);
		// doc.x = 400;
		// doc
		// 	.text(`${$_('date_range')}: ${startLabel} - ${endLabel} (${timezoneParam})`)
		// 	.text(`${$_('sampling_size')}: ${deviceData.length}`);

		doc.x = marginLeft;
		doc.moveDown();

		// Keys & columns
		const numericKeys = getNumericKeys(deviceData);
		const validKeys =
			isReport || !selectedKeys.length
				? numericKeys
				: numericKeys.filter((k) => selectedKeys.includes(k));

		// Restrict table/graph columns to alert-linked columns if available
		const alertKeySet = new Set(alertPoints.map((p) => p.data_point_key));
		const alertKeys = validKeys.filter((k) => alertKeySet.has(k));
		const tableKeys = alertKeys.length ? alertKeys : validKeys;

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

		// Build rows using timezone-aware labels and carry ISO+offset in value
		const getDataRows = (keys: string[] = validKeys): TableRow[] =>
			deviceData.map((data, index) => {
				const date = parseDeviceInstant(data.created_at as string, timezoneParam);
				const previousDate =
					index > 0
						? parseDeviceInstant(deviceData[index - 1].created_at as string, timezoneParam)
						: null;

				const isoWithZone = date.toISO(); // carries offset
				const labelLocal = date.toFormat('M/d H:mm');
				const shortLocal = date.toFormat('H:mm');

				return {
					header: {
						value: isoWithZone,
						label: labelLocal,
						shortLabel:
							previousDate?.toFormat('M/d') === date.toFormat('M/d') ? shortLocal : labelLocal
					},
					cells: keys.map((key) => {
						const rawValue = (data as Record<string, unknown>)[key];
						const value =
							typeof rawValue === 'number' && !isNaN(rawValue as number) ? (rawValue as number) : 0;

						return {
							value,
							label:
								typeof rawValue === 'number' && !isNaN(rawValue as number)
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

		// Prepare rows/tables
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
		const sampledTableRows = sampleDataRowsByInterval(dataRowsTable, tableDisplayIntervalMinutes);
		const tableConfig = { timezone: timezoneParam, takeEvery: 1 };

		// LEFT summary
		const primaryKey = tableKeys[0] ?? validKeys[0] ?? 'temperature_c';
		const { firstRowY, bottomY: summaryBottomY } = drawSummaryPanel(doc, {
			dataRows,
			validKeys,
			primaryKey,
			caption: $_('summary'),
			samplingLabel: $_('sampling_size'),
			dateRangeLabel: $_('date_range'),
			maxLabel: $_('max'),
			minLabel: $_('min'),
			avgLabel: $_('avg'),
			stddevLabel: $_('stddev'),
			displayStartLabel: startLabel,
			displayEndLabel: endLabel,
			locale: localeParam,
			tableWidthPercent: 0.5,
			lineColor: '#000'
		});

		// RIGHT alerts — align exactly with “サンプリング数”
		const panelX = 400;
		const panelW = 180;
		const rightBottomY = drawRightAlertPanel({
			doc,
			x: panelX,
			y: firstRowY, // ← precise alignment with the first row
			width: panelW,
			locale: localeParam,
			startLabel: startLabel,
			endLabel: endLabel,
			timezone: timezoneParam,
			samplingLabel: $_('sampling_size'),
			sampleCount: deviceData.length,
			alertPoints,
			validKeys,
			dataRows
		});

		// Normalize flow so charts start below both blocks
		doc.x = doc.page.margins.left;
		doc.y = Math.max(summaryBottomY, rightBottomY) + 12;

		// Charts (keep old layout behavior)
		const chartWidth = contentWidth;
		const chartHeight = contentWidth * 0.4;
		const chartKeys = tableKeys;
		for (const key of chartKeys) {
			if (doc.y > doc.page.height - marginBottom - chartHeight + 20) {
				doc.addPage();
			} else {
				doc.moveDown(2);
			}
			const chartRows = getDataRows([key]);
			const sampledChartRows = sampleDataRowsByInterval(chartRows, chartIntervalMinutes);
			createPDFLineChartImage({
				doc,
				dataHeader: {
					header: { label: $_('datetime'), value: '', width: 60 },
					cells: [{ label: $_(key), value: '', width: 40, color: getColorNameByKey(key) }]
				},
				dataRows: sampledChartRows,
				alertPoints,
				config: { title: $_(key), width: chartWidth, height: chartHeight, timezone: timezoneParam }
			});
		}

		// Page break before full table
		if (chartKeys.length > 0) doc.addPage();
		else doc.moveDown(2);

		// Full data table (restricted to alert-linked columns if any)
		createPDFDataTable({
			doc,
			dataHeader: dataHeaderTable,
			dataRows: sampledTableRows,
			config: tableConfig
		});

		// Footer
		const footerText = [
			location.name,
			device.name,
			devEui,
			`${startLabel} - ${endLabel} (${timezoneParam})`
		].join(' | ');
		addFooterPageNumber(doc, footerText);

		// Finalize
		doc.end();

		const chunks: Buffer[] = [];
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		doc.on('data', (chunk: any) => chunks.push(Buffer.from(chunk)));

		return new Promise<Response>((resolve, reject) => {
			doc.on('end', () => {
				const pdfBuffer = Buffer.concat(chunks);
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
		console.error(`Error generating PDF for device ${params.devEui}:`, err);
		return json(
			{
				error: 'Failed to generate PDF report',
				details: err instanceof Error ? err.message : 'Unknown error',
				device: params.devEui,
				user: 'Unknown user'
			},
			{ status: 500 }
		);
	}
};
