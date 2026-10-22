import { afterEach, describe, expect, it } from 'vitest';
import type { DeviceDisplayProps } from '$lib/interfaces/deviceDisplay';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import DefaultDisplay from './DefaultDisplay.svelte';

function displayProps(overrides: Partial<DeviceDisplayProps> = {}): DeviceDisplayProps {
	return {
		devEui: 'GEN-001',
		locationId: '8',
		locationName: 'North field',
		latestData: null,
		historicalData: [],
		loading: false,
		permissionLevel: 1,
		...overrides
	};
}

let view: ReturnType<typeof renderWithServices> | null = null;

function render(overrides: Partial<DeviceDisplayProps> = {}) {
	view = renderWithServices(DefaultDisplay, {
		props: displayProps(overrides),
		app: { accessToken: 'jwt-token' }
	});
	return view.target;
}

afterEach(() => {
	view?.unmount();
	view = null;
});

describe('DefaultDisplay', () => {
	it("lists an unknown table's readings, without metadata or battery columns", () => {
		const target = render({
			historicalData: [
				{
					id: 1,
					dev_eui: 'GEN-001',
					created_at: '2026-10-21T03:00:00.000Z',
					is_simulated: false,
					battery: 90,
					battery_level: 4,
					flow_rate: 1.5,
					note: null
				},
				{ id: 2, created_at: '2026-10-21T02:00:00.000Z', flow_rate: 0, note: 'valve open' }
			]
		});

		expect(target.textContent).toContain(m.display_device_data());
		expect(target.textContent).toContain('GEN-001');
		expect(target.textContent).toContain(m.display_generic_view());
		expect([...target.querySelectorAll('th')].map((th) => th.textContent)).toEqual([
			'created_at',
			'flow_rate',
			'note'
		]);
		expect(
			[...target.querySelectorAll('tbody tr')].map((tr) =>
				[...tr.querySelectorAll('td')].map((td) => td.textContent)
			)
		).toEqual([
			['2026-10-21T03:00:00.000Z', '1.5', '—'],
			['2026-10-21T02:00:00.000Z', '0', 'valve open']
		]);
	});

	it('shows at most 100 rows', () => {
		const target = render({
			historicalData: Array.from({ length: 120 }, (_, index) => ({ id: index, reading: index }))
		});

		expect(target.querySelectorAll('tbody tr')).toHaveLength(100);
	});

	it('says when the selected range has no data', () => {
		const target = render();

		expect(target.textContent).toContain(m.display_no_data_selected_range());
		expect(target.querySelector('table')).toBeNull();
	});

	it('says when the data is loading', () => {
		const target = render({ loading: true, historicalData: [{ id: 1, reading: 2 }] });

		expect(target.textContent).toContain(m.display_loading_data());
		expect(target.querySelector('table')).toBeNull();
	});
});
