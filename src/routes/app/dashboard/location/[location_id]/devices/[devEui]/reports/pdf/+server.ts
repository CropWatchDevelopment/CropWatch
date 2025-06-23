import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createPDFDataTable } from '$lib/pdf/pdfDataTable';

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

export const GET: RequestHandler = async () => {
	try {
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
					console.log(`Found font at: ${fontPath}`);
					doc.registerFont('NotoSansJP', fontPath);
					doc.font('NotoSansJP');
					console.log('Successfully registered font');
					fontLoaded = true;
					break;
				}
			} catch (e) {
				console.log(`Could not load font from: ${fontPath}`);
			}
		}

		// If we couldn't load the font from any path, use a fallback approach
		if (!fontLoaded) {
			try {
				// Log the current directory and available files for debugging
				console.log('Current directory:', process.cwd());
				console.log('__dirname:', __dirname);

				// Try one more approach - use a direct path that should work in Vercel
				console.log('Trying fallback approach with direct path');
				doc.registerFont('NotoSansJP', 'server/fonts/NotoSansJP-Regular.ttf');
				doc.font('NotoSansJP');
				console.log('Successfully registered font using fallback approach');
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
		const dataa: { date: string; values: [number, number, number] }[] = [];
		const start = new Date('2024-05-13T12:00:00');

		const intervals = 30 * 48; // 30 days * (24h * 2 intervals per hour)
		for (let i = 0; i < intervals; i++) {
			const dt = new Date(start.getTime() + i * 30 * 60 * 1000);
			const yyyy = dt.getFullYear();
			const mm = String(dt.getMonth() + 1).padStart(2, '0');
			const dd = String(dt.getDate()).padStart(2, '0');
			const hh = String(dt.getHours()).padStart(2, '0');
			const min = String(dt.getMinutes()).padStart(2, '0');
			const date = `${yyyy}/${mm}/${dd} ${hh}:${min}`;

			// Example: three random floats between 15.0 and 25.0, one decimal place
			const values: [number, number, number] = [
				parseFloat((15 + Math.random() * 10).toFixed(1)) as number,
				parseFloat((15 + Math.random() * 10).toFixed(1)) as number,
				parseFloat((15 + Math.random() * 10).toFixed(1)) as number
			];

			dataa.push({ date, values });
		}

		// Create the PDF data table
		createPDFDataTable(doc, dataa);

		// Add generation timestamp
		doc.fontSize(10).text(`生成日時: ${new Date().toLocaleString('ja-JP')}`, {
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
