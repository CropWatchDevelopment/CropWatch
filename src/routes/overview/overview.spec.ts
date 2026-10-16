import { describe, expect, it } from 'vitest';
import type { OverviewDto } from '$lib/api/api.dtos';
import {
	attentionRows,
	donutSegments,
	DONUT_RADIUS,
	feedGroup,
	feedTimeLabel,
	filterFeed,
	formatCompact,
	formatDelta,
	formatDuration,
	formatPercent,
	formatReportPeriod,
	needsFetch,
	nextRefreshAt,
	OVERVIEW_REFRESH_MS,
	sortLocations,
	whereText
} from './overview';

function overview(overrides: Partial<OverviewDto> = {}): OverviewDto {
	return {
		range: '24h',
		generatedAt: '2026-10-15T09:05:00.000Z',
		since: '2026-10-14T09:05:00.000Z',
		devices: {
			total: 48,
			online: 44,
			offline: 4,
			lastDataAt: '2026-10-15T09:04:20.000Z',
			locationCount: 6
		},
		gateways: { total: 3, online: 3 },
		alerts: { count: 7, previousCount: 10, active: 2, topDevices: [] },
		reports: { count: 2, lastAt: null, recent: [] },
		uplinks: { count: 13800, delivered: 13650, expected: 13780 },
		hourly: [],
		locations: [],
		types: [],
		notes: [],
		feed: { counts: { alert: 0, device: 0, report: 0, data: 0 }, items: [] },
		attention: {
			offline: [
				{ locationId: 2, name: 'Field A', count: 3 },
				{ locationId: 3, name: 'Greenhouse 2', count: 1 }
			],
			activeAlerts: [{ locationId: 1, name: 'Cold Room 1', count: 2 }]
		},
		...overrides
	};
}

describe('needsFetch', () => {
	it('fetches a range that was never loaded or is 10 minutes old', () => {
		expect(needsFetch(undefined, 1_000)).toBe(true);
		expect(needsFetch(0, OVERVIEW_REFRESH_MS - 1)).toBe(false);
		expect(needsFetch(0, OVERVIEW_REFRESH_MS)).toBe(true);
	});
});

describe('nextRefreshAt', () => {
	const MIN = 60_000;

	it('lands on the first check at or after the copy is due', () => {
		// Checks every minute from 0; due at 10.5 min: the 11-minute check refetches.
		expect(nextRefreshAt(10.5 * MIN, 0, 3 * MIN, MIN)).toBe(11 * MIN);
		expect(nextRefreshAt(10 * MIN, 0, 3 * MIN, MIN)).toBe(10 * MIN);
	});

	it('is the next check from now once due, e.g. after a failed refresh', () => {
		expect(nextRefreshAt(10 * MIN, 0, 12.25 * MIN, MIN)).toBe(13 * MIN);
	});

	it('counts checks from when the beat started', () => {
		expect(nextRefreshAt(10 * MIN, 20_000, 0, MIN)).toBe(10 * MIN + 20_000);
	});
});

describe('feed', () => {
	const items = [
		{ kind: 'alert_triggered', at: '2026-10-15T08:52:00Z' },
		{ kind: 'data_hour', at: '2026-10-15T08:45:00Z' },
		{ kind: 'alert_resolved', at: '2026-10-15T08:20:00Z' },
		{ kind: 'device_offline', at: '2026-10-15T06:38:00Z' },
		{ kind: 'report', at: '2026-10-15T06:00:00Z' }
	] as const;

	it('groups resolved alerts with alerts and both device events together', () => {
		expect(feedGroup('alert_resolved')).toBe('alert');
		expect(feedGroup('device_online')).toBe('device');
		expect(feedGroup('data_day')).toBe('data');
	});

	it('filters and caps without reordering', () => {
		expect(filterFeed(items, 'all', 3).map((i) => i.kind)).toEqual([
			'alert_triggered',
			'data_hour',
			'alert_resolved'
		]);
		expect(filterFeed(items, 'alert', 10).map((i) => i.kind)).toEqual([
			'alert_triggered',
			'alert_resolved'
		]);
		expect(filterFeed(items, 'report', 10)).toHaveLength(1);
	});

	it('labels times as today, yesterday or a date', () => {
		const now = new Date(2026, 9, 15, 9, 5).getTime();
		expect(
			feedTimeLabel(new Date(2026, 9, 15, 8, 52).toISOString(), now, 'en-US', 'Yesterday')
		).toBe('08:52');
		expect(
			feedTimeLabel(new Date(2026, 9, 14, 23, 0).toISOString(), now, 'en-US', 'Yesterday')
		).toBe('Yesterday');
		expect(
			feedTimeLabel(new Date(2026, 9, 13, 12, 0).toISOString(), now, 'en-US', 'Yesterday')
		).toBe('Oct 13');
	});

	it('formats spans compactly', () => {
		expect(formatDuration(34 * 60_000)).toBe('34m');
		expect(formatDuration(72 * 60_000)).toBe('1h 12m');
		expect(formatDuration((2 * 24 + 4) * 3_600_000)).toBe('2d 04h');
		expect(formatDuration(-5)).toBe('0m');
	});

	it('reads a report period from its file name', () => {
		// ICU puts thin spaces around the range dash.
		const period = (file: string) => formatReportPeriod(file, 'en-US')?.replace(/\s/g, ' ') ?? null;
		expect(period('2026_10_04-2026_10_10.pdf')).toBe('Oct 4 – 10');
		expect(period('2026_09_27-2026_10_03.pdf')).toBe('Sep 27 – Oct 3');
		expect(period('summary.pdf')).toBeNull();
		expect(period('2026_10_10-2026_10_04.pdf')).toBeNull();
	});
});

