import { getLocale } from '$lib/paraglide/runtime';

type UiLocale = 'en' | 'ja';
type DateLike = Date | string | number;

function toDate(value: DateLike): Date | null {
	const parsed = value instanceof Date ? value : new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getUiLocale(locale = getLocale()): UiLocale {
	return locale.startsWith('en') ? 'en' : 'ja';
}

export function getIntlLocale(locale = getLocale()): string {
	return getUiLocale(locale) === 'en' ? 'en-US' : 'ja-JP';
}

export function formatDateTime(
	value: DateLike,
	options?: Intl.DateTimeFormatOptions,
	fallback = ''
): string {
	const parsed = toDate(value);
	if (!parsed) return fallback;

	return new Intl.DateTimeFormat(
		getIntlLocale(),
		options ?? {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		}
	).format(parsed);
}

export function formatDate(
	value: DateLike,
	options?: Intl.DateTimeFormatOptions,
	fallback = ''
): string {
	const parsed = toDate(value);
	if (!parsed) return fallback;

	return new Intl.DateTimeFormat(
		getIntlLocale(),
		options ?? {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		}
	).format(parsed);
}

export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
	return new Intl.NumberFormat(getIntlLocale(), options).format(value);
}

export function formatCurrency(value: number, currency: string): string {
	try {
		return new Intl.NumberFormat(getIntlLocale(), {
			style: 'currency',
			currency: currency.toUpperCase(),
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(value);
	} catch {
		return `${value.toFixed(2)} ${currency.toUpperCase()}`;
	}
}

/** "3 min ago" / "3 分前" in the active locale; null for missing timestamps. */
export function formatRelative(iso: string | null, now: number, locale: string): string | null {
	const ms = iso ? new Date(iso).getTime() : NaN;
	if (!Number.isFinite(ms)) return null;
	// Round by size so a gap reads the same either side of now (90 s: "2 min ago",
	// "in 2 min"); Math.round alone rounds halves towards the future.
	const round = (value: number) => Math.sign(value) * Math.round(Math.abs(value));
	const seconds = round((ms - now) / 1000);
	const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' });
	const abs = Math.abs(seconds);
	const text =
		abs < 60
			? format.format(seconds, 'second')
			: abs < 3600
				? format.format(round(seconds / 60), 'minute')
				: abs < 86400
					? format.format(round(seconds / 3600), 'hour')
					: format.format(round(seconds / 86400), 'day');
	// The short style abbreviates with a trailing dot ("3 min. ago"); drop it.
	return text.replace(/(\p{L})\.(?=\s|$)/gu, '$1');
}

/**
 * A span in CwDuration's compact format ("45s", "6m 05s", "1h 05m", "2d 03h"),
 * for text that sits next to a live CwDuration or cannot hold the component.
 */
export function formatCwDuration(ms: number): string {
	const totalSec = Math.max(0, Math.floor(ms / 1000));
	const totalMin = Math.floor(totalSec / 60);
	const totalHr = Math.floor(totalMin / 60);
	const pad = (n: number) => n.toString().padStart(2, '0');
	if (totalSec < 60) return `${totalSec}s`;
	if (totalMin < 60) return `${totalMin}m ${pad(totalSec % 60)}s`;
	if (totalHr < 24) return `${totalHr}h ${pad(totalMin % 60)}m`;
	return `${Math.floor(totalHr / 24)}d ${pad(totalHr % 24)}h`;
}
