import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CwDeviceRefreshOptions, CwDeviceRefreshScheduler } from '@cropwatchdevelopment/cwui';
import type { DevicePrimaryDataDto } from '$lib/api/api.dtos';
import { createMockServices, type MockServices } from '$lib/testing/mock-services';
import { LocationLiveReadings } from './location-live-readings.svelte';

const SEEN = '2026-10-21T10:00:00.000Z';
const NEWER = '2026-10-21T10:10:00.000Z';

function device(overrides: Partial<DevicePrimaryDataDto>): DevicePrimaryDataDto {
	return { dev_eui: 'A1', created_at: '2026-01-01T00:00:00Z', ...overrides };
}

const DEVICES = [
	device({ dev_eui: 'A1', last_data_updated_at: SEEN, upload_interval: '15' }),
	device({ dev_eui: 'B2', last_data_updated_at: 1234, upload_interval: 'often' }),
	device({ dev_eui: undefined as never })
];

/** A stand-in for cwui's scheduler that records how it was built and used. */
function fakeScheduler() {
	const instance = {
		track: vi.fn(),
		trackAll: vi.fn(),
		reportData: vi.fn(),
		refreshNow: vi.fn(),
		untrack: vi.fn(),
		pause: vi.fn(),
		resume: vi.fn(),
		destroy: vi.fn(),
		states: new Map(),
		size: 0
	};
	let options: CwDeviceRefreshOptions | undefined;
	const createScheduler = vi.fn((given: CwDeviceRefreshOptions) => {
		options = given;
		return instance as CwDeviceRefreshScheduler;
	});
	const detach = vi.fn();
	const attachVisibility = vi.fn(() => detach);
	return {
		instance,
		createScheduler,
		attachVisibility,
		detach,
		options: () => {
			if (!options) throw new Error('the scheduler was not created');
			return options;
		}
	};
}

let services: MockServices;
let teardown: (() => void) | undefined;

function setup(signedIn = true) {
	services = createMockServices();
	const scheduler = fakeScheduler();
	const live = new LocationLiveReadings({
		dashboard: services.dashboard,
		isSignedIn: () => signedIn,
		createScheduler: scheduler.createScheduler,
		attachVisibility: scheduler.attachVisibility
	});
	return { live, scheduler, latest: services.dashboard.getDashboardDeviceLatest };
}

afterEach(() => {
	teardown?.();
	teardown = undefined;
});

describe('LocationLiveReadings.start', () => {
	it('does nothing without a session or without devices', () => {
		const signedOut = setup(false);
		expect(signedOut.live.start(DEVICES)).toBeUndefined();
		expect(signedOut.scheduler.createScheduler).not.toHaveBeenCalled();

		const empty = setup();
		expect(empty.live.start([])).toBeUndefined();
		expect(empty.scheduler.createScheduler).not.toHaveBeenCalled();
		expect(empty.latest).not.toHaveBeenCalled();
	});

	it('tracks every device by its last reading and upload interval, 10 min by default', () => {
		const { live, scheduler, latest } = setup();
		latest.mockResolvedValue(null);

		teardown = live.start(DEVICES);

		expect(scheduler.options().defaultIntervalMinutes).toBe(10);
		expect(scheduler.instance.trackAll).toHaveBeenCalledWith([
			{ id: 'A1', lastSeenAt: SEEN, uploadIntervalMinutes: 15 },
			{ id: 'B2', lastSeenAt: null, uploadIntervalMinutes: null },
			{ id: '', lastSeenAt: null, uploadIntervalMinutes: null }
		]);
		expect(scheduler.attachVisibility).toHaveBeenCalledWith(scheduler.instance);
	});

	it("loads each device's latest reading once and reports its time to the scheduler", async () => {
		const { live, scheduler, latest } = setup();
		latest.mockImplementation(async (devEui) => {
			if (devEui === 'A1') return { created_at: SEEN, last_update: NEWER, temperature_c: 21.5 };
			if (devEui === 'B2') return { temperature_c: 4 };
			throw new Error('not found');
		});

		teardown = live.start(DEVICES);

		await vi.waitFor(() => expect(live.latestByDevEui.B2).toEqual({ temperature_c: 4 }));
		expect(latest.mock.calls.map(([devEui]) => devEui)).toEqual(['A1', 'B2', '']);
		expect(live.latestByDevEui.A1).toEqual({
			created_at: SEEN,
			last_update: NEWER,
			temperature_c: 21.5
		});
		expect(live.lastSeenByDevEui).toEqual({ A1: NEWER });
		expect(scheduler.instance.reportData).toHaveBeenCalledTimes(1);
		expect(scheduler.instance.reportData).toHaveBeenCalledWith('A1', NEWER);
		expect(live.latestByDevEui['']).toBeUndefined();
	});

	it('ignores a device the API has no reading for', async () => {
		const { live, scheduler, latest } = setup();
		latest.mockResolvedValue(null);

		teardown = live.start([DEVICES[0]]);

		expect(latest).toHaveBeenCalledWith('A1');
		// Let the lookup settle (a macrotask runs after every pending promise).
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(live.latestByDevEui).toEqual({});
		expect(scheduler.instance.reportData).not.toHaveBeenCalled();
	});

	it('refetches through the scheduler: a reading, or null when there is none', async () => {
		const { live, scheduler, latest } = setup();
		latest.mockResolvedValue(null);
		teardown = live.start([DEVICES[0]]);
		const { fetcher } = scheduler.options();

		latest.mockResolvedValueOnce({ created_at: NEWER, humidity: 60 });
		await expect(fetcher('A1')).resolves.toEqual({
			lastSeenAt: NEWER,
			data: { created_at: NEWER, humidity: 60 }
		});
		await expect(fetcher('A1')).resolves.toBeNull();

		latest.mockRejectedValueOnce(new Error('down'));
		await expect(fetcher('A1')).rejects.toThrow('down');
	});

	it('keeps what the scheduler reports: newer data and each freshness change', () => {
		const { live, scheduler, latest } = setup();
		latest.mockResolvedValue(null);
		teardown = live.start([DEVICES[0]]);
		const { onData, onStateChange } = scheduler.options();

		onData?.('A1', { lastSeenAt: NEWER, data: { co2: 410 } });
		onData?.('B2', { lastSeenAt: Date.parse(NEWER), data: 'not an object' });
		onData?.('C3', { lastSeenAt: null });
		onStateChange?.('A1', 'checking');
		onStateChange?.('A1', 'stale');

		expect(live.lastSeenByDevEui).toEqual({ A1: NEWER });
		expect(live.latestByDevEui).toEqual({ A1: { co2: 410 } });
		expect(live.freshnessByDevEui).toEqual({ A1: 'stale' });
	});

	it('stops the scheduler and the visibility hook on teardown', async () => {
		const { live, scheduler, latest } = setup();
		latest.mockResolvedValue(null);

		live.start([DEVICES[0]])?.();

		expect(scheduler.detach).toHaveBeenCalledTimes(1);
		expect(scheduler.instance.destroy).toHaveBeenCalledTimes(1);
		await live.refreshAll([DEVICES[0]]);
		expect(latest).toHaveBeenCalledTimes(1);
	});
});

