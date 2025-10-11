import type { ReportAlertPoint } from '$lib/models/Report';
import { createCanvas, registerFont } from 'canvas';
import path from 'path';
import fs from 'fs';
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
import { DateTime } from 'luxon';

interface ProcessedLabel {
	withTime: string[];
	dateOnly: string;
	dateKey?: string;
}

interface ChartConfig {
	title?: string;
	width: number;
	height: number;
	options?: ChartOptions;
	timezone?: string;
	maxUniqueDatesWithTime?: number;
	maxLabelsWithTime?: number;
}

// Attempt to register a bundled font (important for server environments like Vercel where system fonts are minimal)
(() => {
	const candidatePaths = [
		path.join(process.cwd(), 'static/fonts/NotoSansJP-Regular.ttf'),
		path.join(process.cwd(), 'src/lib/fonts/NotoSansJP-Regular.ttf'),
		path.join(process.cwd(), 'server/fonts/NotoSansJP-Regular.ttf')
	];
	for (const p of candidatePaths) {
		try {
			if (fs.existsSync(p)) {
				registerFont(p, { family: 'NotoSansJP' });
				Chart.defaults.font.family = 'NotoSansJP';
				break;
			}
		} catch {
			/* ignore */
		}
	}
})();

Chart.register([CategoryScale, LineController, LineElement, LinearScale, PointElement]);
Chart.defaults.devicePixelRatio = 3;
Chart.defaults.font.size = 20;
Chart.defaults.font.family = Chart.defaults.font.family || 'sans-serif';

const FALLBACK_DATASET_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea', '#c2410c'];

