import { flushSync, mount, unmount, type ComponentProps } from 'svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { pageState, gotoMock, invalidateAllMock } = vi.hoisted(() => ({
	pageState: {
		url: new URL('https://example.com/?group=air')
	},
	gotoMock: vi.fn(async () => {}),
	invalidateAllMock: vi.fn(async () => {})
}));

vi.mock('$app/state', () => ({
	page: pageState
}));

vi.mock('$app/navigation', () => ({
	goto: gotoMock,
	invalidateAll: invalidateAllMock
}));

vi.mock('$lib/components/dashboard/DashboardTable.svelte', async () => ({
	default: (await import('./MockDashboardTable.svelte')).default
}));

import DashboardPage from './+page.svelte';

type DashboardPageProps = ComponentProps<typeof DashboardPage>;
type DashboardPageData = DashboardPageProps['data'];

function createDeferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (reason?: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});

	return { promise, resolve, reject };
}

afterEach(() => {
	document.body.innerHTML = '';
	pageState.url = new URL('https://example.com/?group=air');
	gotoMock.mockClear();
	invalidateAllMock.mockClear();
});

describe('dashboard page', () => {
	it('shows section spinners while streamed data is pending and removes the old toggle UI', async () => {
		const summary = createDeferred<{
			totalDevices: number;
			onlineDevices: number;
			offlineDevices: number;
			activeAlertCount: number;
			error: string | null;
		}>();
		const filterOptions = createDeferred<{
			deviceGroups: string[];
			locationGroups: string[];
			locations: Array<{ location_id: number; name: string }>;
			error: string | null;
		}>();

		const component = mount(DashboardPage, {
			target: document.body,
			props: {
				params: {},
				data: {
					authToken: 'jwt-token',
					session: null,
					profile: undefined,
					summary: summary.promise,
					filterOptions: filterOptions.promise,
					initialTable: Promise.resolve({
						query: { page: 1, pageSize: 25, filters: { group: ['air'] } },
						rows: [],
						total: 0,
						error: null
					})
				} satisfies DashboardPageData,
				form: undefined
			}
		});

		flushSync();

		expect(document.body.textContent).toContain('Loading dashboard summary...');
		expect(document.body.textContent).toContain('Loading dashboard filters...');
		expect(document.body.textContent).not.toContain('Table View');
		expect(document.body.textContent).not.toContain('Sensor Cards');
		expect(document.body.textContent).not.toContain('Grid Layout');
		expect(document.body.textContent).not.toContain('Masonry');

		summary.resolve({
			totalDevices: 4,
			onlineDevices: 3,
			offlineDevices: 1,
			activeAlertCount: 2,
			error: null
		});
		filterOptions.resolve({
			deviceGroups: ['air'],
			locationGroups: ['North'],
			locations: [{ location_id: 1, name: 'Room 1' }],
			error: null
		});
		await Promise.resolve();
		await Promise.resolve();
		flushSync();

		expect(document.body.textContent).toContain('Device group');
		expect(document.body.textContent).toContain('Location group');
		expect(document.body.textContent).toContain('Location');

		await unmount(component);
	});

	it('renders page-local error states for summary and filters', async () => {
		const component = mount(DashboardPage, {
			target: document.body,
			props: {
				params: {},
				data: {
					authToken: 'jwt-token',
					session: null,
					profile: undefined,
					summary: Promise.resolve({
						totalDevices: 0,
						onlineDevices: 0,
						offlineDevices: 0,
						activeAlertCount: 0,
						error: 'Summary failed.'
					}),
					filterOptions: Promise.resolve({
						deviceGroups: [],
						locationGroups: [],
						locations: [],
						error: 'Filters failed.'
					}),
					initialTable: Promise.resolve({
						query: { page: 1, pageSize: 25, filters: {} },
						rows: [],
						total: 0,
						error: null
					})
				} satisfies DashboardPageData,
				form: undefined
			}
		});

		await Promise.resolve();
		await Promise.resolve();
		flushSync();

		expect(document.body.textContent).toContain('Summary is partially unavailable');
		expect(document.body.textContent).toContain('Summary failed.');
		expect(document.body.textContent).toContain('Some filter data could not be loaded');
		expect(document.body.textContent).toContain('Filters failed.');

		await unmount(component);
	});
});
