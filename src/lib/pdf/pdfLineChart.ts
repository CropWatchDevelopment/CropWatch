import PDFDocument from 'pdfkit';
import { DateTime } from 'luxon';

interface ChartData {
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
	showLegend: true,
	colors: ['#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea', '#c2410c'],
	fontSize: 10,
	lineWidth: 2,
	pointRadius: 3,
	title: 'データチャート',
	xAxisLabel: '時間',
	yAxisLabel: '値'
};

/**
 * Creates a line chart in a PDFKit document
 * @param doc - PDFKit document instance
 * @param data - Array of {date, values[]} objects
 * @param alertData - Alert configuration data (optional, for color coding)
 * @param config - Chart configuration options
 */
export function createPDFLineChart(
	doc: InstanceType<typeof PDFDocument>,
	data: ChartData[],
	alertData?: AlertData,
	config: Partial<ChartConfig> = {}
): void {
	const conf = { ...DEFAULT_CHART_CONFIG, ...config };

	if (!data || data.length === 0) {
		console.warn('No data provided for line chart');
		return;
	}

	// Move down to avoid overlap with previous content
	doc.moveDown(2);

	// Calculate chart area using current Y position
	const chartX = conf.margin.left;
	const chartY = doc.y; // Use current Y position instead of fixed margin.top
	const chartWidth = conf.width - conf.margin.left - conf.margin.right;
	const chartHeight = conf.height - conf.margin.top - conf.margin.bottom;

	// Prepare data for plotting
	const timestamps = data.map((d) => new Date(d.date));
	const valueCount = data[0]?.values?.length || 0;

	if (valueCount === 0) {
		console.warn('No values found in data for line chart');
		return;
	}

	// Get min/max values for scaling
	const allValues = data.flatMap((d) => d.values.filter((v) => v !== null && !isNaN(v)));
	const minValue = Math.min(...allValues);
	const maxValue = Math.max(...allValues);
	const valueRange = maxValue - minValue;
	const paddedMin = minValue - valueRange * 0.1;
	const paddedMax = maxValue + valueRange * 0.1;

	// Time range
	const minTime = Math.min(...timestamps.map((t) => t.getTime()));
	const maxTime = Math.max(...timestamps.map((t) => t.getTime()));

	// Scaling functions
	const xScale = (timestamp: Date) => {
		return chartX + ((timestamp.getTime() - minTime) / (maxTime - minTime)) * chartWidth;
	};

	const yScale = (value: number) => {
		return chartY + chartHeight - ((value - paddedMin) / (paddedMax - paddedMin)) * chartHeight;
	};

	// Draw title
	if (conf.title) {
		doc
			.fontSize(14)
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
		const xTicks = Math.min(10, data.length);
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
		const color = conf.colors[valueIndex % conf.colors.length];
		doc.strokeColor(color).lineWidth(conf.lineWidth);

		let firstPoint = true;

		for (let i = 0; i < data.length; i++) {
			const point = data[i];
			const value = point.values[valueIndex];

			if (value !== null && !isNaN(value)) {
				const x = xScale(new Date(point.date));
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
		for (let i = 0; i < data.length; i++) {
			const point = data[i];
			const value = point.values[valueIndex];

			if (value !== null && !isNaN(value)) {
				const x = xScale(new Date(point.date));
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
	doc.fontSize(conf.fontSize).fillColor('#000');
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
	const labelInterval = Math.max(1, Math.floor(data.length / maxXLabels));

	for (let i = 0; i < data.length; i += labelInterval) {
		const timestamp = new Date(data[i].date);
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
			.rotate(-90, chartX - 60, chartY + chartHeight / 2)
			.fontSize(12)
			.text(conf.yAxisLabel, chartX - 60, chartY + chartHeight / 2, {
				align: 'center'
			})
			.restore();
	}

	if (conf.xAxisLabel) {
		doc
			.fontSize(12)
			.text(conf.xAxisLabel, chartX + chartWidth / 2 - 20, chartY + chartHeight + 40, {
				width: 40,
				align: 'center'
			});
	}

	// Draw legend
	if (conf.showLegend && valueCount > 1) {
		const legendX = chartX + chartWidth + 20;
		let legendY = chartY;

		doc.fontSize(10).fillColor('#000');
		doc.text('凡例', legendX, legendY);
		legendY += 20;

		for (let i = 0; i < valueCount; i++) {
			const color = conf.colors[i % conf.colors.length];
			const label = alertData?.alert_points?.[i]?.name || `値${i + 1}`;

			// Color square
			doc.fillColor(color).rect(legendX, legendY, 12, 12).fill();

			// Label
			doc.fillColor('#000').text(label, legendX + 18, legendY + 2);

			legendY += 18;
		}
	}

	// Draw alert thresholds if provided
	if (alertData?.alert_points) {
		doc.strokeColor('#ff0000').lineWidth(1).opacity(0.5);

		alertData.alert_points.forEach((alert, index) => {
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
							.fontSize(8)
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
							.fontSize(8)
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
