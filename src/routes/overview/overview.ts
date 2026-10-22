import type {
	OverviewAttentionGroupDto,
	OverviewDto,
	OverviewFeedItemDto,
	OverviewFeedKind,
	OverviewRange
} from '$lib/api/api.dtos';

export const OVERVIEW_RANGES: readonly OverviewRange[] = ['24h', '7d', '30d'];

/** The data behind the page is re-aggregated every 10 minutes (033_overview.sql). */
export const OVERVIEW_REFRESH_MS = 10 * 60 * 1000;

/** True when a range has never been loaded, or its copy is older than maxAgeMs. */
export function needsFetch(
	fetchedAt: number | undefined,
	now: number,
	maxAgeMs = OVERVIEW_REFRESH_MS
): boolean {
	return fetchedAt === undefined || now - fetchedAt >= maxAgeMs;
}

/**
 * When the next background refresh starts. The page checks every `tickMs`
 * from `origin` and refetches at the first check at or after `dueAt`; once
 * due (or after a failed refresh) that is the next check from now.
 */
export function nextRefreshAt(dueAt: number, origin: number, now: number, tickMs: number): number {
	const from = Math.max(dueAt, now);
	return origin + Math.ceil((from - origin) / tickMs) * tickMs;
}

// ── Activity feed ────────────────────────────────────────────────────────────

export type FeedGroup = 'alert' | 'report' | 'data' | 'device';
export type FeedFilter = 'all' | FeedGroup;
export const FEED_FILTERS: readonly FeedFilter[] = ['all', 'alert', 'report', 'data', 'device'];

export function feedGroup(kind: OverviewFeedKind): FeedGroup {
	switch (kind) {
		case 'alert_triggered':
		case 'alert_resolved':
			return 'alert';
		case 'device_offline':
		case 'device_online':
			return 'device';
		case 'report':
			return 'report';
		default:
			return 'data';
	}
}

/** Newest first (the API's order), filtered, capped at `limit`. */
export function filterFeed(
	items: readonly OverviewFeedItemDto[],
	filter: FeedFilter,
	limit: number
): OverviewFeedItemDto[] {
	return items
		.filter((item) => filter === 'all' || feedGroup(item.kind) === filter)
		.slice(0, limit);
}

export type Tone = 'danger' | 'warning' | 'success' | 'info' | 'secondary';

export function feedTone(kind: OverviewFeedKind): Tone {
	switch (kind) {
		case 'alert_triggered':
			return 'danger';
		case 'alert_resolved':
		case 'device_online':
			return 'success';
		case 'device_offline':
			return 'warning';
		case 'report':
			return 'info';
		default:
			return 'secondary';
	}
}

const DAY_MS = 24 * 60 * 60 * 1000;

function localDayStart(ms: number): number {
	const date = new Date(ms);
	return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** "08:52" today, "Yesterday" for the day before, else "Oct 13" / "10月13日". */
export function feedTimeLabel(
	iso: string,
	now: number,
	locale: string,
	yesterdayLabel: string
): string {
	const ms = new Date(iso).getTime();
	if (!Number.isFinite(ms)) return '';
	const today = localDayStart(now);
	if (ms >= today) {
		return new Intl.DateTimeFormat(locale, {
			hour: '2-digit',
			minute: '2-digit',
			hourCycle: 'h23'
		}).format(ms);
	}
	if (ms >= localDayStart(today - DAY_MS / 2)) return yesterdayLabel;
	return new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }).format(ms);
}

/** Compact span: "45m", "1h 12m", "2d 04h". */
export function formatDuration(ms: number): string {
	const totalMin = Math.max(0, Math.floor(ms / 60_000));
	const totalHr = Math.floor(totalMin / 60);
	const pad = (n: number) => n.toString().padStart(2, '0');
	if (totalMin < 60) return `${totalMin}m`;
	if (totalHr < 24) return `${totalHr}h ${pad(totalMin % 60)}m`;
	return `${Math.floor(totalHr / 24)}d ${pad(totalHr % 24)}h`;
}

/**
 * A report PDF's period from its name (`2026_10_04-2026_10_10.pdf`),
 * formatted as a range ("Oct 4 – 10"). The dates are calendar dates, so they
 * are formatted in UTC to keep them from shifting.
 */
export function formatReportPeriod(file: string, locale: string): string | null {
	const match = /^(\d{4})_(\d{2})_(\d{2})-(\d{4})_(\d{2})_(\d{2})\.pdf$/i.exec(file);
	if (!match) return null;
	const [, y1, m1, d1, y2, m2, d2] = match.map(Number);
	const from = Date.UTC(y1, m1 - 1, d1);
	const to = Date.UTC(y2, m2 - 1, d2);
	if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return null;
	return new Intl.DateTimeFormat(locale, {
		month: 'short',
		day: 'numeric',
		timeZone: 'UTC'
	}).formatRange(from, to);
}

