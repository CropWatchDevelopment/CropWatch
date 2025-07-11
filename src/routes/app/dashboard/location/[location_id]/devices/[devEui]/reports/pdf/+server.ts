import { createPDFDataTable } from '$lib/pdf/pdfDataTable';
import { DeviceDataService } from '$lib/services/DeviceDataService';
import { SessionService } from '$lib/services/SessionService';
import { error, redirect } from '@sveltejs/kit';
import fs from 'fs';
import { DateTime } from 'luxon';
import path from 'path';
import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'url';
import type { RequestHandler } from './$types';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define possible font paths for both development and production
const possibleFontPaths = [
	// Paths for local development
	path.join(process.cwd(), 'static/fonts/NotoSansJP-Regular.ttf'),
	path.join(process.cwd(), 'src/lib/fonts/NotoSansJP-Regular.ttf'),

	// Paths for production deployment
	path.join(process.cwd(), 'server/fonts/NotoSansJP-Regular.ttf'),
	path.join(__dirname, '../../../fonts/NotoSansJP-Regular.ttf'),

	// Fallback paths
	path.join(__dirname, '../../../../static/fonts/NotoSansJP-Regular.ttf'),
	'static/fonts/NotoSansJP-Regular.ttf'
];

export const GET: RequestHandler = async ({
	url,
	params,
	locals: { safeGetSession, supabase }
}) => {
	const { devEui } = params;
	const sessionService = new SessionService(supabase);
	const sessionResult = await sessionService.getSafeSession();

	// If no session exists, redirect to login
	if (!sessionResult || !sessionResult.user) {
		throw redirect(302, '/auth/login');
	}

	try {
		const deviceDataService = new DeviceDataService(supabase);
		// Create a new PDF document
		const doc = new PDFDocument({
			size: 'A4',
			margin: 40,
			info: {
				Title: 'Japanese PDF Report (Server)',
				Author: 'PDF Generator App',
				Subject: 'Sample PDF with selectable Japanese text'
			}
		});

		// Try to load the font using multiple possible paths
		let fontLoaded = false;

		for (const fontPath of possibleFontPaths) {
			try {
				if (fs.existsSync(fontPath)) {
					//console.log(`Found font at: ${fontPath}`);
					doc.registerFont('NotoSansJP', fontPath);
					doc.font('NotoSansJP');
					//console.log('Successfully registered font');
					fontLoaded = true;
					break;
				}
			} catch (e) {
				//console.log(`Could not load font from: ${fontPath}`);
			}
		}

		// If we couldn't load the font from any path, use a fallback approach
		if (!fontLoaded) {
			try {
				// Log the current directory and available files for debugging
				//console.log('Current directory:', process.cwd());
				//console.log('__dirname:', __dirname);

				// Try one more approach - use a direct path that should work in Vercel
				//console.log('Trying fallback approach with direct path');
				doc.registerFont('NotoSansJP', 'server/fonts/NotoSansJP-Regular.ttf');
				doc.font('NotoSansJP');
				//console.log('Successfully registered font using fallback approach');
			} catch (fontErr) {
				console.error('All font loading attempts failed:', fontErr);
				console.error(
					'Continuing with default font - Japanese characters may not display correctly'
				);
				// Continue with default font
			}
		}

		// Set the initial position
		doc.fontSize(24).text('日本語レポート (サーバー)', {
			align: 'center'
		});

		doc.moveDown();
		doc
			.fontSize(12)
			.text('これは日本語のテキストを含むPDFレポートです。このテキストは選択可能です。', {
				align: 'left',
				width: 500
			});

		doc.moveDown();
		doc.fontSize(14).text('データテーブル', {
			align: 'left'
		});

		// Generate sample data for the table
		const dataa: { date: string; values: [] }[] = []; //////////////////////////////////////////////////////////////////
		const tokyoNow = DateTime.now().setZone('Asia/Tokyo');
		const startDate = tokyoNow.minus({ months: 1 }).startOf('month').toUTC().toJSDate();
		const endDate = tokyoNow.minus({ months: 1 }).endOf('month').toUTC().toJSDate();

		const deviceData = await deviceDataService.getDeviceDataForReport({
			devEui,
			startDate,
			endDate,
			timezone: 'Asia/Tokyo',
			intervalMinutes: 30
		});
		if (!deviceData || deviceData.length === 0) {
			throw error(404, 'No data found for the specified device');
		}

		// Transform DeviceDataRecord[] to TableData[] format
		const data = deviceData.map((record) => ({
			date: record.created_at,
			values: Object.entries(record)
				.filter(
					([key, value]) =>
						key !== 'dev_eui' && key !== 'created_at' && typeof value === 'number' && value !== null
				)
				.map(([_, value]) => value as number)
		}));

		if (!data || data.length === 0) {
			throw error(404, 'No data found for the specified device');
		}

		// Get alert points for the device
		const alertPoints = await deviceDataService.getAlertPointsForDevice(devEui);

		// Create the alert data structure
		const alertData = {
			alert_points: alertPoints,
			created_at: new Date().toISOString(),
			dev_eui: devEui,
			id: 1,
			name: 'Device Report',
			report_id: '1'
		};
		createPDFDataTable(doc, data, alertData);

		// Add generation timestamp
		doc
			.fontSize(10)
			.text(`生成日時: ${DateTime.now().setZone('Asia/Tokyo').toFormat('yyyy-MM-dd HH:mm:ss')}`, {
				align: 'right'
			});

		// Finalize the PDF
		doc.end();

		// Get the PDF as a buffer
		const chunks: Buffer[] = [];
		doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));

		return new Promise<Response>((resolve, reject) => {
			doc.on('end', () => {
				const pdfBuffer = Buffer.concat(chunks);
				resolve(
					new Response(pdfBuffer, {
						headers: {
							'Content-Type': 'application/pdf',
							'Content-Disposition': 'attachment; filename="japanese-report-pdfkit.pdf"'
						}
					})
				);
			});

			doc.on('error', (err) => {
				reject(error(500, err.message));
			});
		});
	} catch (err) {
		console.error('Error generating PDF with PDFKit:', err);
		throw error(500, 'Failed to generate PDF');
	}
};
