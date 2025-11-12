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
	headerFontSize: number;
	headerHeight: number;
	takeEvery: number; // keep every Nth row (always keep rows with alert bgColor)
	timezone?: string; // e.g., 'Asia/Tokyo'
}

const DEFAULT_CONFIG: TableConfig = {
	caption: '',
	columnsPerPage: 4,
	rowsPerColumn: 25,
	cellWidth: 45,
	cellHeight: 20,
	columnMargin: 3,
	fontSize: 12,
	headerFontSize: 10,
	headerHeight: 20,
	takeEvery: 3,
	timezone: 'utc'
};

const MIN_COLUMN_SCALE = 0.9;

export const rowHasAlert = (row: TableRow) =>
	[row.header, ...row.cells].some((cell) => cell.bgColor && cell.bgColor !== '#ffffff');

export function sampleDataRowsForTable(
	dataRows: TableRow[],
	takeEvery: number = DEFAULT_CONFIG.takeEvery
): TableRow[] {
	const samplingInterval = Math.max(1, takeEvery || 1);
	if (samplingInterval <= 1) return dataRows;
	return dataRows.filter((row, idx) => idx % samplingInterval === 0 || rowHasAlert(row));
}

function getRowTimestamp(row: TableRow): number | null {
	const value = row?.header?.value;
	if (value instanceof Date) return value.getTime();
	if (typeof value === 'number') return value;
	if (typeof value === 'string' && value.length) {
		const parsed = Date.parse(value);
		if (!Number.isNaN(parsed)) {
			return parsed;
		}
	}
	if (row?.header?.label) {
		const parsed = Date.parse(row.header.label);
		if (!Number.isNaN(parsed)) {
			return parsed;
		}
	}
	return null;
}

