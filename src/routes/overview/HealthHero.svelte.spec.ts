import { createRawSnippet } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import HealthHero from './HealthHero.svelte';
import type { HealthState } from './overview';

const CIRCUMFERENCE = 2 * Math.PI * 38;
const live = createRawSnippet(() => ({ render: () => '<span class="probe-live">Live</span>' }));

let view: ReturnType<typeof renderWithServices> | null = null;

function render(overrides: { state?: HealthState; percent?: number; class?: string } = {}) {
	view = renderWithServices(HealthHero, {
		props: {
			state: 'attention',
			title: '3 items need a look',
			percent: 92,
			online: 44,
			offline: 4,
			activeAlerts: 2,
			live,
			...overrides
		}
	});
	return view.target.querySelector('section') as HTMLElement;
}

afterEach(() => {
	view?.unmount();
	view = null;
});

describe('HealthHero', () => {
	it('shows the online share, the state, the headline, the live line and the counts', () => {
		const hero = render();

		expect(hero.getAttribute('aria-label')).toBe(m.overview_health_label());
		expect(hero.querySelector('svg')?.getAttribute('aria-label')).toBe(
			m.overview_health_ring({ percent: 92 })
		);
		expect(hero.querySelector('.hero__percent')?.textContent).toBe('92%');
		expect(hero.querySelector('.hero__ring-label')?.textContent).toBe(
			m.overview_breakdown_online_label()
		);
		const chip = hero.querySelector('.hero__chip') as HTMLElement;
		expect(chip.classList.contains('hero__chip--attention')).toBe(true);
		expect(chip.textContent).toBe(m.overview_health_chip_attention());
		expect(hero.querySelector('.hero__title')?.textContent).toBe('3 items need a look');
		expect(hero.querySelector('.hero__live .probe-live')?.textContent).toBe('Live');

		const tiles = [...hero.querySelectorAll('.tile')].map((tile) => [
			tile.querySelector('.tile__value')?.textContent,
			tile.querySelector('.tile__label')?.textContent
		]);
		expect(tiles).toEqual([
			['44', m.overview_tile_online()],
			['4', m.overview_tile_offline()],
			['2', m.overview_tile_active_alerts()]
		]);
	});

	it('draws the share as an arc over the track', () => {
		const circles = render({ percent: 92 }).querySelectorAll('circle');

		expect(circles).toHaveLength(2);
		expect(circles[1].getAttribute('stroke-dasharray')).toBe(
			`${(0.92 * CIRCUMFERENCE).toFixed(1)} ${CIRCUMFERENCE.toFixed(1)}`
		);
		expect(circles[1].getAttribute('transform')).toBe('rotate(-90 46 46)');
	});

	it('draws only the track when nothing is online', () => {
		const hero = render({ state: 'empty', percent: 0 });

		expect(hero.querySelectorAll('circle')).toHaveLength(1);
		expect(hero.querySelector('.hero__percent')?.textContent).toBe('0%');
		expect(hero.querySelector('.hero__chip--empty')?.textContent).toBe(
			m.overview_health_chip_empty()
		);
	});

	it('labels the all-good state and takes a class', () => {
		const hero = render({ state: 'ok', percent: 100, class: 'ov-narrow-only' });

		expect(hero.classList.contains('hero')).toBe(true);
		expect(hero.classList.contains('ov-narrow-only')).toBe(true);
		expect(hero.querySelector('.hero__chip--ok')?.textContent).toBe(m.overview_health_chip_ok());
	});
});
