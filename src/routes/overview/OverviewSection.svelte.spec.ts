import { createRawSnippet } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { renderWithServices } from '$lib/testing/render';
import OverviewSection from './OverviewSection.svelte';

const children = createRawSnippet(() => ({ render: () => '<p class="probe-body">Body</p>' }));
const actions = createRawSnippet(() => ({
	render: () => '<button type="button" class="probe-action">Act</button>'
}));

let view: ReturnType<typeof renderWithServices> | null = null;

function render(props: Record<string, unknown>) {
	view = renderWithServices(OverviewSection, { props: { title: 'Locations', children, ...props } });
	return view.target.querySelector('section') as HTMLElement;
}

afterEach(() => {
	view?.unmount();
	view = null;
});

describe('OverviewSection', () => {
	it('is a section labelled by its title, around its content', () => {
		const section = render({});

		const heading = section.querySelector('h2.section__title') as HTMLElement;
		expect(heading.textContent).toBe('Locations');
		expect(heading.id).not.toBe('');
		expect(section.getAttribute('aria-labelledby')).toBe(heading.id);
		expect(section.className).toContain('section');
		expect(section.querySelector('.probe-body')?.textContent).toBe('Body');
		expect(section.hasAttribute('id')).toBe(false);
		expect(section.querySelector('.section__subtitle')).toBeNull();
		expect(section.querySelector('.section__actions')).toBeNull();
	});

	it('shows a subtitle, kept on phones only when asked', () => {
		let subtitle = render({ subtitle: 'Devices online per location' }).querySelector(
			'.section__subtitle'
		);
		expect(subtitle?.textContent?.trim()).toBe('Devices online per location');
		expect(subtitle?.classList.contains('section__subtitle--phone')).toBe(false);
		view?.unmount();

		subtitle = render({ subtitle: 'Hourly', subtitleOnPhone: true }).querySelector(
			'.section__subtitle'
		);
		expect(subtitle?.classList.contains('section__subtitle--phone')).toBe(true);
	});

	it('renders the actions in the header', () => {
		const section = render({ actions });

		expect(
			section.querySelector('.section__header .section__actions .probe-action')
		).not.toBeNull();
	});

	it('carries an id for in-page links, its class and the phone layout modifiers', () => {
		const plain = render({ id: 'attention', class: 'ov-order-1' });
		expect(plain.id).toBe('attention');
		expect(plain.classList.contains('ov-order-1')).toBe(true);
		expect(plain.classList.contains('section--bare-phone')).toBe(false);
		expect(plain.classList.contains('section--stack-phone')).toBe(false);
		view?.unmount();

		const phone = render({ bareOnPhone: true, stackOnPhone: true });
		expect(phone.classList.contains('section--bare-phone')).toBe(true);
		expect(phone.classList.contains('section--stack-phone')).toBe(true);
	});
});
