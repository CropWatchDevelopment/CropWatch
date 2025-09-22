import PDFDocument from 'pdfkit';
import { DateTime } from 'luxon';
import type { TableRow } from '.';

interface TableConfig {
	caption?: string;
	columnsPerPage: number;
	rowsPerColumn: number;
	cellWidth: number;
	cellHeight: number;
	columnMargin: number;
	fontSize: number;
	headerHeight: number;
	takeEvery: number; // keep every Nth row (always keep rows with alert bgColor)
	timezone?: string; // e.g., 'Asia/Tokyo'
}

const DEFAULT_CONFIG: TableConfig = {
	caption: '',
	columnsPerPage: 4,
	rowsPerColumn: 30,
	cellWidth: 100,
	cellHeight: 12,
	columnMargin: 10,
	fontSize: 7,
	headerHeight: 15,
	takeEvery: 3,
	timezone: 'utc'
};

/**
 * Parse the header.value (epoch ms | ISO | SQL) into a DateTime in the desired zone.
 */
function parseHeaderInstant(val: unknown, zone?: string): DateTime | null {
	const z = zone || 'utc';
	try {
		if (typeof val === 'number') {
			// epoch millis → absolute instant → render in zone
			return DateTime.fromMillis(val, { zone: 'utc' }).setZone(z);
		}
		if (typeof val === 'string') {
			// prefer ISO with setZone to respect embedded offsets (+09:00), then coerce to z
			const iso = DateTime.fromISO(val, { setZone: true });
			if (iso.isValid) return iso.setZone(z);
			const sql = DateTime.fromSQL(val, { setZone: true });
			if (sql.isValid) return sql.setZone(z);
		}
	} catch {
		// fall through
	}
	return null;
}

/**
 * Creates a lean PDF data table that displays data from top to bottom, left to right.
 */
export function createPDFDataTable({
	doc,
	dataHeader,
	dataRows,
	config = {}
}: {
	doc: InstanceType<typeof PDFDocument>;
	dataHeader: TableRow;
	dataRows: TableRow[];
	config?: Partial<TableConfig>;
}): void {
	const conf: TableConfig = { ...DEFAULT_CONFIG, ...config };

	// Apply takeEvery filtering (keep every Nth row) plus always keep rows containing any alert/warning cell (bgColor != white)
	const samplingInterval = Math.max(1, conf.takeEvery || 1);
	const workingRows =
		samplingInterval > 1
			? dataRows.filter((row, idx) => {
					const onSeries = idx % samplingInterval === 0; // take first (idx 0), then every Nth
					if (onSeries) return true;
					// Include any row with an alert/warning (detected by any cell having a non-white bgColor)
					const hasAlert = [row.header, ...row.cells].some(
						(c) => (c as any).bgColor && (c as any).bgColor !== '#ffffff'
					);
					return hasAlert;
				})
			: dataRows;

	const { caption, headerHeight, cellWidth, cellHeight, columnsPerPage, columnMargin } = conf;

	const {
		top: marginTop,
		right: marginRight,
		bottom: marginBottom,
		left: marginLeft
	} = doc.page.margins;

	// Page geometry
	const pageHeight = doc.page.height;
	const contentHeight = pageHeight - marginTop - marginBottom;

	const pageWidth = doc.page.width;
	const availableWidth = pageWidth - marginLeft - marginRight;
	const columnWidth = [dataHeader.header, ...dataHeader.cells].reduce(
		(total, col) => total + (col.width ?? cellWidth),
		0
	);
	const totalColumnWidth = columnWidth + columnMargin;
	const actualColumnsPerPage = Math.floor(availableWidth / totalColumnWidth);
	const finalColumnsPerPage = Math.min(columnsPerPage, actualColumnsPerPage);

	if (caption) {
		doc.fillColor('black').fontSize(12).text(caption, marginLeft, doc.y);
		doc.moveDown(0.5);
	}

	let dataIndex = 0;
	let startY = doc.y;

	while (dataIndex < workingRows.length) {
		// Draw columns for current page
		for (let col = 0; col < finalColumnsPerPage && dataIndex < workingRows.length; col++) {
			const firstColumn = col % finalColumnsPerPage === 0;

			if (firstColumn) {
				startY = doc.y;
			}

			let availableHeight = pageHeight - startY - marginBottom - headerHeight;

			// New page if at the bottom
			if (firstColumn && availableHeight < 200) {
				doc.addPage();
				startY = marginTop;
				availableHeight = contentHeight - headerHeight;
			}

			const actualRowsPerColumn = Math.floor(availableHeight / cellHeight);
			const startX = marginLeft + col * (columnWidth + columnMargin);
			const endIndex = Math.min(dataIndex + actualRowsPerColumn, workingRows.length);

			drawColumn({
				doc,
				dataHeader,
				dataRows: workingRows.slice(dataIndex, endIndex),
				columnWidth,
				startX,
				startY,
				config: conf
			});

			dataIndex = endIndex;
		}
	}
}

