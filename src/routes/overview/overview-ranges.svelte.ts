import type { OverviewDto, OverviewRange } from '$lib/api/api.dtos';
import { needsFetch, OVERVIEW_REFRESH_MS } from './overview';

/**
 * The overview page's data, one copy per range. A range is fetched at most
 * once per refresh interval, so switching back to a loaded range is free.
 * `range` follows the selection at once; `shown` moves when that range's
 * data has arrived, so the previous range stays on screen meanwhile.
 */
export class OverviewRanges {
	range = $state<OverviewRange>('24h');
	shown = $state<OverviewRange>('24h');
	/** The range a visible (non-quiet) load is fetching. */
	pending = $state<OverviewRange | null>(null);
	/** Nothing could be loaded at all. */
	failed = $state(false);
	/** A background (quiet) refresh is in flight. */
	refreshing = $state(false);

	#byRange = $state<Partial<Record<OverviewRange, OverviewDto>>>({});
	/** State: the live line counts down to the next refresh from these. */
	#fetchedAt = $state<Partial<Record<OverviewRange, number>>>({});
	/** Ranges being fetched right now (not rendered, so not state). */
	#inflight: Partial<Record<OverviewRange, boolean>> = {};
	#fetcher: (range: OverviewRange) => Promise<OverviewDto>;
	#onError: (error: unknown) => void;
	#clock: () => number;

	readonly current = $derived(this.#byRange[this.shown] ?? null);

	/** When the copy on screen is due for a background refresh; null before any data. */
	get refreshDueAt(): number | null {
		const at = this.#fetchedAt[this.shown];
		return at === undefined ? null : at + OVERVIEW_REFRESH_MS;
	}

	constructor(options: {
		fetcher: (range: OverviewRange) => Promise<OverviewDto>;
		onError: (error: unknown) => void;
		initial: OverviewDto | null;
		clock?: () => number;
	}) {
		this.#fetcher = options.fetcher;
		this.#onError = options.onError;
		this.#clock = options.clock ?? Date.now;
		if (options.initial) {
			this.#byRange[options.initial.range] = options.initial;
			this.#fetchedAt[options.initial.range] = Date.parse(options.initial.generatedAt);
			this.range = this.shown = options.initial.range;
		} else {
			this.failed = true;
		}
	}

	/** Fetches a range. A quiet load (background refresh) never reports errors. */
	async load(target: OverviewRange, quiet = false): Promise<void> {
		if (this.#inflight[target]) return;
		this.#inflight[target] = true;
		if (quiet) this.refreshing = true;
		else this.pending = target;
		try {
			const result = await this.#fetcher(target);
			this.#byRange[target] = result;
			this.#fetchedAt[target] = this.#clock();
			this.failed = false;
			if (this.range === target) this.shown = target;
		} catch (error) {
			// A failed background refresh keeps the copy on screen; its
			// "updated …" age shows it is old.
			if (quiet) return;
			if (this.range === target) this.range = this.shown;
			if (!this.#byRange[this.shown]) this.failed = true;
			this.#onError(error);
		} finally {
			this.#inflight[target] = false;
			if (quiet) this.refreshing = false;
			if (this.pending === target) this.pending = null;
		}
	}

	select(next: OverviewRange): void {
		if (next === this.range) return;
		this.range = next;
		if (needsFetch(this.#fetchedAt[next], this.#clock())) void this.load(next);
		else this.shown = next;
	}

	/** Quietly refetches what is on screen once it is older than maxAgeMs. */
	refreshIfStale(maxAgeMs?: number): void {
		if (this.pending) return;
		if (needsFetch(this.#fetchedAt[this.shown], this.#clock(), maxAgeMs)) {
			void this.load(this.shown, true);
		}
	}
}
