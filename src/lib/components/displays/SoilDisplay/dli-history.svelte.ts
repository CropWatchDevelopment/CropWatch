import type { TelemetryRepository } from '$lib/api/repositories/telemetry.repository';
import { normalizePaginatedListResponse } from '$lib/api/http/pagination';
import { dailyDli, fieldSeries, previousDays, toSoilRows } from './soil-readings';

/** Complete days shown in the DLI card's history. */
export const DLI_HISTORY_DAYS = 7;
/** A week of 15-minute readings is ~670 rows; leave room for faster boards. */
const DLI_HISTORY_MAX_ROWS = 1500;

/**
 * The DLI card's daily history: the last DLI_HISTORY_DAYS complete local
 * days of a soil board's light readings, loaded once per device and day
 * (independent of the page's selected range, which may be today only).
 */
export class DliHistory {
	days = $state<{ date: string; value: number }[]>([]);

	readonly #telemetry: TelemetryRepository;
	#requestKey = '';

	public constructor(deps: { telemetry: TelemetryRepository }) {
		this.#telemetry = deps.telemetry;
	}

	/** Loads the days before `now`'s day; a repeat call for the same device and day does nothing. */
	public async load(devEui: string, now: Date): Promise<void> {
		const { start, end } = previousDays(now, DLI_HISTORY_DAYS);

		const key = `${devEui}|${start.getTime()}`;
		if (!devEui || key === this.#requestKey) return;
		this.#requestKey = key;

		try {
			const result = await this.#telemetry.getDeviceDataWithinRange(
				devEui,
				{ start: start.toISOString(), end: end.toISOString(), take: DLI_HISTORY_MAX_ROWS },
				{ suppressNotFoundError: true }
			);
			if (key !== this.#requestKey) return; // a newer device or day took over
			const rows = toSoilRows(normalizePaginatedListResponse<Record<string, unknown>>(result).data);
			const chronological = rows.sort(
				(a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)
			);
			this.days = dailyDli(fieldSeries(chronological, 'ppfd'), start, end);
		} catch {
			// No history (no rows yet, or the request failed): the card shows today
			// only. Not retried until the device or the day changes.
			if (key === this.#requestKey) this.days = [];
		}
	}
}