function drawColumn({
	doc,
	dataHeader,
	dataRows,
	columnWidth,
	startX,
	startY,
	config
}: {
	doc: InstanceType<typeof PDFDocument>;
	dataHeader: TableRow;
	dataRows: TableRow[];
	columnWidth: number;
	startX: number;
	startY: number;
	config: TableConfig;
}): void {
	let currentY = startY;

	const borderColor = '#ccc';
	const { fontSize: defaultFontSize, cellWidth, headerHeight, cellHeight, timezone } = config;

	// Header background
	doc.fillColor('#e8e8e8').rect(startX, currentY, columnWidth, config.headerHeight).fill();
	doc.strokeColor(borderColor).rect(startX, currentY, columnWidth, config.headerHeight).stroke();

	const columns = [dataHeader.header, ...dataHeader.cells];

	const getCellX = (index: number): number =>
		startX + columns.slice(0, index).reduce((total, col) => total + (col.width ?? cellWidth), 0);

	// Column labels
	if (dataRows.length > 0) {
		columns.forEach(({ label, width = columnWidth, fontSize = defaultFontSize }, index) => {
			doc
				.fillColor('#000')
				.fontSize(fontSize)
				.text(label, getCellX(index), currentY + 2, { width, align: 'center' });
		});
	}

	currentY += headerHeight;

	// Data rows
	dataRows.forEach(({ header, cells }, rowIndex) => {
		const isEvenRow = rowIndex % 2 === 0;

		// Row background striping
		doc
			.fillColor(isEvenRow ? '#ffffff' : '#f9f9f9')
			.rect(startX, currentY, columnWidth, cellHeight)
			.fill();

		// Row border
		doc.strokeColor(borderColor).rect(startX, currentY, columnWidth, cellHeight).stroke();

		// ——— Compute first-column timestamp label in the requested timezone ———
		const thisDt = parseHeaderInstant((header as any).value ?? (header as any).label, timezone);
		const prevDt =
			rowIndex > 0
				? parseHeaderInstant(
						(dataRows[rowIndex - 1].header as any).value ??
							(dataRows[rowIndex - 1].header as any).label,
						timezone
					)
				: null;

		// Fallback: if parsing fails, use provided labels as-is
		const thisDay = thisDt
			? thisDt.toFormat('M/d')
			: ((header as any).label?.split(' ')?.[0] ?? '');
		const thisFull = thisDt ? thisDt.toFormat('M/d H:mm') : ((header as any).label ?? '');
		const thisTime = thisDt
			? thisDt.toFormat('H:mm')
			: ((header as any).shortLabel ?? (header as any).label ?? '');

		let computedHeaderLabel = thisFull;
		if (rowIndex > 0) {
			const prevDay = prevDt
				? prevDt.toFormat('M/d')
				: ((dataRows[rowIndex - 1].header as any).label?.split(' ')?.[0] ?? '');
			if (prevDay === thisDay) computedHeaderLabel = thisTime; // same local day → short time
		}
		// ————————————————————————————————————————————————————————————————

		// Render cells
		[header, ...cells].forEach(({ label, bgColor }, cellIndex) => {
			const cellX = getCellX(cellIndex);
			const { width = cellWidth, fontSize = defaultFontSize } = columns[cellIndex];

			// Alert background if provided
			if (bgColor && bgColor !== '#ffffff') {
				doc.fillColor(bgColor).rect(cellX, currentY, width, cellHeight).fill();
			}

			// Cell border
			doc.strokeColor(borderColor).rect(cellX, currentY, width, cellHeight).stroke();

			// Use computed time label for the first column; other columns use provided labels
			const cellLabel = cellIndex === 0 ? computedHeaderLabel : (label ?? '');

			doc
				.fillColor('#000')
				.fontSize(fontSize - 1)
				.text(cellLabel, cellX + 1, currentY + 2, { width: width - 5, align: 'right' });
		});

		currentY += cellHeight;
	});
}
