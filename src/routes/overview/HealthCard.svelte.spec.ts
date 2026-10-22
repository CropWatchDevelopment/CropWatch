import { afterEach, describe, expect, it } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import HealthCard from './HealthCard.svelte';
import type { HealthState } from './overview';

let view: ReturnType<typeof renderWithServices> | null = null;

function render(state: HealthState, parts: string[], className?: string) {
	view = renderWithServices(HealthCard, {
		props: { state, title: `${state} title`, parts, class: className }
	});
	return view.target.querySelector('section') as HTMLElement;
}

afterEach(() => {
	view?.unmount();
	view = null;
});

describe('HealthCard', () => {
	it('shows the state, the headline and the details on one line', () => {
		const card = render('attention', ['4 devices offline', '2 alerts still active']);

		expect(card.getAttribute('aria-label')).toBe(m.overview_health_label());
		const chip = card.querySelector('.health__chip') as HTMLElement;
		expect(chip.classList.contains('health__chip--attention')).toBe(true);
		expect(chip.textContent).toBe(m.overview_health_chip_attention());
		expect(card.querySelector('.health__title')?.textContent).toBe('attention title');
		expect(card.querySelector('.health__sub')?.textContent).toBe(
			'4 devices offline · 2 alerts still active'
		);
	});

	it('links to the attention list only when something needs a look', () => {
		const link = render('attention', []).querySelector('a.health__link') as HTMLAnchorElement;
		expect(link.getAttribute('href')).toBe('#attention');
		expect(link.textContent).toBe(m.overview_health_see_attention());
		view?.unmount();

		expect(render('ok', []).querySelector('a')).toBeNull();
		view?.unmount();
		expect(render('empty', []).querySelector('a')).toBeNull();
	});

	it('labels the all-good and no-devices states, and takes a class', () => {
		let card = render('ok', ['all devices online'], 'ov-wide-only');
		expect(card.classList.contains('health')).toBe(true);
		expect(card.classList.contains('ov-wide-only')).toBe(true);
		expect(card.querySelector('.health__chip--ok')?.textContent).toBe(m.overview_health_chip_ok());
		expect(card.querySelector('.health__sub')?.textContent).toBe('all devices online');
		view?.unmount();

		card = render('empty', []);
		expect(card.querySelector('.health__chip--empty')?.textContent).toBe(
			m.overview_health_chip_empty()
		);
		expect(card.querySelector('.health__sub')?.textContent).toBe('');
	});
});
