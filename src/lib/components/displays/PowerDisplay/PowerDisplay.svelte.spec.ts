import { formatCwNumber } from '@cropwatchdevelopment/cwui';
import { afterEach, describe, expect, it } from 'vitest';
import type { DeviceDisplayProps } from '$lib/interfaces/deviceDisplay';
import { m } from '$lib/paraglide/messages.js';
import { renderWithServices } from '$lib/testing/render';
import PowerDisplay from './PowerDisplay.svelte';

function displayProps(overrides: Partial<DeviceDisplayProps> = {}): DeviceDisplayProps {
	return {
		devEui: 'PWR-001',
		locationId: '8',
		locationName: 'Pump house',
		latestData: null,
		historicalData: [],
		loading: false,
		permissionLevel: 1,
		...overrides
	};
}

const HISTORY = [
	{
		id: 2,
		dev_eui: 'PWR-001',
		created_at: '2026-10-21T03:00:00.000Z',
		battery_level: 80,
		voltage: null,
		current: 1.25,
		state: 'running'
	},
	{
		id: 1,
		dev_eui: 'PWR-001',
		created_at: '2026-10-21T02:00:00.000Z',
		battery_level: 81,
		voltage: 229.5,
		current: 1.5,
		state: 'idle'
	}
];

let view: ReturnType<typeof renderWithServices> | null = null;

function render(overrides: Partial<DeviceDisplayProps> = {}) {
	view = renderWithServices(PowerDisplay, {
		props: displayProps(overrides),
		app: { accessToken: 'jwt-token' }
	});
	return view.target;
}

const kpiCards = (target: HTMLElement) =>
	[...target.querySelectorAll('.kpi-grid > *')].map((card) => card.textContent ?? '');

afterEach(() => {
	view?.unmount();
	view = null;
});

describe('PowerDisplay', () => {
	it('shows a latest-reading card for every numeric column', () => {
		const target = render({
			historicalData: HISTORY,
			latestData: { ...HISTORY[0], voltage: 230.456 }
		});

		const cards = kpiCards(target);
		// `voltage` is numeric (its first non-empty value is), `state` is not.
		expect(cards).toHaveLength(2);
		expect(cards[0]).toContain('voltage');
		expect(cards[0]).toContain(m.display_latest_reading());
		expect(cards[0]).toContain(formatCwNumber(230.456, { decimals: 2 }));
		expect(cards[1]).toContain('current');
		expect(cards[1]).toContain(formatCwNumber(1.25, { decimals: 2 }));
	});

	it('lists the readings without metadata or battery columns', () => {
		const target = render({ historicalData: HISTORY, latestData: HISTORY[0] });

		expect(target.textContent).toContain(m.display_power_data());
		expect(target.textContent).toContain('PWR-001');
		expect(target.textContent).toContain(m.display_power());
		expect([...target.querySelectorAll('th')].map((th) => th.textContent)).toEqual([
			'created_at',
			'voltage',
			'current',
			'state'
		]);
		expect(
			[...target.querySelectorAll('tbody tr')].map((tr) =>
				[...tr.querySelectorAll('td')].map((td) => td.textContent)
			)
		).toEqual([
			['2026-10-21T03:00:00.000Z', '—', '1.25', 'running'],
			['2026-10-21T02:00:00.000Z', '229.5', '1.5', 'idle']
		]);
	});

	it('shows no cards before the first reading, and at most 100 rows', () => {
		const target = render({
			historicalData: Array.from({ length: 101 }, (_, index) => ({ id: index, watts: index }))
		});

		expect(target.querySelector('.kpi-grid')).toBeNull();
		expect(target.querySelectorAll('tbody tr')).toHaveLength(100);
	});

	it('says when the selected range has no data', () => {
		const target = render({ latestData: { id: 1, watts: 5 } });

		expect(target.textContent).toContain(m.display_no_data());
		expect(target.textContent).toContain(m.display_no_power_data_selected_range());
		// Without history there is no column to make a card for.
		expect(kpiCards(target)).toEqual([]);
	});

	it('says when the data is loading', () => {
		const target = render({ loading: true, historicalData: HISTORY });

		expect(target.textContent).toContain(m.status_loading());
		expect(target.textContent).toContain(m.display_loading_power_data());
		expect(target.querySelector('table')).toBeNull();
	});
});