export function sampleDataRowsByInterval(
	dataRows: TableRow[],
	intervalMinutes: number
): TableRow[] {
	const intervalMs = intervalMinutes > 0 ? intervalMinutes * 60 * 1000 : 0;
	if (!intervalMs) return dataRows;
	const sampled: TableRow[] = [];
	let lastKeptTimestamp: number | null = null;

	for (const row of dataRows) {
		const timestamp = getRowTimestamp(row);
		const hasAlert = rowHasAlert(row);
		const shouldInclude =
			hasAlert ||
			!sampled.length ||
			timestamp === null ||
			lastKeptTimestamp === null ||
			timestamp - lastKeptTimestamp >= intervalMs;

		if (shouldInclude) {
			sampled.push(row);
			if (timestamp !== null) {
				lastKeptTimestamp = timestamp;
			}
		}
	}

	return sampled;
}

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

	const workingRows = sampleDataRowsForTable(dataRows, conf.takeEvery);

	const { caption, headerHeight, cellWidth, cellHeight, columnsPerPage, columnMargin } = conf;

	const {
		top: marginTop,
		right: marginRight,
		bottom: marginBottom,
		left: marginLeft
	} = doc.page.margins;

	// Page geometry
	const pageHeight = doc.page.height;

	const pageWidth = doc.page.width;
	const availableWidth = pageWidth - marginLeft - marginRight;
	const columns = [dataHeader.header, ...dataHeader.cells];
	const columnCount = columns.length;
	const uniformWidth = Math.max(1, cellWidth);
	const previousFontSize = (doc as unknown as { _fontSize?: number })._fontSize ?? conf.fontSize;
	const bodyFontSize = Math.max(6, (dataHeader.header.fontSize ?? conf.fontSize) - 1);
	const measurementFontSize = Math.max(6, bodyFontSize);
	doc.fontSize(measurementFontSize);
	const headerLabelWidth = doc.widthOfString(String(dataHeader.header.label ?? ''));
	let widestTimeLabel = headerLabelWidth;
	for (const row of workingRows) {
		const dt = parseHeaderInstant(
			(row.header as any).value ?? (row.header as any).label,
			conf.timezone
		);
		const labelCandidate = dt ? dt.toFormat('M/d H:mm') : String((row.header as any).label ?? '');
		widestTimeLabel = Math.max(widestTimeLabel, doc.widthOfString(labelCandidate));
	}
	const firstColumnBaseWidth = Math.max(uniformWidth, widestTimeLabel + 8);
	doc.fontSize(previousFontSize);
	const baseColumnWidth = firstColumnBaseWidth + (columnCount - 1) * uniformWidth;

	const computeColumnLayout = (rowsRemaining: number, rowsPerColumn: number) => {
		const maxNeededColumns = Math.max(1, Math.ceil(rowsRemaining / rowsPerColumn));
		const maxCandidate = Math.max(1, Math.min(columnsPerPage, maxNeededColumns));
		let chosenCount = 1;
		let chosenScale = 1;
		let effectiveWidth = baseColumnWidth;

		for (let candidate = maxCandidate; candidate >= 1; candidate--) {
			const totalWidthNeeded = baseColumnWidth * candidate + columnMargin * (candidate - 1);
			if (totalWidthNeeded <= availableWidth) {
				chosenCount = candidate;
				chosenScale = 1;
				effectiveWidth = baseColumnWidth;
				break;
			}

			const usableWidth = availableWidth - columnMargin * (candidate - 1);
			if (usableWidth <= 0) continue;
			const scale = usableWidth / (baseColumnWidth * candidate);
			if (candidate === 1 || scale >= MIN_COLUMN_SCALE) {
				chosenCount = candidate;
				chosenScale = Math.min(1, scale);
				effectiveWidth = baseColumnWidth * chosenScale;
				break;
			}
		}

		const totalWidthUsed =
			chosenCount * effectiveWidth + columnMargin * Math.max(0, chosenCount - 1);
		const offsetX = marginLeft + Math.max(0, (availableWidth - totalWidthUsed) / 2);

		return {
			columnsThisPage: chosenCount,
			columnScale: chosenScale,
			effectiveColumnWidth: effectiveWidth,
			offsetX
		};
	};

	if (caption) {
		doc.fillColor('black').fontSize(12).text(caption, marginLeft, doc.y);
		doc.moveDown(0.5);
	}

	let dataIndex = 0;

	while (dataIndex < workingRows.length) {
		const pageTop = doc.y;
		let availableHeightForPage = pageHeight - marginBottom - pageTop - headerHeight;

		if (availableHeightForPage < cellHeight) {
			doc.addPage();
			doc.y = marginTop;
			continue;
		}

		const actualRowsPerColumn = Math.max(1, Math.floor(availableHeightForPage / cellHeight));
		const rowsRemaining = workingRows.length - dataIndex;
		const { columnsThisPage, columnScale, effectiveColumnWidth, offsetX } = computeColumnLayout(
			rowsRemaining,
			actualRowsPerColumn
		);
		let tallestColumnHeight = headerHeight;
		const maxColumnsForData = Math.max(
			1,
			Math.min(columnsThisPage, Math.ceil(rowsRemaining / actualRowsPerColumn))
		);

		for (let col = 0; col < maxColumnsForData && dataIndex < workingRows.length; col++) {
			const startX = offsetX + col * (effectiveColumnWidth + columnMargin);
			const endIndex = Math.min(dataIndex + actualRowsPerColumn, workingRows.length);
			const columnRows = workingRows.slice(dataIndex, endIndex);

			if (columnRows.length === 0) {
				break;
			}

			drawColumn({
				doc,
				dataHeader,
				dataRows: columnRows,
				columnScale,
				startX,
				startY: pageTop,
				config: conf,
				firstColumnBaseWidth
			});

			const columnHeight = headerHeight + columnRows.length * cellHeight;
			tallestColumnHeight = Math.max(tallestColumnHeight, columnHeight);
			dataIndex = endIndex;
		}

		doc.y = pageTop + tallestColumnHeight + columnMargin;

		if (dataIndex < workingRows.length) {
			doc.addPage();
			doc.y = marginTop;
		}
	}
}

