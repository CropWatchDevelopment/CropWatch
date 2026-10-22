import { flushSync } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getLocale, setLocale } from '$lib/paraglide/runtime';
import { renderWithServices } from '$lib/testing/render';
import LanguageSwitcher from './LanguageSwitcher.svelte';

// A real setLocale writes the PARAGLIDE_LOCALE cookie and reloads the page,
// which would take the test runner down with it: stub it at the Paraglide
// boundary. getLocale keeps its real answer (ja in tests) unless a test
// overrides it, and afterEach puts the real one back.
vi.mock('$lib/paraglide/runtime', async (importOriginal) => {
	const runtime = await importOriginal<typeof import('$lib/paraglide/runtime')>();
	return { ...runtime, getLocale: vi.fn(runtime.getLocale), setLocale: vi.fn() };
});

let view: ReturnType<typeof renderWithServices> | null = null;

function render(props: Record<string, unknown> = {}) {
	view = renderWithServices(LanguageSwitcher, { props });
	const root = view.target.firstElementChild as HTMLElement;
	const [japanese, english] = [...root.querySelectorAll('button')];
	return { root, japanese, english };
}

const isActive = (button: HTMLButtonElement) =>
	button.classList.contains('language-switcher__button--active') &&
	button.getAttribute('aria-pressed') === 'true';

afterEach(() => {
	view?.unmount();
	view = null;
	vi.mocked(getLocale).mockReset();
	vi.mocked(setLocale).mockReset();
	vi.restoreAllMocks();
});

describe('LanguageSwitcher', () => {
	it('offers Japanese and English, marking the current (Japanese) locale', () => {
		const { root, japanese, english } = render();

		expect(root.querySelectorAll('button')).toHaveLength(2);
		expect(japanese.textContent?.trim()).toBe('日本語');
		expect(english.textContent?.trim()).toBe('English');
		expect(japanese.type).toBe('button');
		expect(english.type).toBe('button');
		expect(isActive(japanese)).toBe(true);
		expect(english.getAttribute('aria-pressed')).toBe('false');
		expect(english.classList.contains('language-switcher__button--active')).toBe(false);
	});

	it('switches the app to English, marking it at once', async () => {
		const { japanese, english } = render();

		english.click();
		flushSync();

		// Without waiting for setLocale to reload the page.
		expect(isActive(english)).toBe(true);
		expect(japanese.getAttribute('aria-pressed')).toBe('false');
		expect(japanese.classList.contains('language-switcher__button--active')).toBe(false);
		await vi.waitFor(() => expect(setLocale).toHaveBeenCalledWith('en'));

		english.click();
		await Promise.resolve();
		expect(setLocale).toHaveBeenCalledTimes(1);
	});

	it('marks the current language again when the switch fails', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		const failure = new Error('locale unavailable');
		vi.mocked(setLocale).mockRejectedValue(failure);
		const { japanese, english } = render();

		english.click();

		await vi.waitFor(() =>
			expect(consoleError).toHaveBeenCalledWith('Failed to change locale:', failure)
		);
		flushSync();
		expect(isActive(japanese)).toBe(true);
		expect(english.getAttribute('aria-pressed')).toBe('false');
	});

	it('does nothing when the current language is picked again', async () => {
		const { japanese } = render();

		japanese.click();
		flushSync();
		await Promise.resolve();

		expect(setLocale).not.toHaveBeenCalled();
	});

	it('marks English and switches back to Japanese when the app is in English', async () => {
		vi.mocked(getLocale).mockReturnValue('en');
		const { japanese, english } = render();

		expect(isActive(english)).toBe(true);
		expect(japanese.getAttribute('aria-pressed')).toBe('false');

		english.click();
		await Promise.resolve();
		expect(setLocale).not.toHaveBeenCalled();

		japanese.click();
		await vi.waitFor(() => expect(setLocale).toHaveBeenCalledWith('ja'));
		expect(setLocale).toHaveBeenCalledTimes(1);
	});

	it('has a compact variant and takes extra classes', () => {
		const plain = render().root;
		expect(plain.classList.contains('language-switcher')).toBe(true);
		expect(plain.classList.contains('language-switcher--compact')).toBe(false);
		view?.unmount();

		const { root } = render({ compact: true, class: 'sidebar-language' });

		expect(root.matches('.language-switcher.language-switcher--compact.sidebar-language')).toBe(
			true
		);
	});

	it('leaves the real locale alone (the tests run in Japanese)', () => {
		render().english.click();

		expect(getLocale()).toBe('ja');
		expect(document.cookie).not.toContain('PARAGLIDE_LOCALE=en');
	});
});
