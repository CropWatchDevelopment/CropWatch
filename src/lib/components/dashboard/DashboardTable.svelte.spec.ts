import { flushSync, mount, unmount, type ComponentProps } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { apiMock, gotoMock, refreshAllMock } = vi.hoisted(() => ({
	apiMock: vi.fn(async () => ({
		data: [
			{
				dev_eui: 'api-dev-1',
				name: 'API Device',
				location_id: 1,
				location_name: 'API Room',
				group: 'air',
				created_at: '2026-04-14T12:00:00.000Z',
				temperature_c: 21.4,
				humidity: 54.2,
				co2: 800
			}
		],
		total: 1
	})),
	gotoMock: vi.fn(async () => {}),
	refreshAllMock: vi.fn(async () => {})
}));

vi.mock('$app/navigation', () => ({
	goto: gotoMock
}));

vi.mock('$app/paths', () => ({
	resolve: (path: string, params?: Record<string, string>) => {
		if (!params) {
			return path;
		}

		return `/locations/${params.location_id}/devices/${params.dev_eui}`;
	}
}));

vi.mock('$lib/api/api.service', () => ({
	ApiService: class {
		getLatestPrimaryDeviceData = apiMock;
	}
}));

vi.mock('@cropwatchdevelopment/cwui', async () => {
	const actual = await vi.importActual<typeof import('@cropwatchdevelopment/cwui')>(
		'@cropwatchdevelopment/cwui'
	);
	const MockCwDataTable = (await import('$lib/components/dashboard/MockCwDataTable.svelte'))
		.default;

	return {
		...actual,
		CwDataTable: MockCwDataTable
	};
});

import DashboardTable from './DashboardTable.svelte';

type DashboardTableProps = ComponentProps<typeof DashboardTable>;
type DashboardFilters = DashboardTableProps['filters'];
type InitialTableState = Awaited<Exclude<DashboardTableProps['initialTable'], undefined>>;

function createInitialTable(
	overrides: Partial<InitialTableState> = {}
): Promise<InitialTableState> {
	return Promise.resolve({
		query: {
			page: 1,
			pageSize: 25,
			filters: { group: ['air'] }
		},
		rows: [
			{
				dev_eui: 'initial-dev-1',
				name: 'Initial Device',
				location_id: 4,
				location_name: 'Initial Room',
				group: 'air',
				created_at: '2026-04-14T11:00:00.000Z',
				temperature_c: 20.1,
				humidity: 50.1,
				co2: 720
			}
		],
		total: 1,
		error: null,
		...overrides
	});
}

async function settle() {
	await Promise.resolve();
	await Promise.resolve();
	flushSync();
}

function renderDashboardTable(
	options: {
		filters?: DashboardFilters;
		initialTable?: DashboardTableProps['initialTable'];
	} = {}
) {
	return mount(DashboardTable, {
		target: document.body,
		props: {
			authToken: 'jwt-token',
			filters: options.filters ?? { group: 'air', locationGroup: '', location: '' },
			initialTable: options.initialTable ?? createInitialTable(),
			onRefreshAll: refreshAllMock
		}
	});
}

afterEach(() => {
	document.body.innerHTML = '';
	apiMock.mockClear();
	gotoMock.mockClear();
	refreshAllMock.mockClear();
});

describe('DashboardTable', () => {
	it('reuses the streamed first batch once before falling back to the API', async () => {
		const component = renderDashboardTable();

		await settle();

		expect(document.querySelector('[data-testid="first-row-dev-eui"]')?.textContent).toBe(
			'initial-dev-1'
		);
		expect(apiMock).not.toHaveBeenCalled();

		(document.querySelector('[data-testid="run-same-query"]') as HTMLButtonElement).click();
		await settle();

		expect(apiMock).toHaveBeenCalledTimes(1);
		expect(document.querySelector('[data-testid="first-row-dev-eui"]')?.textContent).toBe(
			'api-dev-1'
		);

		await unmount(component);
	});

	it('uses the API for later pages', async () => {
		const component = renderDashboardTable();

		await settle();

		(document.querySelector('[data-testid="run-page-two"]') as HTMLButtonElement).click();
		await settle();

		expect(apiMock).toHaveBeenCalledWith(
			{
				skip: 25,
				take: 25,
				group: 'air',
				locationGroup: undefined,
				location: undefined,
				name: undefined
			},
			expect.objectContaining({
				signal: expect.any(AbortSignal)
			})
		);

		await unmount(component);
	});

	it('resets cleanly when remounted with a new filter key', async () => {
		const first = renderDashboardTable();
		await settle();
		await unmount(first);

		const second = renderDashboardTable({
			filters: { group: 'soil', locationGroup: '', location: '' },
			initialTable: Promise.resolve({
				query: {
					page: 1,
					pageSize: 25,
					filters: { group: ['soil'] }
				},
				rows: [
					{
						dev_eui: 'soil-dev-1',
						name: 'Soil Device',
						location_id: 9,
						location_name: 'Bed 1',
						group: 'soil',
						created_at: '2026-04-14T09:00:00.000Z',
						temperature_c: 18.4,
						humidity: 41.2,
						co2: 0,
						moisture: 33.1
					}
				],
				total: 1,
				error: null
			})
		});

		await settle();

		expect(document.querySelector('[data-testid="first-row-dev-eui"]')?.textContent).toBe(
			'soil-dev-1'
		);
		expect(apiMock).not.toHaveBeenCalled();

		await unmount(second);
	});

	it('navigates to the device detail page from the row action', async () => {
		const component = renderDashboardTable();

		await settle();

		const viewButton = [...document.querySelectorAll('button')].find((button) =>
			button.textContent?.includes('View')
		);

		expect(viewButton).not.toBeUndefined();

		viewButton!.click();
		flushSync();

		expect(gotoMock).toHaveBeenCalledWith('/locations/4/devices/initial-dev-1');

		await unmount(component);
	});
});
