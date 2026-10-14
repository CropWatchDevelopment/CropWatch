import { flushSync, mount, unmount } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import LocationMap from './LocationMap.svelte';

// A device name is user-editable. Leaflet renders string tooltip content with
// innerHTML (CVE-2025-69993), so this payload would run if it reached Leaflet
// as a string.
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
	it('shows device names in pin tooltips as plain text, never as HTML', async () => {
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

		// Leaflet loads lazily; wait for the device pin to be drawn.
		await expect
			.poll(() => target.querySelector('path.leaflet-interactive'), { timeout: 5000 })
			.not.toBeNull();
		const pin = target.querySelector('path.leaflet-interactive') as SVGPathElement;
		pin.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));

		await expect.poll(() => target.querySelector('.leaflet-tooltip')).not.toBeNull();
		const tooltip = target.querySelector('.leaflet-tooltip') as HTMLElement;

		expect(tooltip.textContent).toBe(PAYLOAD);
		expect(tooltip.querySelector('img')).toBeNull();
		// Give a would-be onerror handler a chance to fire before checking.
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(window.__locationMapXss).toBeUndefined();
	});
});