const DEFAULT_CHART_OPTIONS: ChartOptions<'line'> = {
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
	data: ChartData<'line', (number | null)[], string | string[]>;
	options?: ChartOptions<'line'>;
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
	const {
		title,
		width = 400,
		height = 300,
		options = DEFAULT_CHART_OPTIONS,
		timezone = 'UTC',
		maxUniqueDatesWithTime = 8,
		maxLabelsWithTime = 24
	} = config;

	const parseRowDateTime = (row: TableRow): DateTime | null => {
		const rawValue = row.header.value;
		if (rawValue instanceof Date) {
			return DateTime.fromJSDate(rawValue, { zone: 'utc' }).setZone(timezone);
		}
		if (typeof rawValue === 'string' && rawValue.trim().length) {
			let dt = DateTime.fromISO(rawValue, { setZone: true });
			if (!dt.isValid) dt = DateTime.fromSQL(rawValue, { setZone: true });
			if (!dt.isValid) dt = DateTime.fromRFC2822(rawValue, { setZone: true });
			if (dt.isValid) {
				return dt.setZone(timezone);
			}
		}
		if (row.header.label) {
			const attemptFormats = ['M/d H:mm', 'M/d HH:mm', 'yyyy-MM-dd HH:mm', 'yyyy-MM-dd'];
			for (const format of attemptFormats) {
				const dt = DateTime.fromFormat(row.header.label, format, { zone: timezone });
				if (dt.isValid) {
					return dt;
				}
			}
		}
		return null;
	};

	const uniqueDateKeys = new Set<string>();

	let lastDateTime: DateTime | null = null;

	let processedLabels: ProcessedLabel[] = dataRows.map((row) => {
		const dt = parseRowDateTime(row);
		if (dt) {
			const dateKey = dt.toISODate() ?? dt.toFormat('yyyy-MM-dd');
			if (dateKey) uniqueDateKeys.add(dateKey);
			if (!lastDateTime || dt > lastDateTime) {
				lastDateTime = dt;
			}
			const datePart = dt.toFormat('LLL d');
			const timePart = dt.toFormat('HH:mm');
			return {
				withTime: [datePart, timePart],
				dateOnly: datePart,
				dateKey
			};
		}

		const label = row.header.label || row.header.shortLabel || '';
		if (label.includes('\n')) {
			const [firstLine, secondLine] = label.split('\n');
			if (firstLine) uniqueDateKeys.add(firstLine);
			return {
				withTime: secondLine ? [firstLine, secondLine] : [firstLine],
				dateOnly: firstLine,
				dateKey: firstLine || undefined
			};
		}

		if (label.includes(' ')) {
			const [firstPart, ...rest] = label.split(' ');
			const secondPart = rest.join(' ').trim();
			if (firstPart) uniqueDateKeys.add(firstPart);
			return {
				withTime: secondPart ? [firstPart, secondPart] : [firstPart],
				dateOnly: firstPart,
				dateKey: firstPart || undefined
			};
		}

		if (label) {
			uniqueDateKeys.add(label);
		}

		return {
			withTime: [label],
			dateOnly: label,
			dateKey: label || undefined
		};
	});

	let appendedNextDayLabel = false;

	if (lastDateTime !== null) {
		const nextDayStart = (lastDateTime as DateTime).plus({ days: 1 }).startOf('day');
		const nextDateKey = nextDayStart.toISODate() ?? nextDayStart.toFormat('yyyy-MM-dd');
		if (nextDateKey) uniqueDateKeys.add(nextDateKey);
		const datePart = nextDayStart.toFormat('LLL d');
		const timePart = nextDayStart.toFormat('HH:mm');
		processedLabels = [
			...processedLabels,
			{
				withTime: [datePart, timePart],
				dateOnly: datePart,
				dateKey: nextDateKey
			}
		];
		appendedNextDayLabel = true;
	}

	const includeTime =
		uniqueDateKeys.size <= maxUniqueDatesWithTime && processedLabels.length <= maxLabelsWithTime;

	const chartLabels: (string | string[])[] = processedLabels.map((parts) =>
		includeTime ? parts.withTime : parts.dateOnly
	);

	const firstIndexByDateKey = new Map<string, number>();
	processedLabels.forEach((entry, index) => {
		const key = entry.dateKey ?? entry.dateOnly ?? String(index);
		if (!firstIndexByDateKey.has(key)) {
			firstIndexByDateKey.set(key, index);
		}
	});

	const maxTicksLimit = includeTime
		? Math.min(chartLabels.length, 12)
		: Math.min(uniqueDateKeys.size || chartLabels.length, 12);

	const datasets = dataHeader.cells.map((cell, index) => {
		const color = cell.color || FALLBACK_DATASET_COLORS[index % FALLBACK_DATASET_COLORS.length];
		const data = dataRows.map((row) => {
			const raw = row.cells[index]?.value;
			return typeof raw === 'number' && !Number.isNaN(raw) ? raw : null;
		});
		if (appendedNextDayLabel) {
			data.push(null);
		}
		return {
			label: cell.label,
			data,
			borderColor: color,
			spanGaps: true
		};
	});

	const chartOptions = {
		...DEFAULT_CHART_OPTIONS,
		...options,
		scales: {
			...(options?.scales ?? {}),
			x: {
				type: 'category',
				...(options?.scales?.x ?? {}),
				ticks: {
					...(options?.scales?.x?.ticks ?? {}),
					autoSkip: false,
					maxTicksLimit,
					includeBounds: true,
					callback(value: string | number, index: number) {
						const parsedIndex =
							typeof value === 'number' ? value : Number.parseInt(String(value), 10);
						const fallbackIndex = Number.isNaN(parsedIndex) ? index : parsedIndex;
						const entry = processedLabels[fallbackIndex] ?? processedLabels[index];
						if (!entry) return '';
						const dateKey = entry.dateKey ?? entry.dateOnly ?? String(fallbackIndex);
						const firstIndex = firstIndexByDateKey.get(dateKey) ?? fallbackIndex;
						if (fallbackIndex !== firstIndex) {
							return '';
						}
						return includeTime ? entry.withTime : entry.dateOnly;
					}
				}
			}
		}
	} as ChartOptions<'line'>;

	const data: ChartData<'line', (number | null)[], string | string[]> = {
		labels: chartLabels,
		datasets
	};

	const buffer = createImage({ data, options: chartOptions, width, height });

	doc.x = marinLeft;
	doc.image(buffer, { width, height });

	if (title) {
		doc.fontSize(8).text(title, marinLeft, doc.y, {
			width: doc.page.width - marinLeft - marginRight,
			align: 'center'
		});
	}
};
