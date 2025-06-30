import PDFDocument from 'pdfkit';
import { DateTime } from 'luxon';

interface TableData {
	date: string;
	values: number[];
}

interface AlertPointData {
	id: number;
	name: string;
	operator: string | null;
	min: number | null;
	max: number | null;
	report_id: string;
	created_at: string;
	hex_color: string | null;
	data_point_key: string | null;
}

interface AlertData {
	alert_points: AlertPointData[];
	created_at: string;
	dev_eui: string;
	id: number;
	name: string;
	report_id: string;
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
	alertPointData: AlertData,
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

	let currentPage = 0;
	let dataIndex = 0;

	doc.addPage(); // Add Page break because the data table should always start on a new page.

	// add header with legend of colors and alert points
	doc
		.fillColor('black')
		.fontSize(conf.fontSize)
		.text('アラートポイントの色分け:', conf.margin, conf.margin, {
			width: pageWidth - conf.margin * 2,
			align: 'left'
		});
	const legendStartY = conf.margin + 15;
	// Draw alert points legend
	alertPointData.alert_points.forEach((point, index) => {
		const color = point.hex_color || '#ffffff';
		const legendX =
			conf.margin + (index % finalColumnsPerPage) * (conf.cellWidth + conf.columnMargin);
		// const legendY = legendStartY + Math.floor(index / finalColumnsPerPage) * 15;

		doc.fillColor(color).rect(0, 0, 10, 10).fill();
		doc.fillColor('black').text(point.name, legendX + 15, 0, {
			width: conf.cellWidth - 25,
			align: 'left'
		});
	});

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

			drawColumn(doc, data.slice(dataIndex, endIndex), alertPointData, startX, startY, conf);
			dataIndex = endIndex;
		}

		currentPage++;
	}
}

function drawColumn(
	doc: InstanceType<typeof PDFDocument>,
	columnData: TableData[],
	alertPointData: AlertData,
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
		// Number of values determines how many columns we need
		const valueCount = columnData[0].values.length;

		for (let i = 0; i < valueCount; i++) {
			const headerText = `値${i + 1}`; // "Value 1", "Value 2", etc. in Japanese
			doc.fontSize(config.fontSize).text(headerText, startX + 40 + i * 20, currentY + 8, {
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
		const [datePart, timePart] = DateTime.fromJSDate(new Date(row.date))
			.toFormat('yyyy/MM/dd HH:mm')
			.split(' ');

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

			// Color coding based on alert points
			let bgColor = '#ffffff';

			// Check alert points for this value
			for (const alertPoint of alertPointData.alert_points) {
				if (evaluateAlertCondition(value, alertPoint)) {
					bgColor = alertPoint.hex_color || '#ffffff';
					break; // Use the first matching alert point
				}
			}

			// Apply background color if not white
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

/**
 * Evaluates whether a value meets the alert condition
 * @param value - The data value to check
 * @param alertPoint - The alert point configuration
 * @returns boolean indicating if the condition is met
 */
function evaluateAlertCondition(value: number, alertPoint: AlertPointData): boolean {
	if (!alertPoint.operator) {
		return false;
	}

	switch (alertPoint.operator) {
		case '>':
			return alertPoint.min !== null && value > alertPoint.min;
		case '>=':
			return alertPoint.min !== null && value >= alertPoint.min;
		case '<':
			return alertPoint.max !== null && value < alertPoint.max;
		case '<=':
			return alertPoint.max !== null && value <= alertPoint.max;
		case '==':
		case '=':
			return (
				(alertPoint.min !== null && value === alertPoint.min) ||
				(alertPoint.max !== null && value === alertPoint.max)
			);
		case '!=':
			return (
				alertPoint.min !== null &&
				value !== alertPoint.min &&
				alertPoint.max !== null &&
				value !== alertPoint.max
			);
		case 'between':
			return (
				alertPoint.min !== null &&
				alertPoint.max !== null &&
				value >= alertPoint.min &&
				value <= alertPoint.max
			);
		case 'outside':
			return (
				alertPoint.min !== null &&
				alertPoint.max !== null &&
				(value < alertPoint.min || value > alertPoint.max)
			);
		default:
			return false;
	}
}
