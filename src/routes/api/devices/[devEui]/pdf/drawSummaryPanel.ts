// src/lib/pdf/drawSummaryPanel.ts
import type { TableRow } from '$lib/pdf';

type PDFDocument = InstanceType<typeof import('pdfkit')>;

export type ClassificationBand = { label: string; min: number; max: number };

export type DrawSummaryPanelOpts = {
	dataRows: TableRow[];
	validKeys: string[];
	primaryKey: string;
	caption?: string;
	samplingLabel: string;
	dateRangeLabel: string;
	maxLabel: string;
	minLabel: string;
	avgLabel: string;
	stddevLabel: string;
	displayStartLabel: string;
	displayEndLabel: string;
	bands?: ClassificationBand[];
	locale?: string;
	fractionDigits?: number;
	tableWidthPercent?: number;
	lineColor?: string;
	rowHeight?: number;
};

/**
 * Draws the summary panel on the left side of the PDF.
 * Returns the topY, firstRowY (y of the first row text), and bottomY.
 */
export function drawSummaryPanel(
	doc: PDFDocument,
	opts: DrawSummaryPanelOpts
): { topY: number; firstRowY: number; bottomY: number } {
	const {
		dataRows,
		validKeys,
		primaryKey,
		caption,
		samplingLabel,
		dateRangeLabel,
		maxLabel,
		minLabel,
		avgLabel,
		stddevLabel,
		displayStartLabel,
		displayEndLabel,
		locale = 'ja',
		fractionDigits = 2,
		tableWidthPercent = 0.5,
		lineColor = '#000',
		rowHeight = 16
	} = opts;

	if (!dataRows?.length || !validKeys?.length) {
		const y0 = doc.y;
		if (caption) doc.fontSize(12).text(caption);
		doc.fontSize(9).fillColor('#555').text('No data');
		doc.fillColor('black');
		return { topY: y0, firstRowY: y0, bottomY: doc.y };
	}

	// pick index of primary key
	const keyIndex = Math.max(0, validKeys.indexOf(primaryKey));
	const values: number[] = dataRows
		.map((r) => r.cells?.[keyIndex]?.value as number)
		.filter((v) => typeof v === 'number' && !Number.isNaN(v));

	const total = values.length;
	const min = values.length ? Math.min(...values) : NaN;
	const max = values.length ? Math.max(...values) : NaN;
	const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : NaN;
	const stddev =
		values.length > 1
			? Math.sqrt(values.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / values.length)
			: 0;

	const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: fractionDigits });
	const pf = new Intl.NumberFormat(locale, {
		style: 'percent',
		maximumFractionDigits: fractionDigits
	});

	const lines: string[] = [];
	lines.push(`${samplingLabel}: ${total}`);
	lines.push(`${dateRangeLabel}: ${displayStartLabel} - ${displayEndLabel}`);
	lines.push(`${maxLabel}: ${isFinite(max) ? nf.format(max) : '-'}`);
	lines.push(`${minLabel}: ${isFinite(min) ? nf.format(min) : '-'}`);
	lines.push(`${avgLabel}: ${isFinite(avg) ? nf.format(avg) : '-'}`);
	lines.push(`${stddevLabel}: ${isFinite(stddev) ? nf.format(stddev) : '-'}`);

	const left = doc.page.margins.left;
	const availableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
	const tableWidth = availableWidth * tableWidthPercent;

	if (caption) {
		doc.fontSize(12).text(caption, left, doc.y, { width: tableWidth });
		doc.moveDown(0.3);
	}

	const topY = doc.y; // start of the block
	const firstRowY = topY + 3; // actual y we draw the first line at

	let y = topY;
	doc.fontSize(10).fillColor('black');

	for (let i = 0; i < lines.length; i++) {
		doc.text(lines[i], left + 5, y + 3, { width: tableWidth - 10, ellipsis: true });
		doc
			.moveTo(left, y + rowHeight)
			.lineTo(left + tableWidth, y + rowHeight)
			.lineWidth(1)
			.strokeColor(lineColor)
			.stroke();
		y += rowHeight;
	}

	doc.y = y + 6;
	return { topY, firstRowY, bottomY: doc.y };
}
