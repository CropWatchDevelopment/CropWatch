import { afterEach, describe, expect, it } from 'vitest';
import { renderWithServices } from '$lib/testing/render';
import Icon from './Icon.svelte';

// An inline SVG, so neither the mask nor the <img> asks the dev server for a file.
const SRC = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4=';

let view: ReturnType<typeof renderWithServices> | null = null;

function render(props: Record<string, unknown>) {
	view = renderWithServices(Icon, { props: props as never });
	return view.target.firstElementChild as HTMLElement;
}

afterEach(() => {
	view?.unmount();
	view = null;
});

describe('Icon', () => {
	it('paints the SVG in the text colour through a CSS mask, hidden from screen readers', () => {
		const icon = render({ src: SRC });

		expect(icon.tagName).toBe('SPAN');
		expect(icon.classList.contains('cw-icon')).toBe(true);
		expect(icon.style.getPropertyValue('--cw-icon-src')).toBe(`url("${SRC}")`);
		expect(icon.getAttribute('aria-hidden')).toBe('true');
		expect(icon.hasAttribute('role')).toBe(false);
		expect(icon.hasAttribute('aria-label')).toBe(false);
		const style = getComputedStyle(icon);
		expect(style.maskImage).toContain(SRC);
		expect(style.backgroundColor).toBe(style.color);
		expect(style.display).toBe('inline-block');
	});

	it('is announced as an image when it has alt text', () => {
		const icon = render({ src: SRC, alt: 'Battery low' });

		expect(icon.getAttribute('role')).toBe('img');
		expect(icon.getAttribute('aria-label')).toBe('Battery low');
		expect(icon.hasAttribute('aria-hidden')).toBe(false);
	});

	it("keeps the caller's style ahead of the mask source", () => {
		const icon = render({ src: SRC, style: 'color: red' });

		expect(icon.style.color).toBe('red');
		expect(icon.style.getPropertyValue('--cw-icon-src')).toBe(`url("${SRC}")`);
		expect(icon.getAttribute('style')?.indexOf('color')).toBe(0);
	});

	it('adds the caller classes and passes other attributes through', () => {
		const icon = render({
			src: SRC,
			class: ['h-4', { 'text-danger': true, hidden: false }],
			title: 'Battery',
			'data-testid': 'battery-icon'
		});

		expect(icon.matches('.cw-icon.h-4.text-danger')).toBe(true);
		expect(icon.classList.contains('hidden')).toBe(false);
		expect(icon.getAttribute('title')).toBe('Battery');
		expect(icon.dataset.testid).toBe('battery-icon');
	});

	it('shows the original colours as an <img> when preserveColor is set', () => {
		const icon = render({ src: SRC, preserveColor: true, class: 'logo', title: 'Brand' });

		expect(icon.tagName).toBe('IMG');
		const image = icon as HTMLImageElement;
		expect(image.getAttribute('src')).toBe(SRC);
		expect(image.alt).toBe('');
		expect(image.matches('.cw-icon.logo')).toBe(true);
		expect(image.hasAttribute('style')).toBe(false);
		expect(image.getAttribute('title')).toBe('Brand');
		expect(getComputedStyle(image).objectFit).toBe('contain');
	});

	it("keeps the alt text and the caller's style on a colour-preserving icon, without a mask", () => {
		const image = render({
			src: SRC,
			preserveColor: true,
			alt: 'CropWatch',
			style: 'width: 2rem'
		}) as HTMLImageElement;

		expect(image.alt).toBe('CropWatch');
		expect(image.style.width).toBe('2rem');
		expect(image.style.getPropertyValue('--cw-icon-src')).toBe('');
	});
});
