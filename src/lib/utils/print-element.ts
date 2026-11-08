export interface PrintElementOptions {
	/** Document title, which browsers use for the PDF file name and page header. */
	title?: string;
	/** Adjusts the copy before printing (e.g. expand collapsed sections). */
	prepare?: (copy: HTMLElement) => void;
	/** The print call; tests replace it, since a real print dialog would block the runner. */
	print?: (win: Window) => void;
}

// The copied app styles lay the page out for a screen: html and body are locked to the
// window height with overflow hidden (an inner container scrolls), and cards clip with
// overflow hidden. On paper that cuts everything after the first page, so undo both and
// let the copy flow over as many pages as it needs.
export const PRINT_CSS = [
	'@page { margin: 12mm; }',
	'html, body { height: auto !important; min-height: 0 !important; max-height: none !important;',
	' overflow: visible !important; margin: 0; background: #fff !important; }',
	'body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }',
	'body * { overflow: visible !important; max-height: none !important; }',
	'tr, li { break-inside: avoid; }'
].join('\n');

const STYLESHEET_TIMEOUT_MS = 2000;
// Firefox and Safari return from print() before the dialog closes: keep the frame until
// afterprint, or this long if a browser never sends it.
const AFTERPRINT_TIMEOUT_MS = 60_000;

/**
 * Prints one element on its own. A hidden iframe gets a copy of the element and of the
 * page's stylesheets (so scoped component and CWUI styles still apply), in the light
 * theme, prints it and removes itself: no popup window, nothing else from the page on paper.
 */
export async function printElement(
	element: HTMLElement,
	{ title = document.title, prepare, print = (win) => win.print() }: PrintElementOptions = {}
): Promise<void> {
	const frame = document.createElement('iframe');
	frame.setAttribute('aria-hidden', 'true');
	frame.tabIndex = -1;
	frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
	document.body.append(frame);

	const win = frame.contentWindow;
	const doc = frame.contentDocument;
	if (!win || !doc) {
		frame.remove();
		return;
	}

	doc.documentElement.lang = document.documentElement.lang;
	// Paper is white: never print the dark theme's light text.
	doc.documentElement.setAttribute('data-theme', 'light');
	doc.title = title;

	const loading: Promise<void>[] = [];
	for (const node of document.querySelectorAll('link[rel="stylesheet"], style')) {
		const copy = doc.importNode(node, true) as HTMLElement;
		if (copy.tagName === 'LINK') {
			loading.push(
				new Promise((resolve) => {
					copy.addEventListener('load', () => resolve(), { once: true });
					copy.addEventListener('error', () => resolve(), { once: true });
				})
			);
		}
		doc.head.append(copy);
	}
	const pageStyle = doc.createElement('style');
	pageStyle.textContent = PRINT_CSS;
	doc.head.append(pageStyle);

	const copy = doc.importNode(element, true) as HTMLElement;
	prepare?.(copy);
	doc.body.append(copy);

	await Promise.race([
		Promise.all(loading),
		new Promise((resolve) => setTimeout(resolve, STYLESHEET_TIMEOUT_MS))
	]);

	try {
		await new Promise<void>((resolve) => {
			const timer = setTimeout(resolve, AFTERPRINT_TIMEOUT_MS);
			win.addEventListener(
				'afterprint',
				() => {
					clearTimeout(timer);
					resolve();
				},
				{ once: true }
			);
			win.focus();
			print(win);
		});
	} finally {
		frame.remove();
	}
}
