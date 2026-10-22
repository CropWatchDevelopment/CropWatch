import { createRawSnippet } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { renderWithServices } from '$lib/testing/render';
import AppFormStack from './AppFormStack.svelte';

const children = createRawSnippet(() => ({
	render: () => '<label class="probe-field">Name</label>'
}));
const SPACING = { '--cw-space-2': '8px', '--cw-space-3': '12px', '--cw-space-4': '16px' };

let view: ReturnType<typeof renderWithServices> | null = null;

function render(props: Record<string, unknown> = {}) {
	view = renderWithServices(AppFormStack, { props: { children, ...props } });
	return view.target.firstElementChild as HTMLElement;
}

/** Define the design-token spacing the app's theme provides, so gaps resolve. */
function useSpacingTokens() {
	for (const [name, value] of Object.entries(SPACING)) {
		document.documentElement.style.setProperty(name, value);
	}
}

afterEach(() => {
	view?.unmount();
	view = null;
	for (const name of Object.keys(SPACING)) document.documentElement.style.removeProperty(name);
});

describe('AppFormStack', () => {
	it('stacks the fields in a column with the medium gap and no padding', () => {
		const stack = render();

		expect(stack.tagName).toBe('DIV');
		expect(stack.classList.contains('app-form-stack')).toBe(true);
		expect(stack.classList.contains('app-form-stack--padded')).toBe(false);
		expect(stack.style.getPropertyValue('--app-form-stack-gap')).toBe('var(--cw-space-3)');
		expect(stack.style.length).toBe(1);
		expect(stack.querySelector(':scope > .probe-field')?.textContent).toBe('Name');
		const style = getComputedStyle(stack);
		expect(style.display).toBe('flex');
		expect(style.flexDirection).toBe('column');
		expect(style.minWidth).toBe('0px');
	});

	it.each([
		['sm', '--cw-space-2', '8px'],
		['md', '--cw-space-3', '12px'],
		['lg', '--cw-space-4', '16px']
	])('spaces the fields with the %s gap token', (gap, token, pixels) => {
		useSpacingTokens();
		const stack = render({ gap });

		expect(stack.style.getPropertyValue('--app-form-stack-gap')).toBe(`var(${token})`);
		expect(getComputedStyle(stack).rowGap).toBe(pixels);
	});

	it('adds the card inner spacing when padded', () => {
		useSpacingTokens();
		const plain = render();
		expect(getComputedStyle(plain).paddingTop).toBe('0px');
		view?.unmount();

		const stack = render({ padded: true });

		expect(stack.classList.contains('app-form-stack--padded')).toBe(true);
		const style = getComputedStyle(stack);
		expect([style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft]).toEqual([
			'16px',
			'16px',
			'16px',
			'16px'
		]);
	});

	it('takes extra classes', () => {
		const stack = render({ class: 'probe-stack' });

		expect(stack.matches('.app-form-stack.probe-stack')).toBe(true);
	});

	it('renders an empty stack without children', () => {
		expect(render({ children: undefined }).childElementCount).toBe(0);
	});
});
