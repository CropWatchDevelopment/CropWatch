import { flushSync, mount, unmount } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import LocationMap from './LocationMap.svelte';

// A 1×1 transparent PNG, served for every map tile (GSI photo or OpenStreetMap)
// so the map renders without the network.
const BLANK_TILE = Uint8Array.from(
	atob(
		'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
	),
	(char) => char.charCodeAt(0)
);

// Hosts the map has fetched tiles from in the current test.
const tileHosts = new Set<string>();

beforeEach(() => {
	tileHosts.clear();
	const guardedFetch = globalThis.fetch;
	vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
		const url = input instanceof Request ? input.url : String(input);
		if (
			url.startsWith('https://cyberjapandata.gsi.go.jp/') ||
			url.startsWith('https://tile.openstreetmap.org/')
		) {
			tileHosts.add(new URL(url).host);
			return Promise.resolve(
				new Response(BLANK_TILE, { status: 200, headers: { 'content-type': 'image/png' } })
			);
		}
		return guardedFetch(input, init);
	});
});

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
	vi.unstubAllGlobals();
});

describe('LocationMap', () => {
	it('opens on GSI aerial photos and switches to the street map and back', async () => {
		const target = document.createElement('div');
		target.style.height = '320px';
		document.body.appendChild(target);

		component = mount(LocationMap, {
			target,
			props: { lat: 31.9147, long: 131.4232, name: 'Office' }
		});
		flushSync();

		const button = () => target.querySelector<HTMLButtonElement>('#location-map-basemap-button')!;
		const attribution = () =>
			target.querySelector('.maplibregl-ctrl-attrib-inner')?.textContent ?? '';

		await expect
			.poll(() => tileHosts.has('cyberjapandata.gsi.go.jp'), { timeout: 10000 })
			.toBe(true);
		await expect.poll(attribution).toContain('地理院タイル');
		expect(tileHosts.has('tile.openstreetmap.org')).toBe(false);
		expect(button().textContent?.trim()).toBe(m.location_map_show_map());

		button().click();
		flushSync();

		await expect.poll(() => tileHosts.has('tile.openstreetmap.org'), { timeout: 10000 }).toBe(true);
		await expect.poll(attribution).toContain('OpenStreetMap');
		expect(attribution()).not.toContain('地理院タイル');
		expect(button().textContent?.trim()).toBe(m.location_map_show_satellite());

		button().click();
		flushSync();

		await expect.poll(attribution).toContain('地理院タイル');
		expect(attribution()).not.toContain('OpenStreetMap');
		expect(button().textContent?.trim()).toBe(m.location_map_show_map());
	});

	it('lets a plain scroll pass to the page and zooms only with Ctrl/⌘ held', async () => {
		const target = document.createElement('div');
		target.style.height = '320px';
		document.body.appendChild(target);
		const onzoomchange = vi.fn();

		component = mount(LocationMap, {
			target,
			props: {
				lat: 31.9147,
				long: 131.4232,
				zoom: 15,
				name: 'Office',
				editable: true,
				onzoomchange
			}
		});
		flushSync();

		await expect
			.poll(() => target.querySelector('.maplibregl-cooperative-gesture-screen'), {
				timeout: 10000
			})
			.not.toBeNull();
		const hint = target.querySelector('.maplibregl-cooperative-gesture-screen')!;
		// Ctrl everywhere but a Mac, which uses ⌘.
		expect([m.location_map_gesture_ctrl_scroll(), m.location_map_gesture_cmd_scroll()]).toContain(
			hint.querySelector('.maplibregl-desktop-message')?.textContent
		);
		expect(hint.querySelector('.maplibregl-mobile-message')?.textContent).toBe(
			m.location_map_gesture_two_fingers()
		);

		const canvas = target.querySelector('.maplibregl-canvas-container')!;
		const wheel = (keys: { ctrlKey?: boolean; metaKey?: boolean } = {}) => {
			const event = new WheelEvent('wheel', {
				// Big enough to zoom past the next whole level; small wheel steps zoom less.
				deltaY: -1000,
				clientX: 100,
				clientY: 100,
				bubbles: true,
				cancelable: true,
				...keys
			});
			canvas.dispatchEvent(event);
			return event;
		};

		// A plain scroll is left to the page (not cancelled) and shows the hint.
		expect(wheel().defaultPrevented).toBe(false);
		expect(hint.classList.contains('maplibregl-show')).toBe(true);
		await new Promise((resolve) => setTimeout(resolve, 400));
		expect(onzoomchange).not.toHaveBeenCalled();

		// Ctrl (⌘ on a Mac) + scroll zooms the map instead.
		expect(wheel({ ctrlKey: true, metaKey: true }).defaultPrevented).toBe(true);
		await expect.poll(() => onzoomchange.mock.calls.length, { timeout: 5000 }).toBeGreaterThan(0);
		expect(onzoomchange.mock.calls.at(-1)![0]).toBeGreaterThan(15);
	});

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
