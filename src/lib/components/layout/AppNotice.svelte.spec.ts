import { createRawSnippet } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { renderWithServices } from '$lib/testing/render';
import AppNotice from './AppNotice.svelte';

const children = createRawSnippet(() => ({
	render: () => '<p class="probe-message">Something went wrong</p>'
}));

let view: ReturnType<typeof renderWithServices> | null = null;

function render(props: Record<string, unknown> = {}) {
	view = renderWithServices(AppNotice, { props: { children, ...props } });
	return view.target.firstElementChild as HTMLElement;
}

afterEach(() => {
	view?.unmount();
	view = null;
});

describe('AppNotice', () => {
	it('is a neutral notice around its body by default', () => {
		const notice = render();

		expect(notice.tagName).toBe('SECTION');
		expect(notice.matches('.app-notice.app-notice--neutral')).toBe(true);
		expect(notice.querySelector('.app-notice__title')).toBeNull();
		expect(notice.querySelector(':scope > .app-notice__body > .probe-message')?.textContent).toBe(
			'Something went wrong'
		);
		expect(notice.hasAttribute('aria-live')).toBe(false);
		expect(notice.hasAttribute('role')).toBe(false);
		expect(getComputedStyle(notice).display).toBe('grid');
	});

	it.each(['neutral', 'info', 'warning', 'danger', 'success'])('renders the %s tone', (tone) => {
		const notice = render({ tone });

		expect(notice.classList.contains(`app-notice--${tone}`)).toBe(true);
		expect([...notice.classList].filter((name) => name.startsWith('app-notice--'))).toEqual([
			`app-notice--${tone}`
		]);
	});

	it('shows a title above the body', () => {
		const notice = render({ tone: 'danger', title: 'Delete failed' });

		const title = notice.querySelector(':scope > p.app-notice__title') as HTMLElement;
		expect(title.textContent).toBe('Delete failed');
		expect(title.nextElementSibling?.classList.contains('app-notice__body')).toBe(true);
	});

	it('announces itself when given a live region and role', () => {
		const notice = render({ tone: 'warning', ariaLive: 'polite', role: 'status' });

		expect(notice.getAttribute('aria-live')).toBe('polite');
		expect(notice.getAttribute('role')).toBe('status');
	});

	it('renders a title-only notice without a body', () => {
		const notice = render({ title: 'No devices yet', children: undefined });

		expect(notice.querySelector('.app-notice__title')?.textContent).toBe('No devices yet');
		expect(notice.querySelector('.app-notice__body')).toBeNull();
	});

	it('takes extra classes', () => {
		expect(render({ class: 'probe-notice' }).matches('.app-notice.probe-notice')).toBe(true);
	});
});
