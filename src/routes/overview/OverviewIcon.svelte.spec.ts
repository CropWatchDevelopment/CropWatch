import { afterEach, describe, expect, it } from 'vitest';
import { renderWithServices } from '$lib/testing/render';
import OverviewIcon, { type OverviewIconName } from './OverviewIcon.svelte';

const NAMES: OverviewIconName[] = [
	'device',
	'signal',
	'bell',
	'gateway',
	'report',
	'file',
	'pulse',
	'check',
	'send',
	'arrow',
	'chevron'
];

let view: ReturnType<typeof renderWithServices> | null = null;

function render(props: { name: OverviewIconName; size?: number; class?: string }) {
	view = renderWithServices(OverviewIcon, { props });
	return view.target.querySelector('svg') as SVGSVGElement;
}

afterEach(() => {
	view?.unmount();
	view = null;
});

describe('OverviewIcon', () => {
	it('is a decorative 18px stroke icon by default', () => {
		const svg = render({ name: 'check' });

		expect(svg.getAttribute('aria-hidden')).toBe('true');
		expect(svg.getAttribute('width')).toBe('18');
		expect(svg.getAttribute('height')).toBe('18');
		expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
		expect(svg.getAttribute('stroke')).toBe('currentColor');
		expect(svg.classList).toHaveLength(0);
		expect(svg.querySelector('path')?.getAttribute('d')).toBe('M20 6 9 17l-5-5');
	});

	it('takes a size and a class', () => {
		const svg = render({ name: 'arrow', size: 16, class: 'att-row__chevron' });

		expect(svg.getAttribute('width')).toBe('16');
		expect(svg.getAttribute('height')).toBe('16');
		expect(svg.getAttribute('class')).toBe('att-row__chevron');
		expect(svg.querySelector('path')?.getAttribute('d')).toBe('M5 12h14M13 6l6 6-6 6');
	});

	it('draws a different shape for every name', () => {
		const drawings = NAMES.map((name) => {
			const svg = render({ name });
			const markup = svg.innerHTML;
			view?.unmount();
			view = null;
			return markup;
		});

		for (const markup of drawings) expect(markup).toMatch(/<(path|rect|circle)/);
		expect(new Set(drawings).size).toBe(NAMES.length);
	});

	it('draws nothing for a name it does not know', () => {
		const svg = render({ name: 'unknown' as OverviewIconName });

		expect(svg.children).toHaveLength(0);
	});
});
