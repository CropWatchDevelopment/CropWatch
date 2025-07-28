import type { ReportAlertPoint } from '$lib/models/Report';
import { DateTime } from 'luxon';
import PDFDocument from 'pdfkit';
import type { TableRow } from '.';

interface ChartConfig {
	width: number;
	height: number;
	margin: {
		top: number;
		right: number;
		bottom: number;
		left: number;
	};
	gridLines: boolean;
	showLegend: boolean;
	colors: string[];
	fontSize: number;
	lineWidth: number;
	pointRadius: number;
	title?: string;
	legendLabel?: string;
	xAxisLabel?: string;
	yAxisLabel?: string;
}

const DEFAULT_CHART_CONFIG: ChartConfig = {
	width: 500,
	height: 300,
	margin: {
		top: 40,
		right: 60,
		bottom: 60,
		left: 80
	},
	gridLines: true,
	showLegend: false,
	colors: ['#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea', '#c2410c'],
	fontSize: 6,
	lineWidth: 2,
	pointRadius: 3,
	title: '',
	legendLabel: '',
	xAxisLabel: '',
	yAxisLabel: ''
};

/**
 * Creates a line chart in a PDFKit document
 * @param {object} params
 * @param params.doc - PDFKit document instance
 * @param params.dataHeader - Array of column definitions
 * @param params.dataRows - Array of data rows, each row is an array of values
 * @param params.alertData - Alert configuration data (optional, for color coding)
 * @param params.config - Chart configuration options
 */
