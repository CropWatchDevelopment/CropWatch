import { createRawSnippet } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { page as browserPage } from 'vitest/browser';
import { renderWithServices } from '$lib/testing/render';
import AppActionRow from './AppActionRow.svelte';

const PHONE = { width: 414, height: 896 };
const DESKTOP = { width: 1280, height: 800 };

const children = createRawSnippet(() => ({
	render: () => '<button type="submit" class="cw-button probe-save">Save</button>'
}));

let view: ReturnType<typeof renderWithServices> | null = null;

function render(props: Record<string, unknown> = {}) {
	view = renderWithServices(AppActionRow, { props: { children, ...props } });
	return view.target.firstElementChild as HTMLElement;
}

afterEach(async () => {
	view?.unmount();
	view = null;
	await browserPage.viewport(PHONE.width, PHONE.height);
});

describe('AppActionRow', () => {
	it('lays the actions out in a row, stacking on phones by default', () => {
		const row = render();

		expect(row.tagName).toBe('DIV');
		expect(row.classList.contains('app-action-row')).toBe(true);
		expect(row.classList.contains('app-action-row--stack-mobile')).toBe(true);
		expect(row.querySelector(':scope > .probe-save')?.textContent).toBe('Save');
	});

	it('right-aligns the buttons in a wrapping row on larger screens', async () => {
		await browserPage.viewport(DESKTOP.width, DESKTOP.height);
		const row = render();

		const style = getComputedStyle(row);
		expect(style.display).toBe('flex');
		expect(style.flexDirection).toBe('row');
		expect(style.flexWrap).toBe('wrap');
		expect(style.justifyContent).toBe('flex-end');
		expect(style.alignItems).toBe('center');
	});

	it('stacks full-width buttons on a phone', async () => {
		await browserPage.viewport(PHONE.width, PHONE.height);
		const row = render();

		expect(getComputedStyle(row).flexDirection).toBe('column');
		expect(getComputedStyle(row).alignItems).toBe('stretch');
		const button = row.querySelector('.probe-save') as HTMLElement;
		expect(button.getBoundingClientRect().width).toBe(row.getBoundingClientRect().width);
	});

	it('keeps the row on a phone when stacking is turned off', async () => {
		await browserPage.viewport(PHONE.width, PHONE.height);
		const row = render({ stackOnMobile: false });

		expect(row.classList.contains('app-action-row--stack-mobile')).toBe(false);
		expect(getComputedStyle(row).flexDirection).toBe('row');
	});

	it('takes extra classes', () => {
		expect(render({ class: 'probe-row' }).matches('.app-action-row.probe-row')).toBe(true);
	});

	it('renders an empty row without children', () => {
		expect(render({ children: undefined }).childElementCount).toBe(0);
	});
});