function drawColumn({
	doc,
	dataHeader,
	dataRows,
	columnScale,
	startX,
	startY,
	config,
	firstColumnBaseWidth
}: {
	doc: InstanceType<typeof PDFDocument>;
	dataHeader: TableRow;
	dataRows: TableRow[];
	columnScale: number;
	startX: number;
	startY: number;
	config: TableConfig;
	firstColumnBaseWidth: number;
}): void {
	let currentY = startY;

	const borderColor = '#ccc';
	const {
		fontSize: defaultFontSize,
		headerFontSize,
		headerHeight,
		cellHeight,
		timezone,
		cellWidth: configCellWidth
	} = config;
	const uniformWidth = Math.max(1, configCellWidth);
	const scaledColumns = [dataHeader.header, ...dataHeader.cells].map((col, index) => ({
		...col,
		effectiveWidth:
			columnScale * (index === 0 ? Math.max(uniformWidth, firstColumnBaseWidth) : uniformWidth)
	}));
	const scaledColumnWidth = scaledColumns.reduce((total, col) => total + col.effectiveWidth, 0);

	// Header background
	doc.fillColor('#e8e8e8').rect(startX, currentY, scaledColumnWidth, config.headerHeight).fill();
	doc
		.strokeColor(borderColor)
		.rect(startX, currentY, scaledColumnWidth, config.headerHeight)
		.stroke();

	const getCellX = (index: number): number =>
		startX + scaledColumns.slice(0, index).reduce((total, col) => total + col.effectiveWidth, 0);

	// Column labels
	if (dataRows.length > 0) {
		scaledColumns.forEach(({ label, effectiveWidth, fontSize }, index) => {
			const headerLabelFontSize = fontSize ?? headerFontSize ?? defaultFontSize;
			doc.save();
			doc.rect(getCellX(index), currentY, effectiveWidth, headerHeight).clip();
			doc
				.fillColor('#000')
				.fontSize(headerLabelFontSize)
				.text(label, getCellX(index) + 2, currentY + 2, {
					width: Math.max(1, effectiveWidth - 4),
					align: 'center',
					lineBreak: false
				});
			doc.restore();
		});
	}

	currentY += headerHeight;

	// Data rows
	dataRows.forEach(({ header, cells }, rowIndex) => {
		const isEvenRow = rowIndex % 2 === 0;

		// Row background striping
		doc
			.fillColor(isEvenRow ? '#ffffff' : '#f9f9f9')
			.rect(startX, currentY, scaledColumnWidth, cellHeight)
			.fill();

		// Row border
		doc.strokeColor(borderColor).rect(startX, currentY, scaledColumnWidth, cellHeight).stroke();

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
			const { effectiveWidth, fontSize = defaultFontSize } = scaledColumns[cellIndex];

			// Alert background if provided
			if (bgColor && bgColor !== '#ffffff') {
				doc.fillColor(bgColor).rect(cellX, currentY, effectiveWidth, cellHeight).fill();
			}

			// Cell border
			doc.strokeColor(borderColor).rect(cellX, currentY, effectiveWidth, cellHeight).stroke();

			// Use computed time label for the first column; other columns use provided labels
			const cellLabel = cellIndex === 0 ? computedHeaderLabel : (label ?? '');

			doc.save();
			doc.rect(cellX, currentY, effectiveWidth, cellHeight).clip();
			const isFirstColumn = cellIndex === 0;
			const isLastColumn = cellIndex === scaledColumns.length - 1;
			const horizontalPadding = isFirstColumn ? 4 : isLastColumn ? 4 : 2;
			const textAlign = isFirstColumn ? 'left' : isLastColumn ? 'right' : 'right';
			doc
				.fillColor('#000')
				.fontSize(Math.max(6, fontSize - 1))
				.text(cellLabel, cellX + horizontalPadding, currentY + 2, {
					width: Math.max(1, effectiveWidth - horizontalPadding * 2),
					align: textAlign,
					lineBreak: false
				});
			doc.restore();
		});

		currentY += cellHeight;
	});
}
