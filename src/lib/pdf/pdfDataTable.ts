import PDFDocument from 'pdfkit';
import type { TableRow } from '.';

interface TableConfig {
	caption?: string;
	columnsPerPage: number;
	rowsPerColumn: number;
	cellWidth: number;
	cellHeight: number;
	margin: number;
	columnMargin: number;
	fontSize: number;
	headerHeight: number;
}

const DEFAULT_CONFIG: TableConfig = {
	caption: '',
	columnsPerPage: 4,
	rowsPerColumn: 30,
	cellWidth: 100,
	cellHeight: 12,
	margin: 40,
	columnMargin: 10,
	fontSize: 7,
	headerHeight: 15
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

	const { caption, margin, headerHeight, cellWidth, cellHeight, columnsPerPage, columnMargin } =
		conf;

	// Calculate how many rows can actually fit on a page
	const pageHeight = doc.page.height;
	const availableHeight = pageHeight - margin * 2 - headerHeight - 50; // 50 for caption space
	const actualRowsPerColumn = Math.floor(availableHeight / cellHeight);

	// Calculate how many columns can actually fit on a page
	const pageWidth = doc.page.width;
	const availableWidth = pageWidth - margin * 2;
	const columnWidth = [dataHeader.header, ...dataHeader.cells].reduce(
		(total, col) => total + (col.width ?? cellWidth),
		0
	);
	const totalColumnWidth = columnWidth + columnMargin;
	const actualColumnsPerPage = Math.floor(availableWidth / totalColumnWidth);
	const finalColumnsPerPage = Math.min(columnsPerPage, actualColumnsPerPage);

	if (caption) {
		doc.fillColor('black').fontSize(12).text(caption, margin, doc.y);
		doc.moveDown(0.5);
	}

	let currentPage = 0;
	let dataIndex = 0;
	let startY = doc.y;

	while (dataIndex < dataRows.length) {
		if (currentPage > 0) {
			doc.addPage();
			startY = margin;
		}

		const totalColumns = Math.min(
			finalColumnsPerPage,
			Math.ceil((dataRows.length - dataIndex) / actualRowsPerColumn)
		);

		// Draw columns for current page
		for (let col = 0; col < totalColumns && dataIndex < dataRows.length; col++) {
			const startX = margin + col * (columnWidth + columnMargin);
			const endIndex = Math.min(dataIndex + actualRowsPerColumn, dataRows.length);

			drawColumn({
				doc,
				dataHeader,
				dataRows: dataRows.slice(dataIndex, endIndex),
				columnWidth,
				startX,
				startY,
				config: conf
			});
			dataIndex = endIndex;
		}

		currentPage++;
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
	dataRows.forEach(({ header, cells }, index) => {
		const isEvenRow = index % 2 === 0;

		// Row background
		if (!isEvenRow) {
			doc.fillColor('#f9f9f9').rect(startX, currentY, columnWidth, cellHeight).fill();
		} else {
			doc.fillColor('#ffffff').rect(startX, currentY, columnWidth, cellHeight).fill();
		}

		// Row border
		doc.strokeColor(borderColor).rect(startX, currentY, columnWidth, cellHeight).stroke();

		[header, ...cells].forEach(({ label, bgColor }, cellIndex) => {
			const cellX = getCellX(cellIndex);
			const { width = cellWidth, fontSize = defaultFontSize } = columns[cellIndex];

			// Apply background color if not white
			if (bgColor && bgColor !== '#ffffff') {
				doc.fillColor(bgColor).rect(cellX, currentY, width, cellHeight).fill();
			}

			// Cell border
			doc.strokeColor(borderColor).rect(cellX, currentY, width, cellHeight).stroke();

			// Value text
			doc
				.fillColor('#000')
				.fontSize(fontSize - 1)
				.text(label, cellX + 1, currentY + 2, { width: width - 5, align: 'right' });
		});

		currentY += cellHeight;
	});
}
