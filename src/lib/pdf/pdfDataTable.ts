import PDFDocument from 'pdfkit';
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
	takeEvery: number; // This is the numbered item in the array to take and you will skip others unless they are an alert type.
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
	takeEvery: 3
};

/**
 * Creates a lean PDF data table that displays data from top to bottom, left to right
 * @param params
 * @param params.doc - PDFKit document instance
 * @param params.dataHeader - Header row containing column labels
 * @param params.dataRows - Array of data rows, each row is an array of values
 * @param params.config - Optional configuration overrides
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
	const conf = { ...DEFAULT_CONFIG, ...config };

	// Apply takeEvery filtering (keep every Nth row) plus always keep rows containing any alert/warning cell (bgColor != white)
	// N = conf.takeEvery (defaults to 3). If N <= 1, no sampling (all rows kept).
	const samplingInterval = Math.max(1, conf.takeEvery || 1);
	const workingRows =
		samplingInterval > 1
			? dataRows.filter((row, idx) => {
					const onSeries = idx % samplingInterval === 0; // take first (idx 0), then every Nth
					if (onSeries) return true;
					// Include any row with an alert/warning (detected by any cell having a non-white bgColor)
					const hasAlert = [row.header, ...row.cells].some(
						(c) => c.bgColor && c.bgColor !== '#ffffff'
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

	// Calculate how many rows can actually fit on a page
	const pageHeight = doc.page.height;
	const contentHeight = pageHeight - marginTop - marginBottom;

	// Calculate how many columns can actually fit on a page
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

			// Insert a new page if we are at the bottom of the current page
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
	const { fontSize: defaultFontSize, cellWidth, headerHeight, cellHeight } = config;

	// Draw header
	doc.fillColor('#e8e8e8').rect(startX, currentY, columnWidth, config.headerHeight).fill();

	doc.strokeColor(borderColor).rect(startX, currentY, columnWidth, config.headerHeight).stroke();

	const columns = [dataHeader.header, ...dataHeader.cells];

	const getCellX = (index: number): number =>
		startX + columns.slice(0, index).reduce((total, col) => total + (col.width ?? cellWidth), 0);

	// Add value headers if we have data
	if (dataRows.length > 0) {
		columns.forEach(({ label, width = columnWidth, fontSize = defaultFontSize }, index) => {
			doc
				.fillColor('#000')
				.fontSize(fontSize)
				.text(label, getCellX(index), currentY + 2, { width, align: 'center' });
		});
	}

	currentY += headerHeight;

	// Draw data rows
	dataRows.forEach(({ header, cells }, rowIndex) => {
		const isEvenRow = rowIndex % 2 === 0;

		// Row background
		if (!isEvenRow) {
			doc.fillColor('#f9f9f9').rect(startX, currentY, columnWidth, cellHeight).fill();
		} else {
			doc.fillColor('#ffffff').rect(startX, currentY, columnWidth, cellHeight).fill();
		}

		// Row border
		doc.strokeColor(borderColor).rect(startX, currentY, columnWidth, cellHeight).stroke();

		[header, ...cells].forEach(({ label, shortLabel, bgColor }, cellIndex) => {
			const cellX = getCellX(cellIndex);
			const { width = cellWidth, fontSize = defaultFontSize } = columns[cellIndex];

			// Apply background color if not white
			if (bgColor && bgColor !== '#ffffff') {
				doc.fillColor(bgColor).rect(cellX, currentY, width, cellHeight).fill();
			}

			// Cell border
			doc.strokeColor(borderColor).rect(cellX, currentY, width, cellHeight).stroke();

			let labelText = label;

			// If the row is not the first one and a short label is provided, check if we can use it
			if (rowIndex > 0 && shortLabel) {
				const previousLabel = dataRows[rowIndex - 1]?.header.label;

				// If the previous date is the same as the current date, use the short label
				if (previousLabel.split(' ')[0] === label.split(' ')[0]) {
					labelText = shortLabel;
				}
			}

			// Value text
			doc
				.fillColor('#000')
				.fontSize(fontSize - 1)
				.text(labelText, cellX + 1, currentY + 2, { width: width - 5, align: 'right' });
		});

		currentY += cellHeight;
	});
}
