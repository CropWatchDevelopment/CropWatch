import { flushSync, mount, unmount } from 'svelte';
import { afterEach, describe, expect, it } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import SignalStrength from './SignalStrength.svelte';

function renderSignal(props: { rssi?: number | null; snr?: number | null }) {
	const component = mount(SignalStrength, { target: document.body, props });
	flushSync();
	return component;
}

const barsOn = () => document.querySelectorAll('.signal-strength__bar--on').length;
const noSignalSign = () => document.querySelector('.signal-strength__none');

afterEach(() => {
	document.body.innerHTML = '';
});

describe('SignalStrength', () => {
	it('shows empty bars with a "no" sign when there is no reading', () => {
		const component = renderSignal({});

		expect(document.querySelectorAll('.signal-strength__bar')).toHaveLength(4);
		expect(barsOn()).toBe(0);
		expect(noSignalSign()).not.toBeNull();
		expect(document.querySelector('.signal-strength')?.getAttribute('aria-label')).toContain(
			m.signal_quality_none()
		);

		unmount(component);
	});

	it('drops the "no" sign as soon as there is a reading', () => {
		const component = renderSignal({ rssi: -90, snr: 6 });

		expect(barsOn()).toBe(4);
		expect(noSignalSign()).toBeNull();

		unmount(component);
	});

	it('keeps a weak but received link at one bar, without the sign', () => {
		const component = renderSignal({ rssi: -125, snr: -15 });

		expect(barsOn()).toBe(1);
		expect(noSignalSign()).toBeNull();

		unmount(component);
	});
});
