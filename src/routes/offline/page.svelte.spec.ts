import { afterEach, describe, expect, it } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import OfflinePage from './+page.svelte';

let view: ReturnType<typeof renderWithServices> | null = null;

afterEach(() => {
	view?.unmount();
	view = null;
});

describe('offline page', () => {
	it('explains that the app is offline', async () => {
		view = renderWithServices(OfflinePage);

		await expect.poll(() => document.title).toBe(m.offline_page_title());
		expect(document.head.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
			m.offline_page_description()
		);
		expect(view.target.querySelector('.offline-eyebrow')?.textContent).toBe(m.offline_eyebrow());
		expect(view.target.querySelector('h1')?.textContent).toBe(m.offline_heading());
		expect(view.target.querySelector('.offline-card > p:not(.offline-eyebrow)')?.textContent).toBe(
			m.offline_body()
		);
	});

	it('opens the URL that failed again to try again, without JavaScript', async () => {
		const navigation = (window as unknown as { navigation: EventTarget }).navigation;
		const attempts: string[] = [];
		const onNavigate = (event: Event) => {
			attempts.push((event as Event & { destination: { url: string } }).destination.url);
			event.preventDefault();
		};
		navigation.addEventListener('navigate', onNavigate);
		view = renderWithServices(OfflinePage);

		try {
			const retry = document.getElementById('offline-retry-button') as HTMLAnchorElement;
			expect(retry.textContent?.trim()).toBe(m.action_try_again());
			expect(retry.getAttribute('href')).toBe('');

			retry.click();

			await expect.poll(() => attempts).toEqual([location.href.split('#')[0]]);
		} finally {
			navigation.removeEventListener('navigate', onNavigate);
		}
	});
});
