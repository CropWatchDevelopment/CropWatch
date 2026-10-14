import type { CwDeviceFreshness } from '@cropwatchdevelopment/cwui';

export type DeviceHealth = 'online' | 'offline' | 'never';

/** Upload cadence assumed when a device row has no usable upload_interval. */
export const DEFAULT_UPLOAD_INTERVAL_MINUTES = 10;
const GRACE_MS = 60 * 1000;

export interface LocationDeviceRow {
	dev_eui: string;
	name: string;
	group: string | null;
	health: DeviceHealth;
	lastSeen: string | null;
	temperature: number | null;
	humidity: number | null;
	co2: number | null;
	lat: number | null;
	long: number | null;
}

export interface HealthSummary {
	total: number;
	online: number;
	offline: number;
	never: number;
	/** Whole-number share of devices online, 0 when there are none. */
	percentOnline: number;
	/** Online device with the newest reading, if any device has reported. */
	lastUplink: LocationDeviceRow | null;
}

/** Finite number from an API value that may arrive as a number or numeric string. */
export function toFiniteNumber(value: unknown): number | null {
	if (typeof value === 'number') return Number.isFinite(value) ? value : null;
	if (typeof value === 'string' && value.trim() !== '') {
		const parsed = Number(value);
		return Number.isFinite(parsed) ? parsed : null;
	}
	return null;
}

/**
 * Offline when the scheduler's last fetch found nothing new, or when the
 * newest reading is older than the upload interval plus grace. The scheduler
 * reports "fresh" for any known timestamp until its first fetch, so its
 * verdict alone can't mark a device online.
 */
export function classifyHealth(
	lastSeen: string | null,
	freshness: CwDeviceFreshness | undefined,
	uploadIntervalMinutes: number | null,
	now: number
): DeviceHealth {
	const lastSeenMs = lastSeen ? new Date(lastSeen).getTime() : NaN;
	if (!Number.isFinite(lastSeenMs)) return 'never';
	if (freshness === 'stale') return 'offline';
	const intervalMinutes =
		uploadIntervalMinutes && uploadIntervalMinutes > 0
			? uploadIntervalMinutes
			: DEFAULT_UPLOAD_INTERVAL_MINUTES;
	return now - lastSeenMs > intervalMinutes * 60 * 1000 + GRACE_MS ? 'offline' : 'online';
}

/** The later of two ISO timestamps; either may be missing or unparsable. */
export function newestTimestamp(a: string | null, b: string | null): string | null {
	const aMs = a ? new Date(a).getTime() : NaN;
	const bMs = b ? new Date(b).getTime() : NaN;
	if (!Number.isFinite(aMs)) return Number.isFinite(bMs) ? b : null;
	if (!Number.isFinite(bMs)) return a;
	return bMs > aMs ? b : a;
}

/**
 * When a latest-data row was last reported. Relay rows are one row per relay
 * updated in place, so `created_at` is when the row was first written and
 * `last_update` is the real last report; take whichever is newer.
 */
export function readingTime(row: Record<string, unknown>): string | null {
	const read = (key: string) =>
		typeof row[key] === 'string' && (row[key] as string).trim() ? (row[key] as string) : null;
	return newestTimestamp(read('last_update'), read('created_at'));
}

export function summarizeHealth(rows: LocationDeviceRow[]): HealthSummary {
	let online = 0;
	let offline = 0;
	let never = 0;
	let lastUplink: LocationDeviceRow | null = null;
	let lastUplinkMs = -Infinity;

	for (const row of rows) {
		if (row.health === 'online') online += 1;
		else if (row.health === 'offline') offline += 1;
		else never += 1;

		const seenMs = row.lastSeen ? new Date(row.lastSeen).getTime() : NaN;
		if (Number.isFinite(seenMs) && seenMs > lastUplinkMs) {
			lastUplinkMs = seenMs;
			lastUplink = row;
		}
	}

	return {
		total: rows.length,
		online,
		offline,
		never,
		percentOnline: rows.length === 0 ? 0 : Math.round((online / rows.length) * 100),
		lastUplink
	};
}

/** "3 min ago" / "3 分前" in the active locale; null for missing timestamps. */
export function formatRelative(iso: string | null, now: number, locale: string): string | null {
	const ms = iso ? new Date(iso).getTime() : NaN;
	if (!Number.isFinite(ms)) return null;
	const seconds = Math.round((ms - now) / 1000);
	const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' });
	const abs = Math.abs(seconds);
	const text =
		abs < 60
			? format.format(seconds, 'second')
			: abs < 3600
				? format.format(Math.round(seconds / 60), 'minute')
				: abs < 86400
					? format.format(Math.round(seconds / 3600), 'hour')
					: format.format(Math.round(seconds / 86400), 'day');
	// The short style abbreviates with a trailing dot ("3 min. ago"); drop it.
	return text.replace(/(\p{L})\.(?=\s|$)/gu, '$1');
}
