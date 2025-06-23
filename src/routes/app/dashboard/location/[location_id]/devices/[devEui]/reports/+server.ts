import { json } from '@sveltejs/kit';
import type { RequestHandler } from './pdf/$types';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { jsPDF } from 'jspdf';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the font path relative to the project root
const fontPath = path.resolve(process.cwd(), 'src/lib/fonts/NotoSansJP-Regular.ttf');

// Function to encode file data to base64 encoded string
function base64_encode(file: string): string {
	try {
		// Read binary data
		const bitmap = fs.readFileSync(file);
		// Convert binary data to base64 encoded string
		return Buffer.from(bitmap).toString('base64');
	} catch (err) {
		console.error('Error encoding file to base64:', err);
		return '';
	}
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		// Parse the request body
		const body = await request.json();
		const { text } = body;

		if (!text) {
			return new Response(JSON.stringify({ error: 'Text is required' }), {
				status: 400,
				headers: {
					'Content-Type': 'application/json'
				}
			});
		}

		// Check if the font file exists
		if (!fs.existsSync(fontPath)) {
			throw new Error(`Font file not found at: ${fontPath}`);
		}

		// Create a new jsPDF instance
		const doc = new jsPDF({
			orientation: 'portrait',
			unit: 'mm',
			format: 'a4'
		});

		// Set properties
		doc.setProperties({
			title: 'Japanese Text Report (Server-generated)',
			subject: 'Sample PDF with Japanese text',
			author: 'PDF Generator App (Server)',
			creator: 'jsPDF Node.js'
		});

		// Set background color (white)
		doc.setFillColor(255, 255, 255);
		doc.rect(0, 0, 210, 297, 'F');

		// Add title
		doc.setFontSize(24);
		doc.setTextColor(0, 0, 0);
		doc.text('Japanese Text Report (Server)', 105, 20, { align: 'center' });

		// Create a simple representation of the Japanese text
		doc.setFontSize(14);
		doc.setTextColor(0, 0, 0);
		doc.text('Japanese Text:', 20, 40);

		// Create a box to represent where the Japanese text would be
		doc.setDrawColor(200, 200, 200);
		doc.setFillColor(245, 245, 245);
		doc.roundedRect(20, 50, 170, 40, 3, 3, 'FD');

		// Add a transliteration of the Japanese text
		doc.setFontSize(12);
		doc.text(
			'Transliteration: "This is Japanese sample text. This will be converted to a PDF report."',
			20,
			110
		);

		// Add information about the text
		doc.setFontSize(12);
		doc.text(
			'Original Japanese text: 日本語のサンプルテキストです。これはPDFレポートに変換されます。',
			20,
			130
		);
		doc.text(
			'Note: Server-side PDF generation has limited support for non-Latin characters.',
			20,
			150
		);
		doc.text('For full Japanese text support, use the client-side generation option.', 20, 165);

		// Add a QR code placeholder (just a square for demonstration)
		doc.setDrawColor(0, 0, 0);
		doc.setFillColor(240, 240, 240);
		doc.roundedRect(150, 180, 40, 40, 1, 1, 'FD');
		doc.setFontSize(8);
		doc.text('QR Code', 170, 205, { align: 'center' });

		// Add footer
		doc.setFontSize(10);
		doc.setTextColor(100, 100, 100);
		doc.text(`Generated on server: ${new Date().toLocaleString()}`, 105, 280, { align: 'center' });

		// Get the PDF as a buffer
		const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

		// Return the PDF
		return new Response(pdfBuffer, {
			status: 200,
			headers: {
				'Content-Type': 'application/pdf',
				'Content-Disposition': 'attachment; filename="japanese-report-server.pdf"'
			}
		});
	} catch (error) {
		console.error('Error generating PDF:', error);
		return json({ error: 'Failed to generate PDF' }, { status: 500 });
	}
};
