import { flushSync, mount, unmount } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import LocationMap from './LocationMap.svelte';

// A device name is user-editable. If it ever reached the map as HTML, this
// payload would run.
const PAYLOAD = '<img src=x onerror="window.__locationMapXss = true">Pump';

declare global {
	interface Window {
		__locationMapXss?: boolean;
	}
}

let component: ReturnType<typeof mount> | null = null;

afterEach(() => {
	if (component) unmount(component);
	component = null;
	document.body.innerHTML = '';
	delete window.__locationMapXss;
});

describe('LocationMap', () => {
	it('shows device names in pin popups as plain text, never as HTML', async () => {
		const target = document.createElement('div');
		target.style.height = '320px';
		document.body.appendChild(target);

		component = mount(LocationMap, {
			target,
			props: {
				lat: 31.9147,
				long: 131.4232,
				name: 'Office',
				devices: [{ name: PAYLOAD, lat: 31.9148, long: 131.4233, health: 'online' }]
			}
		});
		flushSync();

		// MapLibre loads lazily; wait for the device pin to be placed.
		await expect
			.poll(() => target.querySelector('.location-map__device'), { timeout: 10000 })
			.not.toBeNull();
		const pin = target.querySelector('.location-map__device') as HTMLElement;
		expect(pin.getAttribute('aria-label')).toBe(PAYLOAD);
		pin.dispatchEvent(new MouseEvent('mouseenter'));

		await expect.poll(() => target.querySelector('.maplibregl-popup-content')).not.toBeNull();
		const popup = target.querySelector('.maplibregl-popup-content') as HTMLElement;

		expect(popup.textContent).toBe(PAYLOAD);
		expect(popup.querySelector('img')).toBeNull();
		// Give a would-be onerror handler a chance to fire before checking.
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(window.__locationMapXss).toBeUndefined();
	});
});
