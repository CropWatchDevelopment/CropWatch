import { describe, expect, it } from 'vitest';
import {
	classifyHealth,
	formatRelative,
	newestTimestamp,
	readingTime,
	summarizeHealth,
	toFiniteNumber,
	type LocationDeviceRow
} from './location-overview';

const NOW = Date.parse('2026-10-13T12:00:00Z');
const minutesAgo = (minutes: number) => new Date(NOW - minutes * 60_000).toISOString();

function row(overrides: Partial<LocationDeviceRow>): LocationDeviceRow {
	return {
		dev_eui: 'A',
		name: 'Device',
		group: null,
		health: 'online',
		lastSeen: null,
		temperature: null,
		humidity: null,
		co2: null,
		signal: null,
		lat: null,
		long: null,
		...overrides
	};
}

describe('toFiniteNumber', () => {
	it('accepts numbers and numeric strings only', () => {
		expect(toFiniteNumber(38.73)).toBe(38.73);
		expect(toFiniteNumber('141.02')).toBe(141.02);
		expect(toFiniteNumber('')).toBeNull();
		expect(toFiniteNumber('abc')).toBeNull();
		expect(toFiniteNumber(NaN)).toBeNull();
		expect(toFiniteNumber({})).toBeNull();
	});
});

describe('classifyHealth', () => {
	it('is never-reported without a timestamp, whatever the scheduler says', () => {
		expect(classifyHealth(null, 'stale', 10, NOW)).toBe('never');
	});

	it('is offline when the scheduler found nothing new, even inside the window', () => {
		expect(classifyHealth(minutesAgo(1), 'stale', 10, NOW)).toBe('offline');
	});

	it('does not let a "fresh" scheduler state hide an old reading', () => {
		expect(classifyHealth(minutesAgo(120), 'fresh', 10, NOW)).toBe('offline');
		expect(classifyHealth(minutesAgo(2), 'fresh', 10, NOW)).toBe('online');
	});

	it('falls back to the upload interval plus a minute of grace', () => {
		expect(classifyHealth(minutesAgo(10.5), undefined, 10, NOW)).toBe('online');
		expect(classifyHealth(minutesAgo(12), undefined, 10, NOW)).toBe('offline');
		expect(classifyHealth(minutesAgo(25), undefined, 30, NOW)).toBe('online');
		expect(classifyHealth(minutesAgo(12), undefined, null, NOW)).toBe('offline');
	});
});

describe('readingTime', () => {
	it('uses last_update for rows updated in place (relays)', () => {
		expect(
			readingTime({
				created_at: '2026-04-12T15:11:10Z',
				last_update: '2026-10-14T02:02:24Z'
			})
		).toBe('2026-10-14T02:02:24Z');
	});

	it('falls back to created_at for append-only sensor rows', () => {
		expect(readingTime({ created_at: '2026-10-14T02:00:00Z' })).toBe('2026-10-14T02:00:00Z');
		expect(readingTime({})).toBeNull();
	});
});

describe('newestTimestamp', () => {
	it('picks the later timestamp and tolerates missing ones', () => {
		expect(newestTimestamp('2026-04-12T00:00:00Z', '2026-10-14T00:00:00Z')).toBe(
			'2026-10-14T00:00:00Z'
		);
		expect(newestTimestamp(null, '2026-10-14T00:00:00Z')).toBe('2026-10-14T00:00:00Z');
		expect(newestTimestamp('bad', null)).toBeNull();
	});

	it('keeps the first timestamp when the second is missing, unparsable or older', () => {
		expect(newestTimestamp('2026-10-14T00:00:00Z', null)).toBe('2026-10-14T00:00:00Z');
		expect(newestTimestamp('2026-10-14T00:00:00Z', 'bad')).toBe('2026-10-14T00:00:00Z');
		expect(newestTimestamp('2026-10-14T00:00:00Z', '2026-04-12T00:00:00Z')).toBe(
			'2026-10-14T00:00:00Z'
		);
	});
});

describe('summarizeHealth', () => {
	it('counts each state and picks the newest reading', () => {
		const summary = summarizeHealth([
			row({ dev_eui: 'A', health: 'online', lastSeen: minutesAgo(5) }),
			row({ dev_eui: 'B', name: 'Newest', health: 'online', lastSeen: minutesAgo(1) }),
			row({ dev_eui: 'C', health: 'offline', lastSeen: minutesAgo(200) }),
			row({ dev_eui: 'D', health: 'never' })
		]);
		expect(summary).toMatchObject({ total: 4, online: 2, offline: 1, never: 1, percentOnline: 50 });
		expect(summary.lastUplink?.name).toBe('Newest');
	});

	it('handles an empty location', () => {
		expect(summarizeHealth([])).toEqual({
			total: 0,
			online: 0,
			offline: 0,
			never: 0,
			percentOnline: 0,
			lastUplink: null
		});
	});
});

describe('formatRelative', () => {
	it('formats past times in the given locale', () => {
		expect(formatRelative(minutesAgo(3), NOW, 'en')).toBe('3 min ago');
		expect(formatRelative(minutesAgo(180), NOW, 'en')).toBe('3 hr ago');
		expect(formatRelative(minutesAgo(60 * 24 * 184), NOW, 'en')).toBe('184 days ago');
		expect(formatRelative(minutesAgo(3), NOW, 'ja')).toBe('3 分前');
		expect(formatRelative(null, NOW, 'en')).toBeNull();
	});
});
