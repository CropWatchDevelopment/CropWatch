import { afterEach, describe, expect, it, vi } from 'vitest';
import { getLocale, type Locale } from '$lib/paraglide/runtime';
import {
	formatCurrency,
	formatCwDuration,
	formatDate,
	formatDateTime,
	formatNumber,
	formatRelative,
	getIntlLocale,
	getUiLocale
} from './format';

// The active Paraglide locale is the base locale (ja) in tests; a test switches
// it by stubbing getLocale, and afterEach puts the real one back.
vi.mock('$lib/paraglide/runtime', async (importOriginal) => {
	const runtime = await importOriginal<typeof import('$lib/paraglide/runtime')>();
	return { ...runtime, getLocale: vi.fn(runtime.getLocale) };
});

const useLocale = (locale: Locale) => vi.mocked(getLocale).mockReturnValue(locale);

afterEach(() => {
	vi.mocked(getLocale).mockReset();
});

const DATE_TIME_DEFAULTS: Intl.DateTimeFormatOptions = {
	year: 'numeric',
	month: 'short',
	day: 'numeric',
	hour: 'numeric',
	minute: '2-digit'
};
const DATE_DEFAULTS: Intl.DateTimeFormatOptions = {
	year: 'numeric',
	month: 'short',
	day: 'numeric'
};
const MOMENT = new Date('2026-03-04T05:06:00Z');

describe('getUiLocale', () => {
	it('maps English locales to en and everything else to ja', () => {
		expect(getUiLocale('en')).toBe('en');
		expect(getUiLocale('en-GB' as Locale)).toBe('en');
		expect(getUiLocale('ja')).toBe('ja');
		expect(getUiLocale('fr' as Locale)).toBe('ja');
	});

	it('follows the active Paraglide locale by default', () => {
		expect(getUiLocale()).toBe('ja');

		useLocale('en');
		expect(getUiLocale()).toBe('en');
	});
});

describe('getIntlLocale', () => {
	it('picks the regional Intl locale for the UI language', () => {
		expect(getIntlLocale('en')).toBe('en-US');
		expect(getIntlLocale('ja')).toBe('ja-JP');
	});

	it('follows the active Paraglide locale by default', () => {
		expect(getIntlLocale()).toBe('ja-JP');

		useLocale('en');
		expect(getIntlLocale()).toBe('en-US');
	});
});

describe('formatDateTime', () => {
	it('formats a date and time in the active locale', () => {
		const expected = new Intl.DateTimeFormat('ja-JP', DATE_TIME_DEFAULTS).format(MOMENT);

		expect(formatDateTime(MOMENT)).toBe(expected);
		expect(formatDateTime(MOMENT.toISOString())).toBe(expected);
		expect(formatDateTime(MOMENT.getTime())).toBe(expected);
		expect(expected).toContain('2026年3月4日');

		useLocale('en');
		expect(formatDateTime(MOMENT)).toBe(
			new Intl.DateTimeFormat('en-US', DATE_TIME_DEFAULTS).format(MOMENT)
		);
	});

	it('uses the given format options instead of the defaults', () => {
		const options: Intl.DateTimeFormatOptions = {
			hour: '2-digit',
			minute: '2-digit',
			timeZone: 'UTC'
		};

		expect(formatDateTime(MOMENT, options)).toBe(
			new Intl.DateTimeFormat('ja-JP', options).format(MOMENT)
		);
		expect(formatDateTime(MOMENT, options)).toBe('05:06');
	});

	it('returns the fallback for a value that is not a date', () => {
		expect(formatDateTime('not a date')).toBe('');
		expect(formatDateTime('not a date', undefined, '—')).toBe('—');
		expect(formatDateTime(new Date(Number.NaN), undefined, '—')).toBe('—');
	});
});

describe('formatDate', () => {
	it('formats a calendar date in the active locale', () => {
		expect(formatDate(MOMENT)).toBe(new Intl.DateTimeFormat('ja-JP', DATE_DEFAULTS).format(MOMENT));
		expect(formatDate(MOMENT.toISOString())).toBe(
			new Intl.DateTimeFormat('ja-JP', DATE_DEFAULTS).format(MOMENT)
		);

		useLocale('en');
		expect(formatDate(MOMENT.getTime())).toBe(
			new Intl.DateTimeFormat('en-US', DATE_DEFAULTS).format(MOMENT)
		);
	});

	it('uses the given format options instead of the defaults', () => {
		expect(formatDate(MOMENT, { month: 'long', timeZone: 'UTC' })).toBe('3月');
	});

	it('returns the fallback for a value that is not a date', () => {
		expect(formatDate('')).toBe('');
		expect(formatDate('soon', undefined, 'n/a')).toBe('n/a');
	});
});

describe('formatNumber', () => {
	it('groups digits for the active locale and honours the options', () => {
		expect(formatNumber(1234567.891)).toBe('1,234,567.891');
		expect(formatNumber(1234567.891, { maximumFractionDigits: 1 })).toBe('1,234,567.9');
		expect(formatNumber(0.5, { style: 'percent' })).toBe('50%');

		useLocale('en');
		expect(formatNumber(1234.5)).toBe(new Intl.NumberFormat('en-US').format(1234.5));
	});
});

