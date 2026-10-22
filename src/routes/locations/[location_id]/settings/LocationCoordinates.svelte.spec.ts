import { flushSync } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ActionResult } from '@sveltejs/kit';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import LocationCoordinates from './LocationCoordinates.svelte';

type Submit = (input: Record<string, unknown>) => unknown;
type LngLat = [number, number];

const { invalidateAll, forms, maplibre } = vi.hoisted(() => {
	type Handler = (event?: unknown) => void;

	/** Just enough of MapLibre's event API: `on`, plus `fire` for tests. */
	class Evented {
		handlers: Record<string, Handler[]> = {};
		on(type: string, handler: Handler) {
			(this.handlers[type] ??= []).push(handler);
			return this;
		}
		fire(type: string, event?: unknown) {
			for (const handler of this.handlers[type] ?? []) handler(event);
		}
	}

	class FakeMap extends Evented {
		static last: FakeMap | null = null;
		options: { center: LngLat; zoom: number; scrollZoom: boolean };
		zoom: number;
		/** Whether the location pin is inside the visible area. */
		inView = true;
		touchZoomRotate = { disableRotation: vi.fn() };
		addControl = vi.fn();
		resize = vi.fn();
		remove = vi.fn();
		jumpTo = vi.fn((target: { center: LngLat; zoom: number }) => (this.zoom = target.zoom));
		panTo = vi.fn();
		constructor(options: FakeMap['options']) {
			super();
			this.options = options;
			this.zoom = options.zoom;
			FakeMap.last = this;
		}
		getZoom() {
			return this.zoom;
		}
		getBounds() {
			return { contains: () => this.inView };
		}
	}

	class FakeMarker extends Evented {
		static all: FakeMarker[] = [];
		options: { element: HTMLElement; anchor?: string; draggable?: boolean };
		position: LngLat = [0, 0];
		remove = vi.fn();
		constructor(options: FakeMarker['options']) {
			super();
			this.options = options;
			FakeMarker.all.push(this);
		}
		setLngLat(position: LngLat) {
			this.position = position;
			return this;
		}
		getLngLat() {
			return { lng: this.position[0], lat: this.position[1] };
		}
		addTo() {
			return this;
		}
	}

	return {
		invalidateAll: vi.fn(),
		forms: { submit: null as Submit | null, applyAction: vi.fn() },
		maplibre: {
			Map: FakeMap,
			Marker: FakeMarker,
			Popup: class {},
			NavigationControl: class {},
			setWorkerUrl: vi.fn()
		}
	};
});
vi.mock('maplibre-gl', () => maplibre);
vi.mock('$app/navigation', () => ({ invalidateAll }));
// `use:enhance` hands its submit function to the mock; tests run it the way
// SvelteKit does on submit, with the action result of their choosing.
vi.mock('$app/forms', () => ({
	applyAction: forms.applyAction,
	enhance: (_form: HTMLFormElement, submit: Submit) => {
		forms.submit = submit;
		return { destroy: () => {} };
	}
}));

interface Props {
	locationName: string;
	coordinates: { lat: number; long: number } | null;
	mapZoom: number | null;
	devicePositions: { lat: number | null; long: number | null }[];
}

const SAVED: Props = {
	locationName: 'Greenhouse A',
	coordinates: { lat: 31.9147, long: 131.4232 },
	mapZoom: 15,
	devicePositions: []
};

let view: ReturnType<typeof renderWithServices> | null = null;

function render(props: Partial<Props> = {}) {
	view = renderWithServices(LocationCoordinates, { props: { ...SAVED, ...props } });
	return view;
}

/** Renders and waits for the (lazily loaded) map. */
async function renderWithMap(props: Partial<Props> = {}) {
	const rendered = render(props);
	await vi.waitFor(() => expect(maplibre.Map.last).not.toBeNull());
	flushSync();
	return { view: rendered, map: maplibre.Map.last! };
}

const byId = <T extends HTMLElement = HTMLButtonElement>(id: string) =>
	document.getElementById(id) as T;
const field = (id: string) => byId<HTMLInputElement>(`location-coordinates-${id}-input`);
const button = (id: string) => byId(`location-coordinates-${id}-button`);
const zoomField = () => document.querySelector('input[name="map_zoom"]') as HTMLInputElement;
const position = () => [field('lat').value, field('long').value];
const notice = () => document.querySelector('.app-notice');

