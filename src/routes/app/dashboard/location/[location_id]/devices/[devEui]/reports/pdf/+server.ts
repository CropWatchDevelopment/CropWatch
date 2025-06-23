import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

		// Use a completely different approach for the table
		// Start with a clean position
		doc.moveDown(2);
		const startY = doc.y;

		// Define table dimensions
		const margin = 40;
		const tableWidth = doc.page.width - margin * 2;
		const rowHeight = 30;
		// Define column widths as percentages of table width
		const colWidths = [
			tableWidth * 0.1, // ID (10%)
			tableWidth * 0.3, // Name (30%)
			tableWidth * 0.3, // Department (30%)
			tableWidth * 0.3 // Role (30%)
		];

		// Draw table header - as a filled rectangle with white text
		doc.fillColor('#3498db');
		doc.rect(margin, startY, tableWidth, rowHeight).fill();
		doc.fillColor('white');
		doc.fontSize(12);

		// Draw header text
		let xPos = margin;
		['ID', '名前', '部署', '役職'].forEach((header, i) => {
			doc.text(header, xPos + 5, startY + 10, {
				width: colWidths[i],
				align: 'left'
			});
			xPos += colWidths[i];
		});

		// Reset text color for data rows
		doc.fillColor('black');

		// Table data
		const data = [
			{ id: '1', name: '田中 太郎', dept: '営業部', role: 'マネージャー' },
			{ id: '2', name: '佐藤 花子', dept: '開発部', role: 'シニアエンジニア' },
			{ id: '3', name: '鈴木 一郎', dept: 'マーケティング', role: 'ディレクター' },
			{ id: '4', name: '高橋 美咲', dept: '人事部', role: 'スペシャリスト' },
			{ id: '5', name: '伊藤 健太', dept: '財務部', role: 'アナリスト' }
		];

		// Draw each row separately with clear spacing
		let yPos = startY + rowHeight;

		// Draw each data row
		data.forEach((row, i) => {
			console.log(`Drawing row ${i + 1} at Y position: ${yPos}`);

			// Check if we need a new page
			if (yPos + rowHeight > doc.page.height - margin) {
				doc.addPage();
				yPos = margin;
				console.log('Added new page for table continuation');
			}

			// Draw row background (alternating colors)
			if (i % 2 === 1) {
				doc.fillColor('#f9f9f9');
				doc.rect(margin, yPos, tableWidth, rowHeight).fill();
			} else {
				doc.fillColor('white');
				doc.rect(margin, yPos, tableWidth, rowHeight).fill();
			}

			// Draw row border
			doc.strokeColor('#cccccc');
			doc.rect(margin, yPos, tableWidth, rowHeight).stroke();

			// Reset text color
			doc.fillColor('black');

			// Draw each cell separately with explicit positioning
			xPos = margin;

			// Draw ID cell
			doc.text(row.id, xPos + 5, yPos + 10, {
				width: colWidths[0],
				align: 'left'
			});
			xPos += colWidths[0];

			// Draw name cell
			doc.text(row.name, xPos + 5, yPos + 10, {
				width: colWidths[1],
				align: 'left'
			});
			xPos += colWidths[1];

			// Draw department cell
			doc.text(row.dept, xPos + 5, yPos + 10, {
				width: colWidths[2],
				align: 'left'
			});
			xPos += colWidths[2];

			// Draw role cell
			doc.text(row.role, xPos + 5, yPos + 10, {
				width: colWidths[3],
				align: 'left'
			});

			// Move to next row position
			yPos += rowHeight;
		});

		// Update document position
		doc.y = yPos + 10;
		console.log(`Table complete. Final Y position: ${doc.y}`);

		doc.moveDown(2);
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
