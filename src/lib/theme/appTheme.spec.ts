import { afterEach, describe, expect, it, vi } from 'vitest';
import { appTheme } from './appTheme.svelte';

// appTheme reads the theme once, when the module is evaluated, so the stubbed
// environments below evaluate a fresh copy.
async function freshAppTheme() {
	vi.resetModules();
	return (await import('./appTheme.svelte')).appTheme;
}

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('appTheme without a DOM (server rendering)', () => {
	it('is light, and needs no document to observe', () => {
		expect(typeof document).toBe('undefined');

		expect(appTheme.current).toBe('light');
	});

	it("follows the OS colour scheme when only window's matchMedia is available", async () => {
		vi.stubGlobal('window', {
			matchMedia: (query: string) => ({ matches: query === '(prefers-color-scheme: dark)' })
		});

		expect((await freshAppTheme()).current).toBe('dark');
	});

	it('is light when window has no matchMedia', async () => {
		vi.stubGlobal('window', {});

		expect((await freshAppTheme()).current).toBe('light');
	});
});
