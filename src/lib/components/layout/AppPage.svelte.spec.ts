import { createRawSnippet } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { renderWithServices } from '#lib/testing/render.ts';
import AppPage from './AppPage.svelte';

const children = createRawSnippet(() => ({
	render: () => '<div class="probe-content">Page content</div>'
}));
const backButton = createRawSnippet(() => ({
	render: () => '<button type="button" class="cw-button probe-back">Back</button>'
}));

let view: ReturnType<typeof renderWithServices> | null = null;

function render(props: Record<string, unknown> = {}) {
	view = renderWithServices(AppPage, { props: { children, ...props } });
	const page = view.target.querySelector('section') as HTMLElement;
	return { page, shell: page.querySelector(':scope > .app-page__shell') as HTMLElement };
}

afterEach(() => {
	view?.unmount();
	view = null;
});

describe('AppPage', () => {
	it('wraps the page content in the app-page section and its shell', () => {
		const { page, shell } = render();

		expect(page.classList.contains('app-page')).toBe(true);
		expect(page.classList.contains('app-page--center')).toBe(false);
		expect(shell).not.toBeNull();
		expect(shell.querySelector(':scope > .probe-content')?.textContent).toBe('Page content');
	});

	it('sets no inline width: the page fills the content column', () => {
		const { page } = render();

		expect(page.getAttribute('style')).toBeNull();
	});

	it('grows with tall content instead of shrinking, so .app-shell__main can scroll', () => {
		const { page, shell } = render();

		for (const element of [page, shell]) {
			const style = getComputedStyle(element);
			expect(style.flexGrow).toBe('1');
			expect(style.flexShrink).toBe('0');
			expect(style.flexBasis).toBe('auto');
			expect(style.display).toBe('flex');
			expect(style.flexDirection).toBe('column');
		}
		expect(getComputedStyle(page).width).toBe(getComputedStyle(page.parentElement!).width);
	});

	it('centres short content vertically when asked', () => {
		const { page, shell } = render({ align: 'center' });

		expect(page.classList.contains('app-page--center')).toBe(true);
		const style = getComputedStyle(shell);
		expect(style.flexGrow).toBe('0');
		expect(style.flexShrink).toBe('0');
	});

	it('takes extra classes, e.g. the dashboard override hook', () => {
		const { page } = render({ class: 'dashboard-page' });

		expect(page.matches('.app-page.dashboard-page')).toBe(true);
		expect(page.classList.contains('app-page--center')).toBe(false);
	});

	it('keeps a back button at its natural width', () => {
		const { shell } = render({ children: backButton });

		const button = shell.querySelector(':scope > .probe-back') as HTMLElement;
		// Newer Chromium reports the computed `flex-start` as `flow-start`.
		expect(['flex-start', 'flow-start']).toContain(getComputedStyle(button).alignSelf);
	});

	it('leaves a small gap above the back button on phones too', () => {
		// The CWUI tokens are not loaded in specs; give --cw-space-2 its real value.
		document.documentElement.style.setProperty('--cw-space-2', '0.5rem');
		try {
			const { page } = render({ children: backButton });

			expect(window.innerWidth).toBeLessThan(640);
			expect(getComputedStyle(page).paddingTop).toBe('8px');
		} finally {
			document.documentElement.style.removeProperty('--cw-space-2');
		}
	});

	it('renders an empty shell without children', () => {
		const { shell } = render({ children: undefined });

		expect(shell.childElementCount).toBe(0);
	});
});
