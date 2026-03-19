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
