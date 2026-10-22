import { afterEach, describe, expect, it, vi } from 'vitest';
import type { OverviewRange } from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import RangeSwitch from './RangeSwitch.svelte';

let view: ReturnType<typeof renderWithServices> | null = null;

function render(props: { value: OverviewRange; full?: boolean; class?: string }) {
	const onselect = vi.fn();
	view = renderWithServices(RangeSwitch, { props: { ...props, onselect } });
	const group = view.target.querySelector('[role="group"]') as HTMLElement;
	return { group, buttons: [...group.querySelectorAll('button')], onselect };
}

afterEach(() => {
	view?.unmount();
	view = null;
});

describe('RangeSwitch', () => {
	it('offers the three ranges and marks the selected one', () => {
		const { group, buttons } = render({ value: '7d' });

		expect(group.getAttribute('aria-label')).toBe(m.overview_range_label());
		expect(buttons.map((button) => button.textContent?.trim())).toEqual([
			m.overview_range_24h(),
			m.overview_range_7d(),
			m.overview_range_30d()
		]);
		expect(buttons.map((button) => button.getAttribute('aria-pressed'))).toEqual([
			'false',
			'true',
			'false'
		]);
		expect(buttons.every((button) => button.type === 'button')).toBe(true);
	});

	it('reports every click, including on the selected range', () => {
		const { buttons, onselect } = render({ value: '24h' });

		buttons[2].click();
		buttons[0].click();

		expect(onselect.mock.calls).toEqual([['30d'], ['24h']]);
	});

	it('spans the page on phones when full, and takes a class', () => {
		let { group } = render({ value: '24h' });
		expect(group.classList.contains('range--full')).toBe(false);
		view?.unmount();

		({ group } = render({ value: '24h', full: true, class: 'ov-narrow-only' }));
		expect(group.classList.contains('range')).toBe(true);
		expect(group.classList.contains('range--full')).toBe(true);
		expect(group.classList.contains('ov-narrow-only')).toBe(true);
	});
});
