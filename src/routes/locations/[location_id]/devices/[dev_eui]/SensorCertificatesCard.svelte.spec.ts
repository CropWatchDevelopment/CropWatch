import { asset } from '$app/paths';
import { afterEach, describe, expect, it } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import SensorCertificatesCard from './SensorCertificatesCard.svelte';

type Row = {
	key: 'sensor';
	label: string;
	serial: string;
	product: string;
	downloadDisabledReason: string | null;
};

const SHT43: Row = {
	key: 'sensor',
	label: 'SHT43',
	serial: 'SN-43',
	product: 'CW-AIR',
	downloadDisabledReason: null
};

let view: ReturnType<typeof renderWithServices> | null = null;

function render(
	sensorCertificates: Row[],
	{ devEui = 'DEV-1', locationId = '8' as string | null } = {}
) {
	view = renderWithServices(SensorCertificatesCard, {
		props: { devEui, locationId, sensorCertificates }
	});
	return view;
}

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T | null;
const chips = (form: string) =>
	[...(byId(form)?.closest('.certificate-item')?.querySelectorAll('.cw-chip') ?? [])].map((chip) =>
		chip.textContent?.trim()
	);

afterEach(() => {
	view?.unmount();
	view = null;
});

describe('SensorCertificatesCard', () => {
	it("offers this sensor's SHT43 certificate from Libellus, in a new tab", () => {
		render([SHT43]);

		expect(document.body.textContent).toContain(m.devices_sensor_certificates_title());
		expect(chips('device-certificates-sensor-form')).toEqual([
			'SHT43',
			m.devices_sensor_serial_chip({ serial: 'SN-43' }),
			'CW-AIR'
		]);
		expect(document.body.textContent).toContain(m.devices_sensor_certificate_note());
		const form = byId<HTMLFormElement>('device-certificates-sensor-form');
		expect(form?.getAttribute('action')).toBe(
			'/locations/8/devices/DEV-1/settings/libellus-certificates/sensor'
		);
		expect(form?.method).toBe('get');
		expect(form?.target).toBe('_blank');
		expect(byId<HTMLButtonElement>('device-certificates-sensor-download-button')?.disabled).toBe(
			false
		);
		expect(document.querySelector('.field-error')).toBeNull();
		expect(document.querySelectorAll('.cw-separator')).toHaveLength(1);
	});

	it('explains, and disables, a download that cannot work', () => {
		render([{ ...SHT43, downloadDisabledReason: 'No Libellus token' }]);

		expect(document.querySelector('.field-error')?.textContent).toBe('No Libellus token');
		expect(byId<HTMLButtonElement>('device-certificates-sensor-download-button')?.disabled).toBe(
			true
		);
	});

	it('disables the download, without failing to render, for a device without a location', () => {
		for (const props of [{ locationId: null }, { locationId: '' }, { devEui: '' }]) {
			render([SHT43], props);

			const form = byId<HTMLFormElement>('device-certificates-sensor-form');
			expect(form?.hasAttribute('action')).toBe(false);
			expect(byId<HTMLButtonElement>('device-certificates-sensor-download-button')?.disabled).toBe(
				true
			);
			expect(chips('device-certificates-sensor-form')).toEqual([
				'SHT43',
				m.devices_sensor_serial_chip({ serial: 'SN-43' }),
				'CW-AIR'
			]);
			expect(byId<HTMLButtonElement>('device-certificates-series-download-button')?.disabled).toBe(
				false
			);
			view?.unmount();
			view = null;
		}
	});

	it('leaves out the product chip when the model is unknown', () => {
		render([{ ...SHT43, product: '' }]);

		expect(chips('device-certificates-sensor-form')).toEqual([
			'SHT43',
			m.devices_sensor_serial_chip({ serial: 'SN-43' })
		]);
	});

	it('always offers the SHTxx series certificate, the only one without a sensor row', () => {
		render([]);

		expect(byId('device-certificates-sensor-form')).toBeNull();
		expect(document.querySelector('.cw-separator')).toBeNull();
		expect(chips('device-certificates-series-form')).toEqual([
			m.devices_sensor_series_certificate_label()
		]);
		expect(document.body.textContent).toContain(m.devices_sensor_series_certificate_note());
		const form = byId<HTMLFormElement>('device-certificates-series-form');
		expect(form?.getAttribute('action')).toBe(
			asset('/files/Sensirion_Humidity_Sensors_SHTxx_Calibration_Certification.pdf')
		);
		expect(form?.method).toBe('get');
		expect(form?.target).toBe('_blank');
		expect(byId<HTMLButtonElement>('device-certificates-series-download-button')?.disabled).toBe(
			false
		);
	});
});
