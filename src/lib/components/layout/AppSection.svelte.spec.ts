import { createRawSnippet } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { renderWithServices } from '$lib/testing/render';
import AppSection from './AppSection.svelte';

const children = createRawSnippet(() => ({ render: () => '<p class="probe-copy">Copy</p>' }));
const SPACING = { '--cw-space-2': '8px', '--cw-space-3': '12px', '--cw-space-4': '16px' };

let view: ReturnType<typeof renderWithServices> | null = null;

function render(props: Record<string, unknown> = {}) {
	view = renderWithServices(AppSection, { props: { children, ...props } });
	return view.target.firstElementChild as HTMLElement;
}

afterEach(() => {
	view?.unmount();
	view = null;
	for (const name of Object.keys(SPACING)) document.documentElement.style.removeProperty(name);
});

describe('AppSection', () => {
	it('is a column section with the medium gap', () => {
		const section = render();

		expect(section.tagName).toBe('SECTION');
		expect(section.classList.contains('app-section')).toBe(true);
		expect(section.style.getPropertyValue('--app-section-gap')).toBe('var(--cw-space-3)');
		expect(section.style.length).toBe(1);
		expect(section.querySelector(':scope > .probe-copy')?.textContent).toBe('Copy');
		const style = getComputedStyle(section);
		expect(style.display).toBe('flex');
		expect(style.flexDirection).toBe('column');
		expect(style.minWidth).toBe('0px');
	});

	it.each([
		['sm', '--cw-space-2', '8px'],
		['md', '--cw-space-3', '12px'],
		['lg', '--cw-space-4', '16px']
	])('spaces its children with the %s gap token', (gap, token, pixels) => {
		for (const [name, value] of Object.entries(SPACING)) {
			document.documentElement.style.setProperty(name, value);
		}
		const section = render({ gap });

		expect(section.style.getPropertyValue('--app-section-gap')).toBe(`var(${token})`);
		expect(getComputedStyle(section).rowGap).toBe(pixels);
	});

	it('takes extra classes', () => {
		expect(render({ class: 'probe-section' }).matches('.app-section.probe-section')).toBe(true);
	});

	it('renders an empty section without children', () => {
		expect(render({ children: undefined }).childElementCount).toBe(0);
	});
});
