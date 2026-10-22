import { createRawSnippet } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { renderWithServices } from '$lib/testing/render';
import DeviceLayout from './+layout.svelte';

let view: ReturnType<typeof renderWithServices> | null = null;

afterEach(() => {
	view?.unmount();
	view = null;
});

describe('device route layout', () => {
	it('renders the device page inside its scroll container', () => {
		const children = createRawSnippet(() => ({
			render: () => '<p class="device-child">Device page</p>'
		}));

		view = renderWithServices(DeviceLayout, {
			props: { children, data: {}, params: { location_id: '8', dev_eui: 'DEV-1' } } as never
		});

		const child = view.target.querySelector('.device-route-layout > .device-child');
		expect(child?.textContent).toBe('Device page');
	});
});
