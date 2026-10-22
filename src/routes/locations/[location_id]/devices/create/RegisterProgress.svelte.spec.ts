import { flushSync } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DeviceSetupResult, DeviceSetupStep } from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';
import { createMockServices } from '$lib/testing/mock-services';
import { renderWithServices } from '$lib/testing/render';
import RegisterProgress from './RegisterProgress.svelte';
import { DeviceSetupFlow } from './device-setup-flow.svelte';
import { regionLabel } from './setup-messages';

let view: ReturnType<typeof renderWithServices> | null = null;
const onopen = vi.fn();
const onaddanother = vi.fn();

function newFlow() {
	const flow = new DeviceSetupFlow({
		devices: createMockServices().devices,
		locationId: 8,
		licenses: [{ id: 14, seatIndex: 2 }]
	});
	flow.name = '  FL1 Smoke Detector ';
	flow.step = 'registering';
	return flow;
}

function render(flow: DeviceSetupFlow, addingAnother?: boolean) {
	view = renderWithServices(RegisterProgress, {
		props: { flow, locationName: 'Barn', onopen, onaddanother, addingAnother }
	});
	return view;
}

function finish(flow: DeviceSetupFlow, steps: DeviceSetupStep[], name = 'FL1 Smoke Detector') {
	const result: DeviceSetupResult = { dev_eui: '00137A10000441DF', location_id: 8, name, steps };
	flow.result = result;
	flow.step = 'done';
	flushSync();
}

const heading = () => document.querySelector('[data-step-heading]');
const tasks = () =>
	[...document.querySelectorAll('ol.tasks li')].map((item) => ({
		label: item.textContent?.trim(),
		state: item.querySelector('.cw-spinner')
			? 'active'
			: item.querySelector(`[aria-label="${m.device_setup_task_done()}"]`)
				? 'done'
				: item.querySelector(`[aria-label="${m.device_setup_task_waiting()}"]`)
					? 'pending'
					: 'unknown',
		muted: item.classList.contains('pending')
	}));
const byId = (id: string) => document.getElementById(id) as HTMLButtonElement | null;

afterEach(() => {
	view?.unmount();
	view = null;
	onopen.mockReset();
	onaddanother.mockReset();
});

describe('RegisterProgress', () => {
	it('shows what is known while the setup runs', () => {
		render(newFlow());

		expect(heading()?.textContent?.trim()).toBe(
			m.device_setup_registering_title({ name: 'FL1 Smoke Detector' })
		);
		expect(heading()?.getAttribute('tabindex')).toBe('-1');
		expect(document.body.textContent).toContain(m.device_setup_registering_body());
		expect(tasks()).toEqual([
			{ label: m.device_setup_task_availability(), state: 'done', muted: false },
			{ label: m.device_setup_task_network_pending(), state: 'active', muted: false },
			{ label: m.device_setup_task_saved({ location: 'Barn' }), state: 'pending', muted: true },
			{ label: m.device_setup_task_license(), state: 'pending', muted: true }
		]);
		expect(document.querySelector('ol.tasks')?.getAttribute('aria-live')).toBe('polite');
		expect(byId('device-setup-add-another')).toBeNull();
		expect(byId('device-setup-open-device')).toBeNull();
	});

	it('reports what the API did once it is done, and offers the next steps', () => {
		const flow = newFlow();
		render(flow);
		finish(flow, [
			{ key: 'availability', outcome: 'done' },
			{ key: 'network', outcome: 'created', application_id: 'cw-app', region: 'eu1' },
			{ key: 'saved', outcome: 'done' },
			{ key: 'license', outcome: 'done' }
		]);

		expect(heading()?.textContent?.trim()).toBe(
			m.device_setup_done_title({ name: 'FL1 Smoke Detector' })
		);
		expect(document.body.textContent).toContain(m.device_setup_done_body());
		expect(tasks()).toEqual([
			{ label: m.device_setup_task_availability(), state: 'done', muted: false },
			{
				label: m.device_setup_task_network_created({ region: regionLabel('eu1') }),
				state: 'done',
				muted: false
			},
			{ label: m.device_setup_task_saved({ location: 'Barn' }), state: 'done', muted: false },
			{ label: m.device_setup_task_license(), state: 'done', muted: false }
		]);

		byId('device-setup-add-another')?.click();
		byId('device-setup-open-device')?.click();
		expect(onaddanother).toHaveBeenCalledTimes(1);
		expect(onopen).toHaveBeenCalledTimes(1);
		expect(byId('device-setup-add-another')?.textContent?.trim()).toBe(
			m.device_setup_add_another()
		);
		expect(byId('device-setup-open-device')?.textContent?.trim()).toBe(
			m.device_setup_open_new_device()
		);
	});

	it('words adopted and existing network entries, an existing device and licence', () => {
		const flow = newFlow();
		render(flow);
		finish(
			flow,
			[
				{ key: 'network', outcome: 'adopted', application_id: 'cw-app', region: 'as1' },
				{ key: 'saved', outcome: 'existing' },
				{ key: 'license', outcome: 'existing' }
			],
			'Renamed by the API'
		);

		expect(heading()?.textContent?.trim()).toBe(
			m.device_setup_done_title({ name: 'Renamed by the API' })
		);
		expect(tasks().map((task) => task.label)).toEqual([
			m.device_setup_task_network_adopted(),
			m.device_setup_task_saved_existing({ location: 'Barn' }),
			m.device_setup_task_license_existing()
		]);

		finish(flow, [
			{ key: 'network', outcome: 'existing', application_id: 'cw-app', region: 'as1' },
			{ key: 'license', outcome: 'skipped' }
		]);
		expect(tasks().map((task) => task.label)).toEqual([
			m.device_setup_task_network_existing(),
			m.device_setup_task_license_skipped()
		]);
	});

	it('shows the add-another button busy while the licenses reload', () => {
		const flow = newFlow();
		finish(flow, []);
		render(flow, true);

		expect(tasks()).toEqual([]);
		expect(byId('device-setup-add-another')?.getAttribute('aria-busy')).toBe('true');
		expect(byId('device-setup-add-another')?.disabled).toBe(true);
	});
});