export function createPDFLineChart({
	doc,
	dataHeader,
	dataRows,
	alertPoints,
	config = {}
}: {
	doc: InstanceType<typeof PDFDocument>;
	dataHeader: TableRow;
	dataRows: TableRow[];
	alertPoints: ReportAlertPoint[];
	config?: Partial<ChartConfig>;
}): void {
	const conf = { ...DEFAULT_CHART_CONFIG, ...config };
	const { fontSize } = conf;

	if (!dataRows || !dataRows.length) {
		console.warn('No data provided for line chart');
		return;
	}

	// Calculate chart area using current Y position
	const chartX = conf.margin.left;
	const chartY = doc.y; // Use current Y position instead of fixed margin.top
	const chartWidth = conf.width - conf.margin.left - conf.margin.right - 100;
	const chartHeight = conf.height - conf.margin.top - conf.margin.bottom - 100;

	// Prepare data for plotting
	const timestamps = dataRows.map(({ header }) => header.value as Date);
	const valueCount = dataRows[0]?.cells?.length ?? 0;

	if (valueCount === 0) {
		console.warn('No values found in data for line chart');
		return;
	}

	// Get min/max values for scaling
	const allValues = dataRows.flatMap((d) =>
		d.cells.map(({ value }) => value).filter((value) => typeof value === 'number' && !isNaN(value))
	) as number[];

	// Handle case where there are no valid numeric values
	if (allValues.length === 0) {
		console.warn('No valid numeric values found for line chart');
		return;
	}

	const minValue = Math.min(...allValues);
	const maxValue = Math.max(...allValues);
	const valueRange = maxValue - minValue;

	// Handle case where all values are the same (valueRange = 0)
	const paddedMin = valueRange === 0 ? minValue - 1 : minValue - valueRange * 0.1;
	const paddedMax = valueRange === 0 ? maxValue + 1 : maxValue + valueRange * 0.1;

	// Time range
	const minTime = Math.min(...timestamps.map((t) => t.getTime()));
	const maxTime = Math.max(...timestamps.map((t) => t.getTime()));
	const timeRange = maxTime - minTime;

	// Scaling functions
	const xScale = (timestamp: Date) => {
		return timeRange === 0
			? chartX + chartWidth / 2
			: chartX + ((timestamp.getTime() - minTime) / timeRange) * chartWidth;
	};

	const yScale = (value: number) => {
		const paddedRange = paddedMax - paddedMin;
		return paddedRange === 0
			? chartY + chartHeight / 2
			: chartY + chartHeight - ((value - paddedMin) / paddedRange) * chartHeight;
	};

	// Draw title
	if (conf.title) {
		doc
			.fontSize(12)
			.fillColor('#000')
			.text(conf.title, chartX, chartY - 30, {
				width: chartWidth,
				align: 'center'
			});
	}

	// Draw chart background
	doc
		.rect(chartX, chartY, chartWidth, chartHeight)
		.fillColor('#fafafa')
		.fill()
		.strokeColor('#ddd')
		.stroke();

	// Draw grid lines
	if (conf.gridLines) {
		doc.strokeColor('#e5e5e5').lineWidth(0.5);

		// Horizontal grid lines
		const yTicks = 5;
		for (let i = 0; i <= yTicks; i++) {
			const y = chartY + (i / yTicks) * chartHeight;
			doc
				.moveTo(chartX, y)
				.lineTo(chartX + chartWidth, y)
				.stroke();
		}

		// Vertical grid lines
		const xTicks = Math.min(10, dataRows.length);
		for (let i = 0; i <= xTicks; i++) {
			const x = chartX + (i / xTicks) * chartWidth;
			doc
				.moveTo(x, chartY)
				.lineTo(x, chartY + chartHeight)
				.stroke();
		}
	}

	// Draw data lines
	for (let valueIndex = 0; valueIndex < valueCount; valueIndex++) {
		const { color = conf.colors[valueIndex % conf.colors.length] } = dataHeader.cells[valueIndex];
		doc.strokeColor(color).lineWidth(conf.lineWidth);

		let firstPoint = true;

		for (let i = 0; i < dataRows.length; i++) {
			const { header, cells } = dataRows[i];
			const value = cells[valueIndex].value;

			if (typeof value === 'number' && !Number.isNaN(value)) {
				const x = xScale(header.value as Date);
				const y = yScale(value);

				if (firstPoint) {
					doc.moveTo(x, y);
					firstPoint = false;
				} else {
					doc.lineTo(x, y);
				}
			}
		}

		doc.stroke();

		// Draw data points
		doc.fillColor(color);
		for (let i = 0; i < dataRows.length; i++) {
			const { header, cells } = dataRows[i];
			const value = cells[valueIndex].value;

			if (typeof value === 'number' && !Number.isNaN(value)) {
				const x = xScale(header.value as Date);
				const y = yScale(value);

				doc.circle(x, y, conf.pointRadius).fill();
			}
		}
	}

	// Draw axes
	doc.strokeColor('#000').lineWidth(1);

	// Y-axis
	doc
		.moveTo(chartX, chartY)
		.lineTo(chartX, chartY + chartHeight)
		.stroke();

	// X-axis
	doc
		.moveTo(chartX, chartY + chartHeight)
		.lineTo(chartX + chartWidth, chartY + chartHeight)
		.stroke();

	// Y-axis labels and ticks
	doc.fontSize(fontSize).fillColor('#000');
	const yTicks = 5;
	for (let i = 0; i <= yTicks; i++) {
		const value = paddedMin + (i / yTicks) * (paddedMax - paddedMin);
		const y = chartY + chartHeight - (i / yTicks) * chartHeight;

		// Tick mark
		doc
			.moveTo(chartX - 5, y)
			.lineTo(chartX, y)
			.stroke();

		// Label
		doc.text(value.toFixed(1), chartX - 50, y - 5, {
			width: 40,
			align: 'right'
		});
	}

	// X-axis labels and ticks
	const maxXLabels = 6;
	const labelInterval = Math.max(1, Math.floor(dataRows.length / maxXLabels));

	for (let i = 0; i < dataRows.length; i += labelInterval) {
		const timestamp = new Date(dataRows[i].header.value as Date);
		const x = xScale(timestamp);

		// Tick mark
		doc
			.moveTo(x, chartY + chartHeight)
			.lineTo(x, chartY + chartHeight + 5)
			.stroke();

		// Label
		const dateStr = DateTime.fromJSDate(timestamp).toFormat('MM/dd\nHH:mm');
		doc.text(dateStr, x - 20, chartY + chartHeight + 10, {
			width: 40,
			align: 'center'
		});
	}

	// Axis labels
	if (conf.yAxisLabel) {
		doc
			.save()
			.rotate(-90)
			.fontSize(fontSize)
			.text(conf.yAxisLabel, chartX - 60, chartY + chartHeight / 2, {
				align: 'center'
			})
			.restore();
	}

	if (conf.xAxisLabel) {
		doc
			.fontSize(fontSize)
			.text(conf.xAxisLabel, chartX + chartWidth / 2 - 20, chartY + chartHeight + 40, {
				width: 40,
				align: 'center'
			});
	}

	// Draw legend
	if (conf.showLegend && valueCount > 1) {
		const legendX = chartX + chartWidth + 20;
		let legendY = chartY;

		doc.fontSize(fontSize).fillColor('#000');
		doc.text(conf.legendLabel ?? 'Legend', legendX, legendY);
		legendY += 20;

		for (let i = 0; i < valueCount; i++) {
			const { label, color = conf.colors[i % conf.colors.length] } = dataHeader.cells[i];

			// Color square
			doc.fillColor(color).rect(legendX, legendY, 12, 12).fill();

			// Label
			doc.fillColor('#000').text(label, legendX + 18, legendY + 2);

			legendY += 18;
		}
	}

	// Draw alert thresholds if provided
	if (alertPoints.length) {
		doc.strokeColor('#ff0000').lineWidth(1).opacity(0.5);

		alertPoints.forEach((alert, index) => {
			if (index < valueCount) {
				// Draw min threshold
				if (alert.min !== null) {
					const y = yScale(alert.min);
					if (y >= chartY && y <= chartY + chartHeight) {
						doc
							.moveTo(chartX, y)
							.lineTo(chartX + chartWidth, y)
							.stroke();
						doc
							.fontSize(fontSize)
							.fillColor('#ff0000')
							.text(`最小: ${alert.min}`, chartX + chartWidth - 60, y - 10);
					}
				}

				// Draw max threshold
				if (alert.max !== null) {
					const y = yScale(alert.max);
					if (y >= chartY && y <= chartY + chartHeight) {
						doc
							.moveTo(chartX, y)
							.lineTo(chartX + chartWidth, y)
							.stroke();
						doc
							.fontSize(fontSize)
							.fillColor('#ff0000')
							.text(`最大: ${alert.max}`, chartX + chartWidth - 60, y + 5);
					}
				}
			}
		});

		doc.opacity(1); // Reset opacity
	}

	// Update the Y position to account for chart height and additional spacing
	doc.y = chartY + chartHeight + conf.margin.bottom + 20;
}