describe('LocationLiveReadings.refreshAll', () => {
	it("reloads every device's reading, flagging refreshing meanwhile", async () => {
		const { live, scheduler, latest } = setup();
		latest.mockResolvedValue(null);
		teardown = live.start([DEVICES[0]]);
		await vi.waitFor(() => expect(latest).toHaveBeenCalledTimes(1));

		let release!: (value: Record<string, unknown> | null) => void;
		latest.mockReturnValueOnce(
			new Promise<Record<string, unknown> | null>((resolve) => (release = resolve))
		);
		latest.mockResolvedValueOnce({ created_at: NEWER });
		const refresh = live.refreshAll([DEVICES[0], DEVICES[1]]);

		expect(live.refreshing).toBe(true);
		// A second refresh while one is running is ignored.
		await live.refreshAll([DEVICES[0]]);
		expect(latest).toHaveBeenCalledTimes(3);

		release({ created_at: SEEN });
		await refresh;
		expect(live.refreshing).toBe(false);
		expect(latest.mock.calls.slice(1).map(([devEui]) => devEui)).toEqual(['A1', 'B2']);
		expect(live.lastSeenByDevEui).toEqual({ A1: SEEN, B2: NEWER });
		expect(scheduler.instance.reportData).toHaveBeenCalledWith('B2', NEWER);
	});

	it('asks for a device without a DevEUI under an empty id, as start does', async () => {
		const { live, latest } = setup();
		latest.mockResolvedValue(null);
		teardown = live.start([DEVICES[2]]);
		latest.mockClear();

		await live.refreshAll([DEVICES[2]]);

		expect(latest.mock.calls).toEqual([['']]);
	});

	it('does nothing before the scheduler starts, or once signed out', async () => {
		const { live, latest } = setup();
		await live.refreshAll(DEVICES);
		expect(latest).not.toHaveBeenCalled();

		let signedIn = true;
		const scheduler = fakeScheduler();
		const live2 = new LocationLiveReadings({
			dashboard: services.dashboard,
			isSignedIn: () => signedIn,
			createScheduler: scheduler.createScheduler,
			attachVisibility: scheduler.attachVisibility
		});
		latest.mockResolvedValue(null);
		teardown = live2.start([DEVICES[0]]);
		signedIn = false;

		await live2.refreshAll([DEVICES[0]]);
		expect(latest).toHaveBeenCalledTimes(1);
		expect(live2.refreshing).toBe(false);
	});
});

describe('LocationLiveReadings with the cwui scheduler', () => {
	it("reports each device's freshness as the scheduler tracks it", async () => {
		services = createMockServices();
		services.dashboard.getDashboardDeviceLatest.mockResolvedValue(null);
		const live = new LocationLiveReadings({
			dashboard: services.dashboard,
			isSignedIn: () => true
		});

		teardown = live.start([
			device({ dev_eui: 'A1', last_data_updated_at: new Date().toISOString() }),
			device({ dev_eui: 'B2' })
		]);

		expect(live.freshnessByDevEui).toEqual({ A1: 'fresh', B2: 'stale' });
		await vi.waitFor(() =>
			expect(services.dashboard.getDashboardDeviceLatest).toHaveBeenCalledWith('B2')
		);
	});
});