// ── Numbers ──────────────────────────────────────────────────────────────────

/** 13800 → "13.8K" / "1.4万". */
export function formatCompact(value: number, locale: string): string {
	return new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 }).format(
		value
	);
}

/** 0.991 → "99.1%". */
export function formatPercent(ratio: number, locale: string, digits = 1): string {
	return new Intl.NumberFormat(locale, {
		style: 'percent',
		minimumFractionDigits: digits,
		maximumFractionDigits: digits
	}).format(ratio);
}

/** Signed change with a typographic minus: "+4", "−3", "0". */
export function formatDelta(current: number, previous: number, locale: string): string {
	return new Intl.NumberFormat(locale, { signDisplay: 'exceptZero' })
		.format(current - previous)
		.replace('-', '−');
}

// ── Donut ────────────────────────────────────────────────────────────────────

export const DONUT_RADIUS = 64;

export interface DonutRow {
	key: string;
	label: string;
	value: number;
	/** A CSS color, e.g. `var(--cw-chart-cat-1)`. */
	color: string;
	/** Where the legend entry links to, if anywhere. */
	href?: string | null;
}

export interface DonutSegment extends DonutRow {
	dash: string;
	offset: string;
}

/**
 * Stroke-dash arcs for an SVG ring of `radius`, starting at 12 o'clock when
 * the group is rotated −90°, with a 2-unit gap between arcs. Empty rows draw
 * nothing.
 */
export function donutSegments(rows: readonly DonutRow[], radius = DONUT_RADIUS): DonutSegment[] {
	const circumference = 2 * Math.PI * radius;
	const sum = rows.reduce((total, row) => total + row.value, 0);
	let start = 0;
	return rows
		.filter((row) => row.value > 0 && sum > 0)
		.map((row) => {
			const length = (row.value / sum) * circumference;
			const segment = {
				...row,
				dash: `${Math.max(length - 2, 0.5).toFixed(2)} ${circumference.toFixed(2)}`,
				offset: (-start).toFixed(2)
			};
			start += length;
			return segment;
		});
}

// ── Needs attention / health ────────────────────────────────────────────────

/** ok: nothing to look at; attention: at least one row; empty: no devices. */
export type HealthState = 'ok' | 'attention' | 'empty';

export type AttentionKey = 'offline' | 'alerts' | 'gateways';

export type AttentionTarget =
	| { kind: 'location'; locationId: number }
	| { kind: 'dashboard' }
	| { kind: 'rules' }
	| { kind: 'gateways' };

export interface AttentionRow {
	key: AttentionKey;
	count: number;
	groups: OverviewAttentionGroupDto[];
	target: AttentionTarget;
}

/** One location: open it; several (or devices without one): the dashboard. */
function deviceTarget(groups: readonly OverviewAttentionGroupDto[]): AttentionTarget {
	return groups.length === 1 && groups[0].locationId !== null
		? { kind: 'location', locationId: groups[0].locationId }
		: { kind: 'dashboard' };
}

export function attentionRows(overview: OverviewDto): AttentionRow[] {
	const rows: AttentionRow[] = [];
	const offlineGateways = overview.gateways.total - overview.gateways.online;
	if (overview.devices.offline > 0) {
		rows.push({
			key: 'offline',
			count: overview.devices.offline,
			groups: overview.attention.offline,
			target: deviceTarget(overview.attention.offline)
		});
	}
	if (overview.alerts.active > 0) {
		rows.push({
			key: 'alerts',
			count: overview.alerts.active,
			groups: overview.attention.activeAlerts,
			target: { kind: 'rules' }
		});
	}
	if (offlineGateways > 0) {
		rows.push({
			key: 'gateways',
			count: offlineGateways,
			groups: [],
			target: { kind: 'gateways' }
		});
	}
	return rows;
}

/** "Field A · Greenhouse 2 · Cold Room 1 · +2 more" */
export function whereText(
	groups: readonly OverviewAttentionGroupDto[],
	noLocation: string,
	more: (count: number) => string,
	max = 3
): string {
	const names = groups.map((group) => group.name ?? noLocation);
	const shown = names.slice(0, max);
	return names.length > max ? [...shown, more(names.length - max)].join(' · ') : shown.join(' · ');
}

/** Online share 0..1; 0 when there are no devices. */
export function onlineShare(overview: OverviewDto): number {
	return overview.devices.total === 0 ? 0 : overview.devices.online / overview.devices.total;
}

/** Locations with offline devices first (most first), then by name; unnamed ones last. */
export function sortLocations<T extends { name: string | null; total: number; online: number }>(
	locations: readonly T[]
): T[] {
	return [...locations].sort(
		(a, b) =>
			b.total - b.online - (a.total - a.online) ||
			// Two unnamed locations are equal, so they keep their order.
			(a.name === null || b.name === null
				? Number(a.name === null) - Number(b.name === null)
				: a.name.localeCompare(b.name))
	);
}
