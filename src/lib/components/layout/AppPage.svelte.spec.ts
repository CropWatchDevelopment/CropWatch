import { createRawSnippet } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { renderWithServices } from '$lib/testing/render';
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
		expect(getComputedStyle(button).alignSelf).toBe('flex-start');
	});

	it('renders an empty shell without children', () => {
		const { shell } = render({ children: undefined });

		expect(shell.childElementCount).toBe(0);
	});
});