function type(id: string, value: string) {
	field(id).value = value;
	field(id).dispatchEvent(new Event('input', { bubbles: true }));
	flushSync();
}

function submit() {
	if (!forms.submit) throw new Error('the form is not enhanced');
	const cancel = vi.fn();
	const callback = forms.submit({ cancel, formData: new FormData() }) as
		| ((input: { result: ActionResult }) => Promise<void>)
		| undefined;
	flushSync();
	return { cancel, callback };
}

beforeEach(() => {
	maplibre.Map.last = null;
	maplibre.Marker.all = [];
});

afterEach(() => {
	view?.unmount();
	view = null;
	forms.submit = null;
	forms.applyAction.mockReset();
	invalidateAll.mockReset();
	vi.restoreAllMocks();
});

describe('LocationCoordinates map', () => {
	it('shows the saved position, pinned, at the saved zoom', async () => {
		const { map } = await renderWithMap();

		expect(document.body.textContent).toContain(m.location_coordinates_title());
		expect(position()).toEqual(['31.9147', '131.4232']);
		expect(zoomField().value).toBe('15');
		expect(map.options).toMatchObject({ center: [131.4232, 31.9147], zoom: 15, scrollZoom: true });
		expect(maplibre.setWorkerUrl).toHaveBeenCalled();
		expect(map.touchZoomRotate.disableRotation).toHaveBeenCalled();
		expect(map.addControl).toHaveBeenCalledWith(expect.any(maplibre.NavigationControl), 'top-left');
		const [pin] = maplibre.Marker.all;
		expect(pin.position).toEqual([131.4232, 31.9147]);
		expect(pin.options).toMatchObject({ anchor: 'bottom', draggable: true });
		expect(pin.options.element.getAttribute('aria-label')).toBe('Greenhouse A');
		expect(pin.options.element.title).toBe('Greenhouse A');
		expect(pin.options.element.querySelector('svg path')).not.toBeNull();
		expect(
			document.querySelector(
				`[role="region"][aria-label="${m.location_detail_map_label({ name: 'Greenhouse A' })}"]`
			)
		).not.toBeNull();
		expect((button('save') as HTMLButtonElement).disabled).toBe(true);
		expect((button('reset') as HTMLButtonElement).disabled).toBe(true);
	});

	it('zooms to the default level when the saved zoom is unusable', async () => {
		const { map } = await renderWithMap({ mapZoom: 0 });

		expect(map.options.zoom).toBe(16);
		expect(zoomField().value).toBe('0');
	});

	it('starts on the whole of Japan, without a pin, when nothing is saved', async () => {
		const { map } = await renderWithMap({ coordinates: null, mapZoom: null });

		expect(position()).toEqual(['', '']);
		expect(map.options).toMatchObject({ center: [138.25, 36.2], zoom: 5 });
		expect(maplibre.Marker.all).toEqual([]);
		expect(button('clear')).toBeNull();
		expect(zoomField().value).toBe('');
	});

	it('picks a position by clicking the map, to about 10 cm', async () => {
		const { map } = await renderWithMap({ coordinates: null });
		type('paste', 'nowhere');
		button('paste').click();
		flushSync();

		map.fire('click', { lngLat: { lat: 31.123456789, lng: 131.987654321 } });
		flushSync();

		expect(position()).toEqual(['31.123457', '131.987654']);
		expect(maplibre.Marker.all).toHaveLength(1);
		// From the whole-country view, it zooms in to the saved zoom.
		expect(map.jumpTo).toHaveBeenCalledWith({ center: [131.987654, 31.123457], zoom: 15 });
		expect((button('save') as HTMLButtonElement).disabled).toBe(false);
	});

	it('moves the position when the pin is dragged', async () => {
		await renderWithMap();
		const [pin] = maplibre.Marker.all;

		pin.position = [131.5, 31.95];
		pin.fire('dragend');
		flushSync();

		expect(position()).toEqual(['31.95', '131.5']);
		expect(maplibre.Marker.all).toHaveLength(1);
		expect(pin.position).toEqual([131.5, 31.95]);
	});

	it('keeps the zoom the map was left at', async () => {
		const { map } = await renderWithMap();

		map.zoom = 12.6;
		map.fire('zoomend');
		flushSync();

		expect(zoomField().value).toBe('13');
		expect((button('save') as HTMLButtonElement).disabled).toBe(false);
	});

	it('brings a typed position into view: pan when zoomed in, jump when zoomed out', async () => {
		const { map } = await renderWithMap({ mapZoom: null });
		map.zoom = 14;

		type('lat', '31.95');
		expect(map.panTo).not.toHaveBeenCalled();

		map.inView = false;
		type('long', '131.5');
		expect(map.panTo).toHaveBeenCalledWith([131.5, 31.95]);

		map.zoom = 8;
		type('lat', '32');
		expect(map.jumpTo).toHaveBeenCalledWith({ center: [131.5, 32], zoom: 16 });
		expect(maplibre.Marker.all[0].position).toEqual([131.5, 32]);
	});

	it('drops the pin while the position is cleared or invalid', async () => {
		await renderWithMap();
		const [pin] = maplibre.Marker.all;

		type('lat', '95');

		expect(pin.remove).toHaveBeenCalled();
		expect(byId('location-coordinates-form').textContent).toContain(
			m.location_coordinates_invalid_latitude()
		);
		expect((button('save') as HTMLButtonElement).disabled).toBe(true);

		type('lat', '31.9');
		expect(maplibre.Marker.all).toHaveLength(2);
	});

	it('tears the map down on unmount, and builds none when unmounted first', async () => {
		const { map } = await renderWithMap();
		view?.unmount();
		view = null;
		expect(map.remove).toHaveBeenCalled();
		expect(maplibre.Marker.all[0].remove).toHaveBeenCalled();

		maplibre.Map.last = null;
		render().unmount();
		view = null;
		await new Promise((resolve) => setTimeout(resolve, 20));
		expect(maplibre.Map.last).toBeNull();
	});
});