describe('formatCurrency', () => {
	it('formats an amount with exactly two decimals in the upper-cased currency', () => {
		expect(formatCurrency(1234.5, 'usd')).toBe('$1,234.50');
		expect(formatCurrency(12, 'USD')).toBe('$12.00');

		useLocale('en');
		expect(formatCurrency(1234.5, 'jpy')).toBe(
			new Intl.NumberFormat('en-US', {
				style: 'currency',
				currency: 'JPY',
				minimumFractionDigits: 2,
				maximumFractionDigits: 2
			}).format(1234.5)
		);
	});

	it('falls back to "<amount> <CODE>" for a currency Intl does not accept', () => {
		expect(formatCurrency(1234.5, 'xx')).toBe('1234.50 XX');
	});
});

describe('formatRelative', () => {
	const NOW = Date.parse('2026-10-22T12:00:00Z');
	const ago = (seconds: number) => new Date(NOW - seconds * 1000).toISOString();

	it('returns null for a missing or unreadable timestamp', () => {
		expect(formatRelative(null, NOW, 'en')).toBeNull();
		expect(formatRelative('', NOW, 'en')).toBeNull();
		expect(formatRelative('not a date', NOW, 'en')).toBeNull();
	});

	it('picks seconds, minutes, hours or days by the size of the gap', () => {
		expect(formatRelative(ago(0), NOW, 'en')).toBe('now');
		expect(formatRelative(ago(30), NOW, 'en')).toBe('30 sec ago');
		expect(formatRelative(ago(59), NOW, 'en')).toBe('59 sec ago');
		expect(formatRelative(ago(60), NOW, 'en')).toBe('1 min ago');
		expect(formatRelative(ago(3 * 60), NOW, 'en')).toBe('3 min ago');
		expect(formatRelative(ago(3600), NOW, 'en')).toBe('1 hr ago');
		expect(formatRelative(ago(2 * 3600), NOW, 'en')).toBe('2 hr ago');
		expect(formatRelative(ago(86400), NOW, 'en')).toBe('yesterday');
		expect(formatRelative(ago(3 * 86400), NOW, 'en')).toBe('3 days ago');
	});

	it('rounds to the nearest unit', () => {
		expect(formatRelative(ago(100), NOW, 'en')).toBe('2 min ago');
		expect(formatRelative(ago(3599), NOW, 'en')).toBe('60 min ago');
		expect(formatRelative(ago(86399), NOW, 'en')).toBe('24 hr ago');
	});

	it('rounds a half-way gap the same way on both sides of now', () => {
		const at = (ms: number) => new Date(NOW + ms).toISOString();

		expect(formatRelative(ago(90), NOW, 'en')).toBe('2 min ago');
		expect(formatRelative(ago(-90), NOW, 'en')).toBe('in 2 min');
		expect(formatRelative(ago(1.5 * 3600), NOW, 'en')).toBe('2 hr ago');
		expect(formatRelative(ago(-1.5 * 3600), NOW, 'en')).toBe('in 2 hr');
		expect(formatRelative(ago(2.5 * 86400), NOW, 'en')).toBe('3 days ago');
		expect(formatRelative(ago(-2.5 * 86400), NOW, 'en')).toBe('in 3 days');
		expect(formatRelative(at(-1500), NOW, 'en')).toBe('2 sec ago');
		expect(formatRelative(at(1500), NOW, 'en')).toBe('in 2 sec');
		expect(formatRelative(at(-400), NOW, 'en')).toBe('now');
		expect(formatRelative(at(400), NOW, 'en')).toBe('now');
	});

	it('describes future timestamps too, without the abbreviation dot', () => {
		expect(formatRelative(ago(-2 * 3600), NOW, 'en')).toBe('in 2 hr');
		expect(formatRelative(ago(-5 * 60), NOW, 'en')).toBe('in 5 min');
	});

	it('speaks the given locale', () => {
		expect(formatRelative(ago(3 * 60), NOW, 'ja')).toBe('3 分前');
		expect(formatRelative(ago(0), NOW, 'ja')).toBe('今');
		expect(formatRelative(ago(86400), NOW, 'ja')).toBe('昨日');
	});
});

describe('formatCwDuration', () => {
	it("matches CwDuration's compact format at each scale", () => {
		expect(formatCwDuration(45_000)).toBe('45s');
		expect(formatCwDuration(6 * 60_000 + 5_000)).toBe('6m 05s');
		expect(formatCwDuration(65 * 60_000)).toBe('1h 05m');
		expect(formatCwDuration((2 * 24 + 3) * 3_600_000)).toBe('2d 03h');
	});

	it('never goes below zero', () => {
		expect(formatCwDuration(-5_000)).toBe('0s');
	});

	it('drops partial seconds and switches unit at each boundary', () => {
		expect(formatCwDuration(59_999)).toBe('59s');
		expect(formatCwDuration(60_000)).toBe('1m 00s');
		expect(formatCwDuration(3_600_000)).toBe('1h 00m');
		expect(formatCwDuration(86_400_000)).toBe('1d 00h');
	});
});
