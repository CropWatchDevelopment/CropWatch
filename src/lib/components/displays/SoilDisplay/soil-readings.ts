import type { CwResponsiveLineDataPoint } from '@cropwatchdevelopment/cwui';

/**
 * cw_soil_data readings for the soil display. Every probe reports the soil
 * fields; soil boards with air and light sensors (cw-divergent) add the air
 * readings, CO₂ and PPFD. A field a reading does not carry is null — never 0,
 * which would read as a real 0 °C / 0 %.
 */
export const SOIL_FIELDS = [
	'temperature_c',
	'moisture',
	'ec',
	'ph',
	'air_temperature_c',
	'air_humidity',
	'co2',
	'ppfd'
] as const;

export type SoilField = (typeof SOIL_FIELDS)[number];

export type SoilRow = { id: string; created_at: string } & Record<SoilField, number | null>;

export interface LatestReading {
	value: number;
	/** created_at of the reading the value came from. */
	at: string;
}

/** A finite number (numeric strings included), else null. */
export function readingOrNull(value: unknown): number | null {
	if (value === null || value === undefined || value === '') return null;
	const n = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(n) ? n : null;
}

export function toSoilRows(raw: Record<string, unknown>[]): SoilRow[] {
	return raw.map((row, i) => {
		const soilRow = {
			id: String(row.id ?? `${row.created_at}-${i}`),
			created_at: String(row.created_at ?? '')
		} as SoilRow;
		for (const field of SOIL_FIELDS) soilRow[field] = readingOrNull(row[field]);
		return soilRow;
	});
}

/**
 * The newest value of a field: the device's latest row when it has one, else
 * the newest reading in the (newest-first) history that carries the field. A
 * reading can be partial (a lost radio frame), so the newest row alone is not
 * enough.
 */
export function latestReading(
	rows: SoilRow[],
	field: SoilField,
	latestData?: Record<string, unknown> | null
): LatestReading | null {
	const fromLatest = readingOrNull(latestData?.[field]);
	if (fromLatest !== null) return { value: fromLatest, at: String(latestData?.created_at ?? '') };
	const row = rows.find((r) => r[field] !== null);
	return row ? { value: row[field] as number, at: row.created_at } : null;
}

/**
 * One field as chart points, oldest first. Missing readings are skipped rather
 * than kept as gaps, so a field reported less often than the row cadence still
 * draws a line from reading to reading.
 */
export function fieldSeries(
	chronologicalRows: SoilRow[],
	field: SoilField,
	convert: (value: number) => number = (value) => value
): CwResponsiveLineDataPoint[] {
	const points: CwResponsiveLineDataPoint[] = [];
	for (const row of chronologicalRows) {
		const value = row[field];
		const t = new Date(row.created_at).getTime();
		if (value === null || !Number.isFinite(t)) continue;
		points.push({ t, v: convert(value) });
	}
	return points;
}

/** Readings further apart than this are not bridged: light in a gap is unknown. */
export const DLI_MAX_GAP_MS = 60 * 60 * 1000;

/**
 * Light (mol/m²) between two instants from PPFD samples in µmol/m²/s: the
 * trapezoid between consecutive readings, skipping gaps over DLI_MAX_GAP_MS so
 * an outage lowers the total instead of inventing light. Null when no reading
 * falls in the window.
 */
export function dliBetween(
	ppfdPoints: CwResponsiveLineDataPoint[],
	from: number,
	to: number
): number | null {
	const inWindow = ppfdPoints.filter(
		(p): p is { t: number; v: number } => p.v !== null && p.t >= from && p.t <= to
	);
	if (inWindow.length === 0) return null;

	let molPerSquareMetre = 0;
	for (let i = 1; i < inWindow.length; i++) {
		const gapMs = inWindow[i].t - inWindow[i - 1].t;
		if (gapMs <= 0 || gapMs > DLI_MAX_GAP_MS) continue;
		molPerSquareMetre += (((inWindow[i - 1].v + inWindow[i].v) / 2) * (gapMs / 1000)) / 1_000_000;
	}
	return molPerSquareMetre;
}

/** Daily light integral so far today (mol/m²/day, local day); null with no reading today. */
export function dliToday(
	ppfdPoints: CwResponsiveLineDataPoint[],
	now: Date = new Date()
): number | null {
	const startOfDay = new Date(now);
	startOfDay.setHours(0, 0, 0, 0);
	return dliBetween(ppfdPoints, startOfDay.getTime(), now.getTime());
}

/** A local calendar day as YYYY-MM-DD. */
function localDateKey(day: Date): string {
	const month = String(day.getMonth() + 1).padStart(2, '0');
	const date = String(day.getDate()).padStart(2, '0');
	return `${day.getFullYear()}-${month}-${date}`;
}

/** The `days` complete local days before `now`'s day: from `start` to `end` (local midnights). */
export function previousDays(now: Date, days: number): { start: Date; end: Date } {
	const end = new Date(now);
	end.setHours(0, 0, 0, 0);
	const start = new Date(end);
	start.setDate(start.getDate() - days);
	return { start, end };
}

/**
 * Each local day's DLI from `start` (a local midnight) up to `end`, oldest
 * first. Days without readings are left out rather than shown as 0.
 */
export function dailyDli(
	ppfdPoints: CwResponsiveLineDataPoint[],
	start: Date,
	end: Date
): { date: string; value: number }[] {
	const days: { date: string; value: number }[] = [];
	for (const day = new Date(start); day < end; day.setDate(day.getDate() + 1)) {
		const next = new Date(day);
		next.setDate(next.getDate() + 1);
		// A day ends just before the next midnight, so a midnight reading counts once.
		const value = dliBetween(ppfdPoints, day.getTime(), next.getTime() - 1);
		if (value !== null) days.push({ date: localDateKey(day), value });
	}
	return days;
}