describe('numbers', () => {
	it('formats compact counts, percentages and deltas', () => {
		expect(formatCompact(13_800, 'en-US')).toBe('13.8K');
		expect(formatCompact(412, 'en-US')).toBe('412');
		expect(formatPercent(0.9912, 'en-US')).toBe('99.1%');
		expect(formatDelta(7, 10, 'en-US')).toBe('−3');
		expect(formatDelta(12, 10, 'en-US')).toBe('+2');
		expect(formatDelta(5, 5, 'en-US')).toBe('0');
	});
});

describe('donut', () => {
	const circumference = 2 * Math.PI * DONUT_RADIUS;

	it('lays arcs end to end with a 2-unit gap and skips empty rows', () => {
		const segments = donutSegments([
			{ key: 'online', label: 'Online', value: 3, color: 'a' },
			{ key: 'empty', label: 'Empty', value: 0, color: 'b' },
			{ key: 'offline', label: 'Offline', value: 1, color: 'c' }
		]);
		expect(segments.map((s) => s.key)).toEqual(['online', 'offline']);
		expect(segments[0].dash).toBe(
			`${(circumference * 0.75 - 2).toFixed(2)} ${circumference.toFixed(2)}`
		);
		expect(segments[0].offset).toBe('0.00');
		expect(segments[1].offset).toBe((-circumference * 0.75).toFixed(2));
	});

	it('draws nothing when every value is zero', () => {
		expect(donutSegments([{ key: 'a', label: 'A', value: 0, color: 'a' }])).toEqual([]);
	});
});

describe('attention', () => {
	it('lists offline devices, active alerts and offline gateways', () => {
		const rows = attentionRows(overview({ gateways: { total: 3, online: 2 } }));
		expect(rows.map((r) => [r.key, r.count])).toEqual([
			['offline', 4],
			['alerts', 2],
			['gateways', 1]
		]);
	});

	it('links to the one affected location, else the dashboard', () => {
		const [offline, alerts] = attentionRows(overview());
		expect(offline.target).toEqual({ kind: 'dashboard' });
		expect(alerts.target).toEqual({ kind: 'rules' });
		const [single] = attentionRows(
			overview({
				attention: {
					...overview().attention,
					offline: [{ locationId: 2, name: 'Field A', count: 4 }]
				}
			})
		);
		expect(single.target).toEqual({ kind: 'location', locationId: 2 });
	});

	it('is empty when everything is fine', () => {
		expect(
			attentionRows(
				overview({
					devices: { ...overview().devices, offline: 0 },
					alerts: { count: 0, previousCount: 0, active: 0, topDevices: [] }
				})
			)
		).toEqual([]);
	});

	it('names up to three locations', () => {
		const groups = ['A', 'B', null, 'D', 'E'].map((name, i) => ({ locationId: i, name, count: 1 }));
		expect(whereText(groups, 'No location', (n) => `+${n} more`)).toBe(
			'A · B · No location · +2 more'
		);
		expect(whereText(groups.slice(0, 2), 'No location', (n) => `+${n} more`)).toBe('A · B');
	});

	it('puts locations with offline devices first, then by name', () => {
		const sorted = sortLocations([
			{ name: 'Packing Shed', total: 4, online: 4 },
			{ name: null, total: 1, online: 1 },
			{ name: 'Greenhouse 2', total: 7, online: 5 },
			{ name: 'Field A', total: 12, online: 11 },
			{ name: 'Cold Room 1', total: 8, online: 8 }
		]);
		expect(sorted.map((l) => l.name)).toEqual([
			'Greenhouse 2',
			'Field A',
			'Cold Room 1',
			'Packing Shed',
			null
		]);
	});
});
