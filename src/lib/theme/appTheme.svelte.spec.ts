import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const html = document.documentElement;
const originalTheme = html.getAttribute('data-theme');

/** A `matchMedia` stand-in answering the dark-scheme query with `dark`. */
const osPrefers = (dark: boolean) =>
	vi.fn((query: string) => ({ matches: dark && query === '(prefers-color-scheme: dark)' }));

// appTheme is a singleton that reads the theme once, when it is first imported:
// set the attribute first, then import it.
beforeAll(() => html.setAttribute('data-theme', 'dark'));

afterEach(() => {
	vi.unstubAllGlobals();
});

afterAll(() => {
	if (originalTheme === null) html.removeAttribute('data-theme');
	else html.setAttribute('data-theme', originalTheme);
});

describe('appTheme', () => {
	it('starts from the theme CwThemePicker put on <html>', async () => {
		const { appTheme } = await import('./appTheme.svelte');

		expect(appTheme.current).toBe('dark');
	});

	it('follows later changes to data-theme', async () => {
		const { appTheme } = await import('./appTheme.svelte');

		html.setAttribute('data-theme', 'light');
		await expect.poll(() => appTheme.current).toBe('light');

		html.setAttribute('data-theme', 'dark');
		await expect.poll(() => appTheme.current).toBe('dark');
	});

	it('falls back to the OS colour scheme when data-theme is removed or unknown', async () => {
		const { appTheme } = await import('./appTheme.svelte');
		html.setAttribute('data-theme', 'light');
		await expect.poll(() => appTheme.current).toBe('light');

		const darkOs = osPrefers(true);
		vi.stubGlobal('matchMedia', darkOs);
		html.removeAttribute('data-theme');
		await expect.poll(() => appTheme.current).toBe('dark');
		expect(darkOs).toHaveBeenCalledWith('(prefers-color-scheme: dark)');

		vi.stubGlobal('matchMedia', osPrefers(false));
		html.setAttribute('data-theme', 'sepia');
		await expect.poll(() => appTheme.current).toBe('light');
	});

	it('is reactive inside effects', async () => {
		const { appTheme } = await import('./appTheme.svelte');
		html.setAttribute('data-theme', 'light');
		await expect.poll(() => appTheme.current).toBe('light');

		const seen: string[] = [];
		const stop = $effect.root(() => {
			$effect(() => {
				seen.push(appTheme.current);
			});
		});
		await expect.poll(() => seen).toEqual(['light']);

		html.setAttribute('data-theme', 'dark');
		await expect.poll(() => seen).toEqual(['light', 'dark']);
		stop();
	});
});
