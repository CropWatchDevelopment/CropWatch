import { afterEach, describe, expect, it } from 'vitest';
import { printElement } from './print-element';

let card: HTMLElement | null = null;
let other: HTMLElement | null = null;
let style: HTMLStyleElement | null = null;

afterEach(() => {
	card?.remove();
	other?.remove();
	style?.remove();
	document.documentElement.removeAttribute('data-theme');
});

function setup() {
	style = document.head.appendChild(document.createElement('style'));
	style.textContent = '.print-me { color: rgb(1, 2, 3); }';
	card = document.body.appendChild(document.createElement('section'));
	card.className = 'print-me';
	card.innerHTML = '<h3>Growing advice</h3><button>Print</button>';
	other = document.body.appendChild(document.createElement('p'));
	other.textContent = 'the rest of the page';
	return card;
}

describe('printElement', () => {
	it('prints a styled copy of only that element, in the light theme, then cleans up', async () => {
		document.documentElement.setAttribute('data-theme', 'dark');
		let seen: { body: string; theme: string | null; title: string; color: string } | null = null;

		await printElement(setup(), {
			title: 'Advice for Nov 8',
			print: (win) => {
				const doc = win.document;
				seen = {
					body: doc.body.innerHTML,
					theme: doc.documentElement.getAttribute('data-theme'),
					title: doc.title,
					color: win.getComputedStyle(doc.querySelector('.print-me')!).color
				};
				win.dispatchEvent(new Event('afterprint'));
			}
		});

		expect(seen).toEqual({
			body: '<section class="print-me"><h3>Growing advice</h3><button>Print</button></section>',
			theme: 'light',
			title: 'Advice for Nov 8',
			color: 'rgb(1, 2, 3)'
		});
		expect(document.querySelector('iframe')).toBeNull();
	});

	it("undoes the screen layout's height lock so the copy runs onto more pages", async () => {
		// The app shell's layout.css: the window never scrolls, an inner container does.
		const lock = document.head.appendChild(document.createElement('style'));
		lock.textContent =
			'html, body { height: 100%; overflow: hidden; } .print-me { overflow: hidden; max-height: 50px; }';
		let seen: Record<string, string> = {};
		try {
			await printElement(setup(), {
				print: (win) => {
					const css = (el: Element) => win.getComputedStyle(el);
					seen = {
						html: css(win.document.documentElement).overflow,
						body: css(win.document.body).overflow,
						card: css(win.document.querySelector('.print-me')!).overflow,
						cardMaxHeight: css(win.document.querySelector('.print-me')!).maxHeight
					};
					win.dispatchEvent(new Event('afterprint'));
				}
			});
		} finally {
			lock.remove();
		}
		expect(seen).toEqual({
			html: 'visible',
			body: 'visible',
			card: 'visible',
			cardMaxHeight: 'none'
		});
	});

	it('lets the caller adjust the copy without touching the page', async () => {
		const element = setup();
		let printed = '';

		await printElement(element, {
			prepare: (copy) => copy.querySelector('button')?.remove(),
			print: (win) => {
				printed = win.document.body.innerHTML;
				win.dispatchEvent(new Event('afterprint'));
			}
		});

		expect(printed).not.toContain('<button>');
		expect(element.querySelector('button')).not.toBeNull();
	});
});
