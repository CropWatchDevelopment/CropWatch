import { flushSync } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatCwDuration } from '$lib/i18n/format';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import LiveStatus from './LiveStatus.svelte';

const MINUTE = 60_000;
/** 65.5 minutes ago: CwDuration shows "1h 05m" for the next 30 seconds. */
const generatedAt = () => new Date(Date.now() - 65.5 * MINUTE).toISOString();

let view: ReturnType<typeof renderWithServices> | null = null;

function render(
	props: Partial<{
		fresh: boolean;
		updating: boolean;
		compact: boolean;
		class: string;
		nextUpdateAt: (now: number) => number | null;
	}> = {}
) {
	view = renderWithServices(LiveStatus, {
		props: {
			generatedAt: generatedAt(),
			fresh: true,
			updating: false,
			nextUpdateAt: () => null,
			...props
		}
	});
	return {
		live: view.target.querySelector('.live') as HTMLElement,
		tooltip: () => view?.target.querySelector('[role="tooltip"]')?.textContent?.trim()
	};
}

afterEach(() => {
	view?.unmount();
	view = null;
	vi.useRealTimers();
});

describe('LiveStatus', () => {
	it('says "live" with the age of fresh data', () => {
		const { live } = render({ fresh: true });

		expect(live.textContent?.trim()).toBe(m.overview_live_updated({ duration: '1h 05m' }));
		expect(live.querySelector('.live__dot')?.classList.contains('live__dot--stale')).toBe(false);
		expect(live.querySelector('.live__dot')?.getAttribute('aria-hidden')).toBe('true');
		expect(live.getAttribute('tabindex')).toBe('0');
	});

	it('only says how old stale data is', () => {
		const { live } = render({ fresh: false });

		expect(live.textContent?.trim()).toBe(m.overview_updated({ duration: '1h 05m' }));
		expect(live.querySelector('.live__dot')?.classList.contains('live__dot--stale')).toBe(true);
	});

	it('counts down to the next update in its tooltip, every second', () => {
		vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
		const due = Date.now() + 90_000;
		const nextUpdateAt = vi.fn(() => due);
		const { tooltip } = render({ nextUpdateAt });

		expect(nextUpdateAt).toHaveBeenLastCalledWith(Date.now());
		expect(tooltip()).toBe(m.overview_next_update({ duration: formatCwDuration(90_000) }));

		vi.advanceTimersByTime(1000);
		flushSync();

		expect(nextUpdateAt).toHaveBeenLastCalledWith(Date.now());
		expect(tooltip()).toBe(m.overview_next_update({ duration: formatCwDuration(89_000) }));
	});

	it('stops ticking once removed', () => {
		vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
		const nextUpdateAt = vi.fn(() => null);
		render({ nextUpdateAt });
		const calls = nextUpdateAt.mock.calls.length;

		view?.unmount();
		view = null;
		vi.advanceTimersByTime(5000);
		flushSync();

		expect(nextUpdateAt).toHaveBeenCalledTimes(calls);
	});

	it('says it is updating while a refresh runs, and nothing when no update is planned', () => {
		const updating = render({ updating: true, nextUpdateAt: (now) => now + 90_000 });
		expect(updating.tooltip()).toBe(m.overview_updating());
		view?.unmount();

		const idle = render({ nextUpdateAt: () => null });
		expect(idle.tooltip()).toBe('');
	});

	it('has a compact size for the phone hero, and takes a class', () => {
		const regular = render();
		expect(regular.live.classList.contains('live--compact')).toBe(false);
		view?.unmount();

		const compact = render({ compact: true, class: 'ov-wide-only' });
		expect(compact.live.classList.contains('live--compact')).toBe(true);
		expect(view?.target.querySelector('.cw-tooltip')?.classList.contains('ov-wide-only')).toBe(
			true
		);
	});
});
