import type { ReportAlertPoint } from '$lib/models/Report';
import { createCanvas } from 'canvas';
import {
	CategoryScale,
	Chart,
	LinearScale,
	LineController,
	LineElement,
	PointElement,
	type ChartData,
	type ChartOptions
} from 'chart.js';
import PDFDocument from 'pdfkit';
import type { TableRow } from '.';

interface ChartConfig {
	title?: string;
	width: number;
	height: number;
	options?: ChartOptions;
}

Chart.register([CategoryScale, LineController, LineElement, LinearScale, PointElement]);
Chart.defaults.devicePixelRatio = 3;
Chart.defaults.font.size = 20;

const DEFAULT_CHART_OPTIONS: ChartOptions = {
	elements: {
		line: {
			borderWidth: 4,
			tension: 0.2 // Smooth line
		},
		point: {
			radius: 0 // No points on the line
		}
	}
};

/**
 * Creates a line chart image using Chart.js and returns it as a buffer.
 * @returns A buffer containing the image data for a line chart.
 * @see https://www.chartjs.org/docs/latest/getting-started/using-from-node-js.html
 */
const createImage = ({
	data,
	options,
	width,
	height
}: {
	data: ChartData;
	options?: ChartOptions;
	width: number;
	height: number;
}): Buffer => {
	const canvas = createCanvas(width, height);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const chart = new Chart(canvas as any, { type: 'line', data, options });
	const buffer = canvas.toBuffer();

	chart.destroy();

	return buffer;
};

/**
 * Creates a line chart in a PDFKit document
 * @param {object} params
 * @param params.doc - PDFKit document instance
 * @param params.dataHeader - Array of column definitions
 * @param params.dataRows - Array of data rows, each row is an array of values
 * @param params.config - Chart configuration options
 */
export const createPDFLineChartImage = ({
	doc,
	dataHeader,
	dataRows,
	config = {}
}: {
	doc: InstanceType<typeof PDFDocument>;
	dataHeader: TableRow;
	dataRows: TableRow[];
	alertPoints: ReportAlertPoint[];
	config?: Partial<ChartConfig>;
}): void => {
	if (!dataRows?.length) {
		console.warn('No data provided for line chart');
		return;
	}

	const { left: marinLeft, right: marginRight } = doc.page.margins;
	const { title, width = 400, height = 300, options = DEFAULT_CHART_OPTIONS } = config;

	const data: ChartData = {
		labels: dataRows.map((row) => row.header.shortLabel || row.header.label),
		datasets: [
			{
				label: dataHeader.header.label,
				data: dataRows.map((row) => row.cells[0].value as number),
				borderColor: dataHeader.cells[0].color || 'blue'
			}
		]
	};

	const buffer = createImage({ data, options, width, height });

	doc.x = marinLeft;
	doc.image(buffer, { width, height });

	if (title) {
		doc.fontSize(8).text(title, marinLeft, doc.y, {
			width: doc.page.width - marinLeft - marginRight,
			align: 'center'
		});
	}
};
