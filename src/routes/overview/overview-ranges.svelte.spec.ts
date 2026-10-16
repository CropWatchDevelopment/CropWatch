import { describe, expect, it, vi } from 'vitest';
import type { OverviewDto, OverviewRange } from '$lib/api/api.dtos';
import { OverviewRanges } from './overview-ranges.svelte';
import { OVERVIEW_REFRESH_MS } from './overview';

const T0 = Date.parse('2026-10-15T09:00:00.000Z');

function dto(range: OverviewRange, generatedAt = T0): OverviewDto {
	return { range, generatedAt: new Date(generatedAt).toISOString() } as OverviewDto;
}

/** A fetcher whose responses the test releases by hand. */
function deferredFetcher() {
	const calls: {
		range: OverviewRange;
		resolve: (v: OverviewDto) => void;
		reject: (e: unknown) => void;
	}[] = [];
	const fetcher = vi.fn(
		(range: OverviewRange) =>
			new Promise<OverviewDto>((resolve, reject) => calls.push({ range, resolve, reject }))
	);
	return { fetcher, calls };
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('OverviewRanges', () => {
	it('shows the server copy without fetching', () => {
		const fetcher = vi.fn();
		const ranges = new OverviewRanges({
			fetcher,
			onError: vi.fn(),
			initial: dto('24h'),
			clock: () => T0
		});

		expect(ranges.current?.range).toBe('24h');
		expect(ranges.failed).toBe(false);
		expect(fetcher).not.toHaveBeenCalled();
	});

	it('fetches a new range once and switches back for free', async () => {
		const { fetcher, calls } = deferredFetcher();
		const ranges = new OverviewRanges({
			fetcher,
			onError: vi.fn(),
			initial: dto('24h'),
			clock: () => T0
		});

		ranges.select('7d');
		// The old range stays on screen while the new one loads.
		expect(ranges.range).toBe('7d');
		expect(ranges.current?.range).toBe('24h');
		expect(ranges.pending).toBe('7d');

		calls[0].resolve(dto('7d'));
		await tick();
		expect(ranges.current?.range).toBe('7d');
		expect(ranges.pending).toBeNull();

		ranges.select('24h');
		ranges.select('7d');
		expect(ranges.current?.range).toBe('7d');
		expect(fetcher).toHaveBeenCalledTimes(1);
	});

	it('shows the last selection when responses arrive out of order', async () => {
		const { fetcher, calls } = deferredFetcher();
		const ranges = new OverviewRanges({
			fetcher,
			onError: vi.fn(),
			initial: dto('24h'),
			clock: () => T0
		});

		ranges.select('7d');
		ranges.select('30d');
		calls[1].resolve(dto('30d'));
		await tick();
		calls[0].resolve(dto('7d'));
		await tick();

		expect(ranges.current?.range).toBe('30d');
		// The slower 7-day copy is kept for later.
		ranges.select('7d');
		expect(ranges.current?.range).toBe('7d');
		expect(fetcher).toHaveBeenCalledTimes(2);
	});

	it('reverts the selection and reports when a switch fails', async () => {
		const { fetcher, calls } = deferredFetcher();
		const onError = vi.fn();
		const ranges = new OverviewRanges({ fetcher, onError, initial: dto('24h'), clock: () => T0 });

		ranges.select('30d');
		calls[0].reject(new Error('500'));
		await tick();

		expect(ranges.range).toBe('24h');
		expect(ranges.current?.range).toBe('24h');
		expect(ranges.failed).toBe(false);
		expect(onError).toHaveBeenCalledTimes(1);
	});

	it('is failed with nothing to show until a retry succeeds', async () => {
		const { fetcher, calls } = deferredFetcher();
		const ranges = new OverviewRanges({
			fetcher,
			onError: vi.fn(),
			initial: null,
			clock: () => T0
		});
		expect(ranges.failed).toBe(true);
		expect(ranges.current).toBeNull();

		void ranges.load(ranges.range);
		calls[0].resolve(dto('24h'));
		await tick();

		expect(ranges.failed).toBe(false);
		expect(ranges.current?.range).toBe('24h');
	});

	it('refreshes quietly once the copy on screen is 10 minutes old', async () => {
		let now = T0;
		const { fetcher, calls } = deferredFetcher();
		const onError = vi.fn();
		const ranges = new OverviewRanges({ fetcher, onError, initial: dto('24h'), clock: () => now });

		now = T0 + OVERVIEW_REFRESH_MS - 1;
		ranges.refreshIfStale();
		expect(fetcher).not.toHaveBeenCalled();

		now = T0 + OVERVIEW_REFRESH_MS;
		ranges.refreshIfStale();
		// A second trigger while the first is in flight does not refetch.
		ranges.refreshIfStale();
		expect(fetcher).toHaveBeenCalledTimes(1);
		expect(ranges.pending).toBeNull();

		// A failed background refresh keeps the old copy and stays silent.
		calls[0].reject(new Error('offline'));
		await tick();
		expect(ranges.current?.range).toBe('24h');
		expect(onError).not.toHaveBeenCalled();
	});

	it('says when the copy on screen is due, and while a background refresh runs', async () => {
		let now = T0;
		const { fetcher, calls } = deferredFetcher();
		const ranges = new OverviewRanges({
			fetcher,
			onError: vi.fn(),
			initial: dto('24h'),
			clock: () => now
		});
		expect(ranges.refreshDueAt).toBe(T0 + OVERVIEW_REFRESH_MS);

		now = T0 + OVERVIEW_REFRESH_MS;
		ranges.refreshIfStale();
		expect(ranges.refreshing).toBe(true);

		calls[0].resolve(dto('24h', now));
		await tick();
		expect(ranges.refreshing).toBe(false);
		expect(ranges.refreshDueAt).toBe(now + OVERVIEW_REFRESH_MS);
	});
});
