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
import { error as httpError, json } from '@sveltejs/kit';
import fs from 'fs';
import { DateTime } from 'luxon';
import path from 'path';
import PDFDocument from 'pdfkit';
import { _ } from 'svelte-i18n';
import { get } from 'svelte/store';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, url, locals: { supabase } }) => {
	const { devEui } = params;

	const tzOffsetPattern = /([zZ]|[+\-]\d{2}:\d{2}|[+\-]\d{4}|[+\-]\d{2})$/;
	function parseDeviceInstant(input: string | Date, tz: string): DateTime {
		if (input instanceof Date) {
			return DateTime.fromJSDate(input, { zone: 'utc' }).setZone(tz);
		}
		let dt: DateTime;
		if (tzOffsetPattern.test(input)) {
			dt = DateTime.fromISO(input, { setZone: true });
			if (!dt.isValid) dt = DateTime.fromSQL(input, { setZone: true });
			return dt.setZone(tz);
		}
		dt = DateTime.fromISO(input, { zone: tz });
		if (!dt.isValid) dt = DateTime.fromSQL(input, { zone: tz });
		return dt;
	}

	try {
		if (!supabase) {
			return json({ error: 'Unauthorized access' }, { status: 401 });
		}
		const { data: userData, error: userError } = await supabase.auth.getUser();
		if (userError || !userData) {
			return json(
				{ error: `Unauthorized access - ${userError?.message}` },
				{ status: userError?.status }
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
			locale: localeParam = 'ja',
			timezone: timezoneParam = 'Asia/Tokyo'
		} = Object.fromEntries(url.searchParams);

		const selectedKeys = dataKeysParam
			.split(',')
			.map((key) => key.trim())
			.filter(Boolean);

		const { data: reportParams, error: reportError } = await supabase
			.from('reports')
			.select('report_id, report_alert_points(*)')
			.eq('dev_eui', devEui)
			.limit(1)
			.single();

		if (reportError) {
			return json({ error: `Failed to fetch report - ${reportError.message}` }, { status: 500 });
		}

		let requestedAlertPoints: ReportAlertPoint[] = [];
		for (const point of reportParams?.report_alert_points || []) {
			if (!point.data_point_key) continue;
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
		const isReport = !requestedAlertPoints.length;

		await i18n.initialize({ initialLocale: localeParam });
		const $_ = get(_);

		if (!startDateParam || !endDateParam) {
			return json({ error: 'Missing start/end' }, { status: 400 });
		}

		let startDate = new Date(startDateParam);
		let endDate = new Date(endDateParam);

		const userStartDate = DateTime.fromJSDate(startDate).setZone(timezoneParam).startOf('day');
		const userEndDate = DateTime.fromJSDate(endDate).setZone(timezoneParam).endOf('day');
		const displayStartLabel = userStartDate.toFormat('yyyy-MM-dd HH:mm');
		const displayEndLabel = userEndDate.toFormat('yyyy-MM-dd HH:mm');

		startDate = userStartDate.toUTC().toJSDate();
		endDate = userEndDate.toUTC().toJSDate();

		const deviceDataService = new DeviceDataService(supabase);
		let deviceData: DeviceDataRecord[] = [];
		let alertPoints: ReportAlertPoint[] = requestedAlertPoints;

		const errorHandler = new ErrorHandlingService();
		const deviceRepo = new DeviceRepository(supabase, errorHandler);
		const deviceService = new DeviceService(deviceRepo);
		const device = await deviceService.getDeviceWithTypeByEui(devEui);
		if (!device) throw httpError(404, 'Device not found');

		const locationRepo = new LocationRepository(supabase, errorHandler);
		const locationService = new LocationService(locationRepo, deviceRepo);
		const location = await locationService.getLocationById(device.location_id!);

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

		if (deviceDataResponse?.length) {
			deviceData = deviceDataResponse;
			if (!alertPoints.length) {
				alertPoints = await deviceDataService.getAlertPointsForDevice(devEui);
			}
		} else {
			return json({ error: 'No data' }, { status: 404 });
		}

		deviceData.sort((a, b) => {
			const aMs = parseDeviceInstant(a.created_at as string, timezoneParam).toMillis();
			const bMs = parseDeviceInstant(b.created_at as string, timezoneParam).toMillis();
			return aMs - bMs;
		});

		const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
		const {
			top: marginTop,
			right: marginRight,
			bottom: marginBottom,
			left: marginLeft
		} = doc.page.margins;
		const contentWidth = doc.page.width - marginLeft - marginRight;

		// font
		const possibleFontPaths = [
			path.join(process.cwd(), 'static/fonts/NotoSansJP-Regular.ttf'),
			path.join(process.cwd(), 'src/lib/fonts/NotoSansJP-Regular.ttf')
		];
		for (const fp of possibleFontPaths) {
			if (fs.existsSync(fp)) {
				doc.registerFont('NotoSansJP', fp);
				doc.font('NotoSansJP');
				break;
			}
		}

		doc.fontSize(16).text(`CropWatch ${$_('device_report')}`);
		doc
			.fontSize(8)
			.text(`${$_('date_range')}: ${displayStartLabel} - ${displayEndLabel} (${timezoneParam})`);

		const numericKeys = getNumericKeys(deviceData);
		const validKeys =
			isReport || !selectedKeys.length
				? numericKeys
				: numericKeys.filter((k) => selectedKeys.includes(k));

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

		// ✅ Build rows with ISO+offset + JST label
		const getDataRows = (keys: string[] = validKeys): TableRow[] =>
			deviceData.map((data, index) => {
				const date = parseDeviceInstant(data.created_at as string, timezoneParam);
				const previousDate =
					index > 0
						? parseDeviceInstant(deviceData[index - 1].created_at as string, timezoneParam)
						: null;

				const isoWithZone = date.toISO();
				const labelJst = date.toFormat('M/d H:mm');
				const shortJst = date.toFormat('H:mm');

				return {
					header: {
						value: isoWithZone, // <— carry offset
						label: labelJst,
						shortLabel: previousDate?.toFormat('M/d') === date.toFormat('M/d') ? shortJst : labelJst
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

		// ✅ Pass timezone to createPDFDataTable
		createPDFDataTable({
			doc,
			dataHeader: dataHeaderTable,
			dataRows: dataRowsTable,
			config: { timezone: timezoneParam }
		});

		const footerText = [
			location.name,
			device.name,
			devEui,
			`${displayStartLabel} - ${displayEndLabel} (${timezoneParam})`
		].join(' | ');
		addFooterPageNumber(doc, footerText);

		doc.end();

		const chunks: Buffer[] = [];
		doc.on('data', (chunk: any) => chunks.push(Buffer.from(chunk)));

		return new Promise<Response>((resolve, reject) => {
			doc.on('end', () => {
				const pdfBuffer = Buffer.concat(chunks);
				resolve(
					new Response(pdfBuffer, {
						status: 200,
						headers: {
							'Content-Type': 'application/pdf',
							'Content-Disposition': `attachment; filename*=UTF-8''device-${devEui}-report.pdf`,
							'Content-Length': pdfBuffer.length.toString()
						}
					})
				);
			});
			doc.on('error', (err: any) => reject(json({ error: err.message }, { status: 500 })));
		});
	} catch (err) {
		return json({ error: (err as Error).message }, { status: 500 });
	}
};
