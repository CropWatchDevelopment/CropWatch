// src/lib/pdf/drawRightAlertPanel.ts
import type { TableRow } from '$lib/pdf';
import type { ReportAlertPoint } from '$lib/models/Report';
import { checkMatch } from '$lib/pdf/utils';

type PDFDocument = InstanceType<typeof import('pdfkit')>;

export function drawRightAlertPanel(opts: {
	doc: PDFDocument;
	x: number; // left of the panel (e.g., 400)
	y: number; // top of the panel (align with header)
	width: number; // e.g., 180–200
	locale: string;
	startLabel: string;
	endLabel: string;
	timezone: string;
	samplingLabel: string;
	sampleCount: number;
	alertPoints: ReportAlertPoint[];
	validKeys: string[];
	dataRows: TableRow[];
}): number {
	const { doc, x, y, width, locale, alertPoints, validKeys, dataRows } = opts;

	const savedX = doc.x;
	const savedY = doc.y;

	const pf0 = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 });

	doc.fontSize(8);

	let cy = y;
	let bottomY = y;

	// Header lines
	//   cy = Math.max(cy, doc.y); // small gap

	// Alert points (count + % for their key)
	for (const p of alertPoints) {
		const idx = validKeys.indexOf(p.data_point_key);
		if (idx === -1) continue;

		const vals = dataRows.map((row) => row.cells[idx]?.value as number);
		const total = vals.length || 1;
		const count = vals.filter((v) => checkMatch(v, p)).length;
		const pct = count / total;

		const sw = 8;
		const sh = 8;
		doc
			.save()
			.rect(x, cy + 3, sw, sh)
			.fill(p.hex_color || '#999')
			.restore();
		doc.text(`${p.name ?? p.data_point_key}: ${count} (${pf0.format(pct)})`, x + sw + 6, cy, {
			width: width - sw - 6
		});
		cy = Math.max(cy, doc.y);
	}

	bottomY = cy;

	// IMPORTANT: do not leave global cursor moved
	doc.x = savedX;
	doc.y = savedY;

	return bottomY;
}