describe('LocationCoordinates fields', () => {
	it('flags coordinates out of range, then accepts valid ones', async () => {
		await renderWithMap();

		type('lat', '-91');
		type('long', 'east');
		const form = byId('location-coordinates-form').textContent;
		expect(form).toContain(m.location_coordinates_invalid_latitude());
		expect(form).toContain(m.location_coordinates_invalid_longitude());

		type('lat', '-33.86');
		type('long', '151.2');
		expect(byId('location-coordinates-form').textContent).not.toContain(
			m.location_coordinates_invalid_latitude()
		);
		expect((button('save') as HTMLButtonElement).disabled).toBe(false);
	});

	it('clears both coordinates, and resets to the saved ones', async () => {
		const { map } = await renderWithMap();
		map.zoom = 10;
		map.fire('zoomend');

		button('clear').click();
		flushSync();
		expect(position()).toEqual(['', '']);
		expect(button('clear')).toBeNull();
		expect((button('save') as HTMLButtonElement).disabled).toBe(false);

		button('reset').click();
		flushSync();
		expect(position()).toEqual(['31.9147', '131.4232']);
		expect(zoomField().value).toBe('15');
		expect((button('reset') as HTMLButtonElement).disabled).toBe(true);
	});

	it('cannot save half a position, and resets to none when none is saved', async () => {
		await renderWithMap({ coordinates: null, mapZoom: null });

		type('lat', '31.9');
		expect((button('save') as HTMLButtonElement).disabled).toBe(true);
		expect(maplibre.Marker.all).toEqual([]);
		// The blank half is not flagged; only a typed, invalid value is.
		expect(byId('location-coordinates-form').textContent).not.toContain(
			m.location_coordinates_invalid_longitude()
		);

		button('reset').click();
		flushSync();
		expect(position()).toEqual(['', '']);
		expect(zoomField().value).toBe('');
	});

	it('reads pasted coordinates or a maps link, by button or Enter', async () => {
		await renderWithMap({ coordinates: null });
		expect((button('paste') as HTMLButtonElement).disabled).toBe(true);

		type('paste', '31.9147° N, 131.4232° E');
		button('paste').click();
		flushSync();
		expect(position()).toEqual(['31.9147', '131.4232']);
		expect(field('paste').value).toBe('');

		type('paste', 'https://www.google.com/maps/@-33.86,151.2,17z');
		const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
		field('paste').dispatchEvent(enter);
		flushSync();
		expect(enter.defaultPrevented).toBe(true);
		expect(position()).toEqual(['-33.86', '151.2']);

		const other = new KeyboardEvent('keydown', { key: 'a', bubbles: true, cancelable: true });
		field('paste').dispatchEvent(other);
		expect(other.defaultPrevented).toBe(false);
	});

	it('explains text it cannot read, until the user types again', async () => {
		await renderWithMap();

		type('paste', 'https://maps.app.goo.gl/AbCdEf');
		button('paste').click();
		flushSync();

		const error = byId<HTMLElement>('location-coordinates-paste-error');
		expect(error.textContent?.trim()).toBe(m.location_coordinates_paste_invalid());
		expect(error.getAttribute('role')).toBe('alert');
		expect(field('paste').getAttribute('aria-describedby')).toBe(
			'location-coordinates-paste-error'
		);
		expect(position()).toEqual(['31.9147', '131.4232']);

		type('paste', 'https://maps.app.goo.gl/AbCdEf2');
		expect(byId('location-coordinates-paste-error')).toBeNull();

		// Enter on blank text is not an error.
		type('paste', '  ');
		field('paste').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		flushSync();
		expect(byId('location-coordinates-paste-error')).toBeNull();
	});

	it('centres on the devices that have a position', async () => {
		await renderWithMap({
			coordinates: null,
			devicePositions: [
				{ lat: 31.9, long: 131.4 },
				{ lat: 32.1, long: 131.6 },
				{ lat: null, long: 131 }
			]
		});

		button('centre').click();
		flushSync();

		expect(position()).toEqual(['32', '131.5']);
	});

	it('cannot centre without device positions, and says why', async () => {
		await renderWithMap({ devicePositions: [{ lat: 0, long: 0 }] });

		const centre = button('centre') as HTMLButtonElement;
		expect(centre.disabled).toBe(true);
		expect(centre.title).toBe(m.location_coordinates_centre_on_devices_none());
		centre.click();
		expect(position()).toEqual(['31.9147', '131.4232']);
	});
});

