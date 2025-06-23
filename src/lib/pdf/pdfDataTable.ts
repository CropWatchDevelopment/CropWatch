import PDFDocument from 'pdfkit';

interface TableData {
	date: string;
	values: number[];
}

interface TableConfig {
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
	columnsPerPage: 4,
	rowsPerColumn: 30,
	cellWidth: 100,
	cellHeight: 25,
	margin: 40,
	columnMargin: 10,
	fontSize: 7,
	headerHeight: 25
};

/**
 * Creates a lean PDF data table that displays data from top to bottom, left to right
 * @param doc - PDFKit document instance
 * @param data - Array of {date, values[]} objects
 * @param config - Optional configuration overrides
 */
export function createPDFDataTable(
	doc: InstanceType<typeof PDFDocument>,
	data: TableData[],
	config: Partial<TableConfig> = {}
): void {
	const conf = { ...DEFAULT_CONFIG, ...config };

	// Calculate how many rows can actually fit on a page
	const pageHeight = doc.page.height;
	const availableHeight = pageHeight - conf.margin * 2 - conf.headerHeight;
	const actualRowsPerColumn = Math.floor(availableHeight / conf.cellHeight);

	// Calculate how many columns can actually fit on a page
	const pageWidth = doc.page.width;
	const availableWidth = pageWidth - conf.margin * 2;
	const totalColumnWidth = conf.cellWidth + conf.columnMargin;
	const actualColumnsPerPage = Math.floor(availableWidth / totalColumnWidth);
	const finalColumnsPerPage = Math.min(conf.columnsPerPage, actualColumnsPerPage);

	console.log('Page width:', pageWidth);
	console.log('Available width:', availableWidth);
	console.log('Column width + margin:', totalColumnWidth);
	console.log('Calculated columns per page:', actualColumnsPerPage);
	console.log('Final columns per page:', finalColumnsPerPage);

	let currentPage = 0;
	let dataIndex = 0;

	while (dataIndex < data.length) {
		if (currentPage > 0) {
			doc.addPage();
		}

		const startY = conf.margin;
		const totalColumns = Math.min(
			finalColumnsPerPage,
			Math.ceil((data.length - dataIndex) / actualRowsPerColumn)
		);

		// Draw columns for current page
		for (let col = 0; col < totalColumns && dataIndex < data.length; col++) {
			const startX = conf.margin + col * (conf.cellWidth + conf.columnMargin);
			const endIndex = Math.min(dataIndex + actualRowsPerColumn, data.length);

			drawColumn(doc, data.slice(dataIndex, endIndex), startX, startY, conf);
			dataIndex = endIndex;
		}

		currentPage++;
	}
}

function drawColumn(
	doc: InstanceType<typeof PDFDocument>,
	columnData: TableData[],
	startX: number,
	startY: number,
	config: TableConfig
): void {
	let currentY = startY;

	// Draw header
	doc.fillColor('#e8e8e8').rect(startX, currentY, config.cellWidth, config.headerHeight).fill();

	doc.strokeColor('#000').rect(startX, currentY, config.cellWidth, config.headerHeight).stroke();

	doc
		.fillColor('#000')
		.fontSize(config.fontSize - 1)
		.text('日時', startX + 5, currentY + 3, {
			width: config.cellWidth - 10,
			align: 'left'
		})
		.text('時刻', startX + 5, currentY + 12, {
			width: config.cellWidth - 10,
			align: 'left'
		});

	// Add value headers if we have data
	if (columnData.length > 0) {
		const valueCount = columnData[0].values.length;
		for (let i = 0; i < valueCount; i++) {
			doc.fontSize(config.fontSize).text(`値${i + 1}`, startX + 40 + i * 20, currentY + 8, {
				width: 15,
				align: 'center'
			});
		}
	}

	currentY += config.headerHeight;

	// Draw data rows
	columnData.forEach((row, index) => {
		const isEvenRow = index % 2 === 0;

		// Row background
		if (!isEvenRow) {
			doc.fillColor('#f9f9f9').rect(startX, currentY, config.cellWidth, config.cellHeight).fill();
		} else {
			doc.fillColor('#ffffff').rect(startX, currentY, config.cellWidth, config.cellHeight).fill();
		}

		// Row border
		doc.strokeColor('#ccc').rect(startX, currentY, config.cellWidth, config.cellHeight).stroke();

		// Date cell - split date and time
		const [datePart, timePart] = row.date.split(' ');

		doc
			.fillColor('#000')
			.fontSize(config.fontSize - 1)
			.text(datePart, startX + 2, currentY + 2, {
				width: 38,
				align: 'left'
			});

		if (timePart) {
			doc.text(timePart, startX + 2, currentY + 12, {
				width: 38,
				align: 'left'
			});
		}

		// Value cells
		row.values.forEach((value, valueIndex) => {
			const cellX = startX + 40 + valueIndex * 20;
			const displayValue = value.toFixed(1);

			// Color coding based on value ranges (similar to your images)
			let bgColor = '#ffffff';
			if (value >= 25)
				bgColor = '#ff4444'; // Red
			else if (value >= 20)
				bgColor = '#ff8800'; // Orange
			else if (value >= 15)
				bgColor = '#ffff00'; // Yellow
			else if (value >= 10) bgColor = '#88ff88'; // Light green

			if (bgColor !== '#ffffff') {
				doc.fillColor(bgColor).rect(cellX, currentY, 20, config.cellHeight).fill();
			}

			// Cell border
			doc.strokeColor('#ccc').rect(cellX, currentY, 20, config.cellHeight).stroke();

			// Value text
			doc
				.fillColor('#000')
				.fontSize(config.fontSize - 1)
				.text(displayValue, cellX + 1, currentY + 6, {
					width: 18,
					align: 'center'
				});
		});

		currentY += config.cellHeight;
	});
}
