export type CsvRow = Record<string, unknown>;

interface DownloadCsvOptions {
	locationName: string;
	devEui: string;
	rangeLabel: string;
}

export function downloadCsv(rows: CsvRow[], options: DownloadCsvOptions): void {
	if (rows.length === 0) {
		return;
	}

	const columns = getColumns(rows);
	const records = rows.map((row) =>
		columns.map((column) => escapeCsvValue(formatCsvValue(row[column])))
	);
	const csv = [columns.join(','), ...records.map((record) => record.join(','))].join('\n');

	const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	const safeLocationName = sanitizeFileName(options.locationName);
	const safeDevEui = sanitizeFileName(options.devEui);

	link.href = url;
	link.download = `${safeLocationName}-${safeDevEui}-${options.rangeLabel}-data.csv`;
	document.body.append(link);
	link.click();
	link.remove();

	URL.revokeObjectURL(url);
}

function escapeCsvValue(value: string | number): string {
	const normalized = String(value);
	if (/[,"\n]/.test(normalized)) {
		return `"${normalized.replace(/"/g, '""')}"`;
	}
	return normalized;
}

function formatCsvValue(value: unknown): string | number {
	if (value == null) {
		return '';
	}

	if (value instanceof Date) {
		return value.toISOString();
	}

	if (typeof value === 'object') {
		return JSON.stringify(value);
	}

	return typeof value === 'number' ? value : String(value);
}

function getColumns(rows: CsvRow[]): string[] {
	const keys = new Set<string>();

	for (const row of rows) {
		for (const key of Object.keys(row)) {
			keys.add(key);
		}
	}

	const preferredOrder = ['created_at', 'traffic_hour', 'timestamp', 'id', 'dev_eui'];
	const ordered = preferredOrder.filter((key) => keys.delete(key) || false);
	const remaining = Array.from(keys).sort((a, b) => a.localeCompare(b));

	return [...ordered, ...remaining];
}

function sanitizeFileName(value: string): string {
	const normalized = value.trim();
	return normalized.length > 0 ? normalized.replace(/[^a-zA-Z0-9_-]/g, '_') : 'device';
}