describe('LocationCoordinates geolocation', () => {
	function geolocation(run: (success: PositionCallback, failure: PositionErrorCallback) => void) {
		return vi
			.spyOn(navigator.geolocation, 'getCurrentPosition')
			.mockImplementation((success, failure) => run(success, failure!));
	}

	const failure = (code: number) =>
		({
			code,
			PERMISSION_DENIED: 1,
			POSITION_UNAVAILABLE: 2,
			TIMEOUT: 3
		}) as GeolocationPositionError;

	it("uses the browser's position, rounded, and says how accurate it is", async () => {
		let succeed!: PositionCallback;
		const lookup = geolocation((success) => (succeed = success));
		await renderWithMap({ coordinates: null });

		button('geolocate').click();
		flushSync();
		expect(button('geolocate').getAttribute('aria-busy')).toBe('true');
		expect(lookup).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), {
			enableHighAccuracy: true,
			timeout: 15_000,
			maximumAge: 0
		});

		succeed({
			coords: { latitude: 31.91472345, longitude: 131.42321678, accuracy: 12.4 }
		} as GeolocationPosition);
		flushSync();

		expect(position()).toEqual(['31.914723', '131.423217']);
		expect(button('geolocate').getAttribute('aria-busy')).toBeNull();
		expect(notice()?.classList.contains('app-notice--info')).toBe(true);
		expect(notice()?.textContent?.trim()).toBe(
			m.location_coordinates_geolocation_accuracy({ meters: 12 })
		);
	});

	it('warns when the position is refused or unavailable', async () => {
		let fail!: PositionErrorCallback;
		geolocation((_success, failure) => (fail = failure));
		await renderWithMap();

		button('geolocate').click();
		fail(failure(1));
		flushSync();
		expect(notice()?.classList.contains('app-notice--warning')).toBe(true);
		expect(notice()?.textContent?.trim()).toBe(m.location_coordinates_geolocation_denied());
		expect(button('geolocate').getAttribute('aria-busy')).toBeNull();

		button('geolocate').click();
		fail(failure(3));
		flushSync();
		expect(notice()?.textContent?.trim()).toBe(m.location_coordinates_geolocation_failed());
		expect(position()).toEqual(['31.9147', '131.4232']);
	});

	it('warns when the browser has no geolocation', async () => {
		await renderWithMap();
		const descriptor = Object.getOwnPropertyDescriptor(Navigator.prototype, 'geolocation');
		delete (Navigator.prototype as { geolocation?: Geolocation }).geolocation;

		try {
			button('geolocate').click();
			flushSync();
		} finally {
			Object.defineProperty(Navigator.prototype, 'geolocation', descriptor!);
		}

		expect(notice()?.classList.contains('app-notice--warning')).toBe(true);
		expect(notice()?.textContent?.trim()).toBe(m.location_coordinates_geolocation_unsupported());
	});

	it('hides the notice once the user moves the pin themselves', async () => {
		geolocation((_success, fail) => fail(failure(2)));
		const { map } = await renderWithMap();
		const showNotice = () => {
			button('geolocate').click();
			flushSync();
			expect(notice()).not.toBeNull();
		};

		showNotice();
		map.fire('click', { lngLat: { lat: 31, lng: 131 } });
		flushSync();
		expect(notice()).toBeNull();

		showNotice();
		type('paste', '31, 131');
		button('paste').click();
		flushSync();
		expect(notice()).toBeNull();

		showNotice();
		button('clear').click();
		flushSync();
		expect(notice()).toBeNull();

		showNotice();
		button('reset').click();
		flushSync();
		expect(notice()).toBeNull();
	});
});

describe('LocationCoordinates saving', () => {
	it('does not submit until there is a valid change', async () => {
		await renderWithMap();
		expect(submit().cancel).toHaveBeenCalled();

		type('lat', '91');
		expect(submit().cancel).toHaveBeenCalled();
	});

	it('saves, toasts and reloads the page data', async () => {
		const { view } = await renderWithMap();
		type('lat', '31.95');
		const { cancel, callback } = submit();
		expect(cancel).not.toHaveBeenCalled();
		expect(button('save').getAttribute('aria-busy')).toBe('true');
		expect((button('reset') as HTMLButtonElement).disabled).toBe(true);

		const result: ActionResult = {
			type: 'success',
			status: 200,
			data: { action: 'updateLocationCoordinates', message: 'Coordinates saved' }
		};
		await callback?.({ result });
		flushSync();

		expect(forms.applyAction).toHaveBeenCalledWith(result);
		expect(view.toasts()).toMatchObject([{ tone: 'success', message: 'Coordinates saved' }]);
		expect(invalidateAll).toHaveBeenCalledTimes(1);
		expect(button('save').getAttribute('aria-busy')).toBeNull();
	});

	it('clears an old notice once saved', async () => {
		vi.spyOn(navigator.geolocation, 'getCurrentPosition').mockImplementation((_ok, failed) =>
			failed?.({ code: 2, PERMISSION_DENIED: 1 } as GeolocationPositionError)
		);
		await renderWithMap();
		type('lat', '31.95');
		button('geolocate').click();
		flushSync();
		expect(notice()).not.toBeNull();

		await submit().callback?.({ result: { type: 'success', status: 200, data: {} } });
		flushSync();

		expect(notice()).toBeNull();
	});

	it('toasts a refusal in red and keeps the fields', async () => {
		const { view } = await renderWithMap();
		type('lat', '31.95');

		await submit().callback?.({
			result: { type: 'failure', status: 400, data: { message: 'Invalid latitude' } }
		});
		flushSync();

		expect(view.toasts()).toMatchObject([{ tone: 'danger', message: 'Invalid latitude' }]);
		expect(invalidateAll).not.toHaveBeenCalled();
		expect(position()).toEqual(['31.95', '131.4232']);
	});

	it('stays quiet without a message, and can save again after an error', async () => {
		const { view } = await renderWithMap();
		type('lat', '31.95');

		await submit().callback?.({ result: { type: 'failure', status: 400, data: { message: '' } } });
		await submit().callback?.({ result: { type: 'redirect', status: 303, location: '/x' } });
		forms.applyAction.mockRejectedValueOnce(new Error('navigation failed'));
		await expect(
			submit().callback?.({ result: { type: 'error', error: new Error('boom') } })
		).rejects.toThrow('navigation failed');
		flushSync();

		expect(view.toasts()).toEqual([]);
		expect((button('save') as HTMLButtonElement).disabled).toBe(false);
	});
});
