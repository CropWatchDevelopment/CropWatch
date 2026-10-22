import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DeviceDto, RelayHistoryEntryDto } from '$lib/api/api.dtos';
import { ApiError } from '$lib/api/api-error';
import { PermissionLevel } from '$lib/constants/permissions';
import {
	RELAY_CHECK_INTERVAL_MS,
	RELAY_CONFIRMATION_WINDOW_MS,
	RELAY_FIRST_CHECK_MS,
	RELAY_STATUS_REQUEST_AFTER_MS
} from '$lib/devices/relay-control';
import { m } from '$lib/paraglide/messages.js';
import { createMockServices, type MockServices } from '$lib/testing/mock-services';
import { DeviceDashboard, type DeviceDashboardData } from './device-dashboard.svelte';
import {
	MAX_RANGE_RECORDS,
	RELAY_HISTORY_REFRESH_DELAY_MS,
	getRelayTargetStateLabel,
	getVerifiedRelayStateLabel
} from './device-detail';

const NOW = Date.parse('2026-10-21T12:00:00.000Z');
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const at = (offsetMs: number) => new Date(NOW + offsetMs).toISOString();

function device(overrides: Partial<DeviceDto> = {}): DeviceDto {
	return {
		dev_eui: 'DEV-1',
		name: 'Soil probe',
		upload_interval: 10,
		cw_device_type: { id: 1, name: 'Soil', model: 'CW-SS', default_upload_interval: 30 },
		...overrides
	} as DeviceDto;
}

function sensorData(overrides: Partial<DeviceDashboardData> = {}): DeviceDashboardData {
	return {
		authToken: 'jwt-token',
		dataTable: 'cw_soil_data',
		devEui: 'DEV-1',
		device: device(),
		deviceData: [],
		latestData: null,
		locationId: '8',
		permissionLevel: PermissionLevel.ADMIN,
		...overrides
	};
}

function relayData(overrides: Partial<DeviceDashboardData> = {}): DeviceDashboardData {
	return sensorData({
		dataTable: 'cw_relay_data',
		devEui: 'RELAY-1',
		device: device({ dev_eui: 'RELAY-1', name: 'Pump relay' }),
		...overrides
	});
}

const relayRow = (overrides: Record<string, unknown> = {}) => ({
	id: 'relay-row-1',
	created_at: at(-5 * MINUTE),
	relay_1: false,
	relay_2: false,
	...overrides
});

const historyEntry = (id: string): RelayHistoryEntryDto => ({
	id,
	kind: 'state_change',
	at: at(-MINUTE),
	relay_1: true,
	relay_2: false,
	changed_relays: [1]
});

const apiError = (status: number, payload: unknown = null) =>
	new ApiError(status, 'Error', { url: 'https://api.cropwatch.test/x', payload });

/** A promise the test settles by hand. */
function deferred<T>() {
	let resolve!: (value: T) => void;
	let reject!: (error: unknown) => void;
	const promise = new Promise<T>((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

const dashboards: DeviceDashboard[] = [];
const cleanups: Array<() => void> = [];

function setup(initial: DeviceDashboardData) {
	let data = $state.raw(initial);
	const services: MockServices = createMockServices();
	const toast = { add: vi.fn() };
	const dashboard = new DeviceDashboard({
		data: () => data,
		telemetry: services.telemetry,
		relays: services.relays,
		toast
	});
	dashboards.push(dashboard);

	return {
		dashboard,
		services,
		toast,
		navigate(next: DeviceDashboardData) {
			data = next;
		}
	};
}

/** The `{ start, end }` a history request was sent with, as epoch ms. */
function requestedBounds(query: unknown) {
	const { start, end } = query as { start: string; end: string };
	return { start: Date.parse(start), end: Date.parse(end) };
}

/**
 * "Today": local midnight until now. The range bounds come from `SvelteDate`,
 * which extends the native `Date`, so they follow the real clock even while
 * a test fakes `Date`.
 */
function expectTodayBounds(query: unknown) {
	const { start, end } = requestedBounds(query);
	const midnight = new Date(end);
	midnight.setHours(0, 0, 0, 0);
	expect(start).toBe(midnight.getTime());
	expect(Math.abs(end - vi.getRealSystemTime())).toBeLessThan(MINUTE);
}

beforeEach(() => {
	vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
	for (const cleanup of cleanups.splice(0)) cleanup();
	for (const dashboard of dashboards.splice(0)) dashboard.destroyRelayStateManager();
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe('DeviceDashboard page data', () => {
	it('reads the device, its location and the session from the page data', () => {
		const { dashboard } = setup(sensorData({ permissionLevel: PermissionLevel.USER }));

		expect(dashboard.devEui).toBe('DEV-1');
		expect(dashboard.locationId).toBe('8');
		expect(dashboard.authToken).toBe('jwt-token');
		expect(dashboard.routeKey).toBe('8:DEV-1');
		expect(dashboard.permissionLevel).toBe(PermissionLevel.USER);
		expect(dashboard.isRelayDevice).toBe(false);
		expect(dashboard.activeRange).toBeNull();
		expect(dashboard.fetching).toBe(false);
		expect(dashboard.fetchError).toBeNull();
		expect(dashboard.relayHistory).toBeNull();
	});

	it('falls back to empty values and no permission when the page data is missing', () => {
		const { dashboard } = setup(
			sensorData({
				authToken: undefined,
				devEui: undefined,
				locationId: undefined,
				permissionLevel: 0
			} as never)
		);

		expect(dashboard.devEui).toBe('');
		expect(dashboard.locationId).toBe('');
		expect(dashboard.authToken).toBeNull();
		expect(dashboard.routeKey).toBe(':');
		expect(dashboard.permissionLevel).toBe(PermissionLevel.DISABLED);
	});

	it("shows the server's rows and latest reading until anything else loads", () => {
		const rows = [
			{ id: 2, created_at: at(-10 * MINUTE), moisture: 31 },
			{ id: 1, created_at: at(-20 * MINUTE), moisture: 30 }
		];
		const { dashboard } = setup(
			sensorData({ deviceData: { data: [...rows, 'not a row'], total: 2 } as never })
		);

		expect(dashboard.displayHistoricalData).toEqual(rows);
		// Without a latest reading, "last updated" is the newest history row.
		expect(dashboard.displayLatestData).toBeNull();
		expect(dashboard.lastUpdatedAt).toBe(at(-10 * MINUTE));

		const withLatest = setup(
			sensorData({ deviceData: rows, latestData: { id: 3, created_at: at(-MINUTE) } })
		);
		expect(withLatest.dashboard.displayLatestData).toEqual({ id: 3, created_at: at(-MINUTE) });
		expect(withLatest.dashboard.lastUpdatedAt).toBe(at(-MINUTE));
	});

	it('ignores a latest reading that is not a row, and has no "last updated" without data', () => {
		const { dashboard } = setup(sensorData({ latestData: [] as never }));

		expect(dashboard.displayLatestData).toBeNull();
		expect(dashboard.lastUpdatedAt).toBeNull();
	});
});

describe('DeviceDashboard history ranges', () => {
	it("loads today's readings once per device after navigation", async () => {
		const { dashboard, services } = setup(sensorData());
		const range = deferred<Record<string, unknown>[]>();
		services.telemetry.getDeviceDataWithinRange.mockReturnValue(range.promise);

		dashboard.handleNavigation();

		expect(services.telemetry.getDeviceDataWithinRange).toHaveBeenCalledTimes(1);
		const [devEui, query, options] = services.telemetry.getDeviceDataWithinRange.mock.calls[0];
		expect(devEui).toBe('DEV-1');
		expect(query).toMatchObject({ take: MAX_RANGE_RECORDS });
		expectTodayBounds(query);
		expect(options).toEqual({ suppressNotFoundError: true });
		expect(dashboard.fetching).toBe(true);

		const rows = [{ id: 1, created_at: at(-MINUTE), moisture: 30 }];
		range.resolve(rows);
		await vi.waitFor(() => expect(dashboard.fetching).toBe(false));

		expect(dashboard.activeRange).toBe('today');
		expect(dashboard.displayHistoricalData).toEqual(rows);

		dashboard.handleNavigation();
		expect(services.telemetry.getDeviceDataWithinRange).toHaveBeenCalledTimes(1);
	});

	it('loads the last N hours for a selected range', async () => {
		const { dashboard, services } = setup(sensorData());
		services.telemetry.getDeviceDataWithinRange.mockResolvedValue({
			data: [{ id: 1, created_at: at(-HOUR) }],
			total: 1
		});

		await dashboard.selectRange(48);

		const [, query] = services.telemetry.getDeviceDataWithinRange.mock.calls[0];
		const { start, end } = requestedBounds(query);
		expect(end - start).toBe(48 * HOUR);
		expect(dashboard.activeRange).toBe(48);
		expect(dashboard.displayHistoricalData).toEqual([{ id: 1, created_at: at(-HOUR) }]);
	});

	it('shows an empty range when the API answers 404 (no rows yet)', async () => {
		const { dashboard, services, toast } = setup(
			sensorData({ deviceData: [{ id: 1, created_at: at(-2 * HOUR) }] })
		);
		services.telemetry.getDeviceDataWithinRange.mockRejectedValue(apiError(404));

		await dashboard.selectRange('today');

		expect(dashboard.displayHistoricalData).toEqual([]);
		expect(dashboard.activeRange).toBe('today');
		expect(dashboard.fetchError).toBeNull();
		expect(toast.add).not.toHaveBeenCalled();
	});

	it('reports a failed load and keeps the previous range', async () => {
		const { dashboard, services, toast } = setup(sensorData());
		services.telemetry.getDeviceDataWithinRange.mockRejectedValue(apiError(500));

		await dashboard.selectRange(24);

		expect(dashboard.fetchError).toBe(m.devices_load_telemetry_failed());
		expect(dashboard.fetching).toBe(false);
		expect(dashboard.activeRange).toBeNull();
		expect(toast.add).toHaveBeenCalledWith({
			tone: 'danger',
			message: m.devices_load_telemetry_failed()
		});
		expect(console.error).toHaveBeenCalledWith(
			'Failed to fetch device data:',
			expect.any(ApiError)
		);
	});

	it('loads nothing without a session or a device', async () => {
		for (const data of [sensorData({ authToken: null }), sensorData({ devEui: '' })]) {
			const { dashboard, services } = setup(data);

			dashboard.handleNavigation();
			await dashboard.selectRange(24);
			await dashboard.refreshOnForeground();

			expect(dashboard.scheduleRefresh()).toBeUndefined();
			expect(services.telemetry.getDeviceDataWithinRange).not.toHaveBeenCalled();
			expect(services.telemetry.getDeviceLatestData).not.toHaveBeenCalled();
			expect(dashboard.activeRange).toBeNull();
		}
	});

	it("keeps each device's range when navigating between devices", async () => {
		const { dashboard, services, navigate } = setup(sensorData());
		services.telemetry.getDeviceDataWithinRange.mockImplementation(async (devEui) => [
			{ id: devEui, created_at: at(-MINUTE) }
		]);

		dashboard.handleNavigation();
		await vi.waitFor(() => expect(dashboard.activeRange).toBe('today'));
		await dashboard.selectRange(72);

		navigate(sensorData({ devEui: 'DEV-2' }));
		expect(dashboard.routeKey).toBe('8:DEV-2');
		expect(dashboard.activeRange).toBeNull();
		dashboard.handleNavigation();
		await vi.waitFor(() => expect(dashboard.activeRange).toBe('today'));
		expect(dashboard.displayHistoricalData).toEqual([{ id: 'DEV-2', created_at: at(-MINUTE) }]);

		navigate(sensorData());
		dashboard.handleNavigation();
		expect(dashboard.activeRange).toBe(72);
		expect(dashboard.displayHistoricalData).toEqual([{ id: 'DEV-1', created_at: at(-MINUTE) }]);
		expect(services.telemetry.getDeviceDataWithinRange).toHaveBeenCalledTimes(3);
	});
});

describe('DeviceDashboard refresh scheduler', () => {
	beforeEach(() => {
		vi.useFakeTimers({
			toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date']
		});
		vi.setSystemTime(NOW);
		// No jitter: the refetch fires exactly when the upload window passes.
		vi.spyOn(Math, 'random').mockReturnValue(0);
	});

	it("refetches the latest reading when the device's upload window passes", async () => {
		// Last seen 9 minutes ago, uploads every 10 minutes, 1 minute grace: due in 2 minutes.
		const { dashboard, services } = setup(
			sensorData({
				deviceData: [{ id: 'r1', created_at: at(-20 * MINUTE) }],
				latestData: { id: 'r0', created_at: at(-9 * MINUTE) }
			})
		);
		const fresh = { id: 'r1', created_at: at(MINUTE), moisture: 33 };
		services.telemetry.getDeviceLatestData.mockResolvedValue(fresh);
		const stop = dashboard.scheduleRefresh();
		cleanups.push(() => stop?.());

		await vi.advanceTimersByTimeAsync(2 * MINUTE - 1);
		expect(services.telemetry.getDeviceLatestData).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1);
		expect(services.telemetry.getDeviceLatestData).toHaveBeenCalledWith('DEV-1');
		await vi.waitFor(() => expect(dashboard.displayLatestData).toEqual(fresh));
		// The new reading replaces its older copy at the top of the history.
		expect(dashboard.displayHistoricalData).toEqual([fresh]);
		expect(dashboard.lastUpdatedAt).toBe(at(MINUTE));
	});

	it('uses the device type interval, or the default for an invalid interval', async () => {
		const typeInterval = setup(
			sensorData({
				device: device({ upload_interval: null }),
				latestData: { id: 'r0', created_at: at(0) }
			})
		);
		const invalid = setup(
			sensorData({
				device: device({ upload_interval: '-1' as never }),
				latestData: { id: 'r0', created_at: at(0) }
			})
		);
		for (const { dashboard, services } of [typeInterval, invalid]) {
			services.telemetry.getDeviceLatestData.mockResolvedValue({ id: 'r0', created_at: at(0) });
			const stop = dashboard.scheduleRefresh();
			cleanups.push(() => stop?.());
		}

		// 15 minutes (the scheduler's default) + 1 minute grace.
		await vi.advanceTimersByTimeAsync(16 * MINUTE);
		expect(invalid.services.telemetry.getDeviceLatestData).toHaveBeenCalledTimes(1);
		expect(typeInterval.services.telemetry.getDeviceLatestData).not.toHaveBeenCalled();

		// 30 minutes (the device type's interval) + 1 minute grace.
		await vi.advanceTimersByTimeAsync(15 * MINUTE);
		expect(typeInterval.services.telemetry.getDeviceLatestData).toHaveBeenCalledTimes(1);
	});

	it('stops refetching once cleaned up', async () => {
		const { dashboard, services } = setup(sensorData());
		services.telemetry.getDeviceLatestData.mockResolvedValue({ id: 'r1', created_at: at(0) });

		const stop = dashboard.scheduleRefresh();
		stop?.();
		await vi.advanceTimersByTimeAsync(HOUR);

		expect(services.telemetry.getDeviceLatestData).not.toHaveBeenCalled();
	});

	it('drops a refetch that fires after the session ended', async () => {
		// Never reported: due at once, but the session is gone when it fires.
		const { dashboard, services, navigate } = setup(sensorData());
		const stop = dashboard.scheduleRefresh();
		cleanups.push(() => stop?.());
		navigate(sensorData({ authToken: null }));

		await vi.advanceTimersByTimeAsync(10);

		expect(services.telemetry.getDeviceLatestData).not.toHaveBeenCalled();
	});

	it('shows the next device its own latest reading, and arms its refresh from it', async () => {
		// DEV-1 last reported 9 minutes ago: refetched 2 minutes from now.
		const { dashboard, services, navigate } = setup(
			sensorData({ latestData: { id: 'a0', created_at: at(-9 * MINUTE) } })
		);
		services.telemetry.getDeviceLatestData.mockResolvedValue({
			id: 'a1',
			created_at: at(2 * MINUTE)
		});
		const stopFirst = dashboard.scheduleRefresh();
		await vi.advanceTimersByTimeAsync(2 * MINUTE);
		stopFirst?.();
		expect(dashboard.displayLatestData).toEqual({ id: 'a1', created_at: at(2 * MINUTE) });

		// The page re-arms its refresh as soon as the data changes, before
		// handleNavigation runs. DEV-2 last reported 9 minutes before now: due in 2.
		navigate(
			sensorData({ devEui: 'DEV-2', latestData: { id: 'b0', created_at: at(-7 * MINUTE) } })
		);
		expect(dashboard.displayLatestData).toEqual({ id: 'b0', created_at: at(-7 * MINUTE) });
		expect(dashboard.lastUpdatedAt).toBe(at(-7 * MINUTE));
		services.telemetry.getDeviceLatestData.mockResolvedValue({
			id: 'b1',
			created_at: at(4 * MINUTE)
		});
		const stop = dashboard.scheduleRefresh();
		cleanups.push(() => stop?.());

		await vi.advanceTimersByTimeAsync(2 * MINUTE);
		expect(services.telemetry.getDeviceLatestData).toHaveBeenCalledTimes(2);
		expect(services.telemetry.getDeviceLatestData).toHaveBeenLastCalledWith('DEV-2');
		await vi.waitFor(() =>
			expect(dashboard.displayLatestData).toEqual({ id: 'b1', created_at: at(4 * MINUTE) })
		);
	});

	it('forgets a refetched reading once the page has moved on, so coming back shows the newly loaded one', async () => {
		const { dashboard, services, navigate } = setup(
			sensorData({ latestData: { id: 'a0', created_at: at(-9 * MINUTE) } })
		);
		services.telemetry.getDeviceLatestData.mockResolvedValue({
			id: 'a1',
			created_at: at(2 * MINUTE)
		});
		services.telemetry.getDeviceDataWithinRange.mockResolvedValue([]);
		const stop = dashboard.scheduleRefresh();
		await vi.advanceTimersByTimeAsync(2 * MINUTE);
		stop?.();
		expect(dashboard.displayLatestData).toMatchObject({ id: 'a1' });

		navigate(sensorData({ devEui: 'DEV-2' }));
		dashboard.handleNavigation();
		// Back on DEV-1, its page has loaded a newer reading.
		navigate(sensorData({ latestData: { id: 'a2', created_at: at(3 * MINUTE) } }));
		dashboard.handleNavigation();

		expect(dashboard.displayLatestData).toEqual({ id: 'a2', created_at: at(3 * MINUTE) });
	});

	it('drops a latest reading that arrives after the page moved to another device', async () => {
		const { dashboard, services, navigate } = setup(
			sensorData({ latestData: { id: 'a0', created_at: at(-9 * MINUTE) } })
		);
		const late = deferred<Record<string, unknown>>();
		services.telemetry.getDeviceLatestData.mockReturnValue(late.promise);
		const stop = dashboard.scheduleRefresh();
		await vi.advanceTimersByTimeAsync(2 * MINUTE);
		expect(services.telemetry.getDeviceLatestData).toHaveBeenCalledWith('DEV-1');
		stop?.();

		const otherRows = [{ id: 'b1', created_at: at(-MINUTE), moisture: 20 }];
		navigate(sensorData({ devEui: 'DEV-2', deviceData: otherRows, latestData: otherRows[0] }));
		late.resolve({ id: 'a1', created_at: at(2 * MINUTE), moisture: 33 });
		await vi.advanceTimersByTimeAsync(0);

		expect(dashboard.displayLatestData).toEqual(otherRows[0]);
		expect(dashboard.displayHistoricalData).toEqual(otherRows);
	});

	it('keeps the reading on screen when the refetch fails or returns no row', async () => {
		const { dashboard, services } = setup(
			sensorData({ latestData: { id: 'r0', created_at: at(-9 * MINUTE) } })
		);
		services.telemetry.getDeviceLatestData
			.mockRejectedValueOnce(apiError(404))
			.mockRejectedValueOnce(new TypeError('Failed to fetch'))
			.mockResolvedValueOnce([] as never);
		const stop = dashboard.scheduleRefresh();
		cleanups.push(() => stop?.());

		// Due in 2 minutes, then retried with backoff (1 and 2 minutes).
		await vi.advanceTimersByTimeAsync(2 * MINUTE);
		await vi.advanceTimersByTimeAsync(MINUTE);
		await vi.advanceTimersByTimeAsync(2 * MINUTE);

		expect(services.telemetry.getDeviceLatestData).toHaveBeenCalledTimes(3);
		expect(dashboard.displayLatestData).toEqual({ id: 'r0', created_at: at(-9 * MINUTE) });
		// A 404 (no reading yet) is expected; anything else is logged.
		expect(console.error).toHaveBeenCalledTimes(1);
		expect(console.error).toHaveBeenCalledWith(
			'Failed to fetch latest air data:',
			expect.any(TypeError)
		);
	});
});

describe('DeviceDashboard foreground refresh', () => {
	it('reloads the active range first, then the latest reading', async () => {
		const { dashboard, services } = setup(sensorData());
		services.telemetry.getDeviceDataWithinRange.mockResolvedValue([]);
		services.telemetry.getDeviceLatestData.mockResolvedValue({ id: 'r9', created_at: at(0) });
		await dashboard.selectRange(24);

		await dashboard.refreshOnForeground();

		const rangeCalls = services.telemetry.getDeviceDataWithinRange.mock;
		expect(rangeCalls.calls).toHaveLength(2);
		const { start, end } = requestedBounds(rangeCalls.calls[1][1]);
		expect(end - start).toBe(24 * HOUR);
		expect(rangeCalls.invocationCallOrder[1]).toBeLessThan(
			services.telemetry.getDeviceLatestData.mock.invocationCallOrder[0]
		);
		expect(dashboard.displayHistoricalData).toEqual([{ id: 'r9', created_at: at(0) }]);
	});

	it('replaces the copy of the new reading in the history, matching rows without an id by time', async () => {
		const { dashboard, services } = setup(sensorData());
		services.telemetry.getDeviceDataWithinRange.mockResolvedValue([
			{ created_at: at(-MINUTE), moisture: 30 },
			{ created_at: at(-20 * MINUTE), moisture: 29 },
			{ moisture: 28 }
		]);
		services.telemetry.getDeviceLatestData
			.mockResolvedValueOnce({ created_at: at(-MINUTE), moisture: 31 })
			.mockResolvedValueOnce({ moisture: 32 });

		await dashboard.refreshOnForeground();
		expect(dashboard.displayHistoricalData).toEqual([
			{ created_at: at(-MINUTE), moisture: 31 },
			{ created_at: at(-20 * MINUTE), moisture: 29 },
			{ moisture: 28 }
		]);

		// Without an id or a time, it replaces the rows that have neither.
		await dashboard.refreshOnForeground();
		expect(dashboard.displayHistoricalData).toEqual([
			{ moisture: 32 },
			{ created_at: at(-MINUTE), moisture: 30 },
			{ created_at: at(-20 * MINUTE), moisture: 29 }
		]);
	});

	it('reloads today when no range has loaded yet', async () => {
		const { dashboard, services } = setup(sensorData());
		services.telemetry.getDeviceDataWithinRange.mockResolvedValue([]);
		services.telemetry.getDeviceLatestData.mockRejectedValue(apiError(404));

		await dashboard.refreshOnForeground();

		expectTodayBounds(services.telemetry.getDeviceDataWithinRange.mock.calls[0][1]);
		expect(dashboard.activeRange).toBe('today');
	});
});

describe('DeviceDashboard relay state', () => {
	it('starts the relay state manager and loads the relay history for today', async () => {
		const { dashboard, services } = setup(relayData());
		services.relays.getRelayData.mockResolvedValue(relayRow({ relay_1: true }));
		services.relays.getRelayHistory.mockResolvedValue([historyEntry('h1')]);

		dashboard.handleNavigation();

		expect(dashboard.isRelayDevice).toBe(true);
		expect(services.relays.getRelayData).toHaveBeenCalledWith('RELAY-1', {
			signal: expect.any(AbortSignal),
			suppressNotFoundError: true
		});
		const [devEui, query] = services.relays.getRelayHistory.mock.calls[0];
		expect(devEui).toBe('RELAY-1');
		expect(Object.keys(query ?? {})).toEqual(['start', 'end']);
		expectTodayBounds(query);
		expect(services.telemetry.getDeviceDataWithinRange).not.toHaveBeenCalled();

		await vi.waitFor(() => expect(dashboard.relayHistory).toEqual([historyEntry('h1')]));
		expect(dashboard.activeRange).toBe('today');
		expect(dashboard.displayLatestData).toMatchObject({ id: 'relay-row-1', relay_1: true });
		expect(dashboard.displayHistoricalData).toEqual([
			expect.objectContaining({ id: 'relay-row-1' })
		]);
	});

	it('reads a nested relay row, and treats a 404 or a failure as no reading', async () => {
		const nested = setup(relayData());
		nested.services.relays.getRelayData.mockResolvedValue({ data: relayRow({ relay_2: 1 }) });
		nested.services.relays.getRelayHistory.mockResolvedValue([]);
		nested.dashboard.handleNavigation();
		await vi.waitFor(() =>
			expect(nested.dashboard.displayLatestData).toMatchObject({ relay_2: true })
		);

		for (const failure of [apiError(404), new TypeError('Failed to fetch')]) {
			const { dashboard, services } = setup(relayData());
			services.relays.getRelayData.mockRejectedValue(failure);
			services.relays.getRelayHistory.mockResolvedValue([]);
			dashboard.handleNavigation();
			await vi.waitFor(() => expect(dashboard.relayHistory).toEqual([]));
			expect(dashboard.displayLatestData).toBeNull();
		}
		expect(console.error).toHaveBeenCalledTimes(1);
		expect(console.error).toHaveBeenCalledWith(
			'Failed to fetch latest relay data:',
			expect.any(TypeError)
		);
	});

	it("shows the next relay its own state at once, not the previous relay's", async () => {
		const { dashboard, services, navigate } = setup(relayData());
		services.relays.getRelayData.mockResolvedValue(relayRow({ relay_1: true }));
		services.relays.getRelayHistory.mockResolvedValue([]);
		dashboard.handleNavigation();
		await vi.waitFor(() => expect(dashboard.displayLatestData).toMatchObject({ relay_1: true }));

		// The router hands the page the next relay; handleNavigation has not run yet.
		const reported = { id: 'r2-row', created_at: at(-2 * MINUTE), relay_1: false, relay_2: true };
		navigate(
			relayData({ devEui: 'RELAY-2', device: device({ dev_eui: 'RELAY-2' }), latestData: reported })
		);

		expect(dashboard.relayStateSnapshot).toEqual({
			historicalData: [],
			latestData: null,
			pendingRelayStates: {}
		});
		expect(dashboard.displayLatestData).toEqual(reported);
		expect(dashboard.lastUpdatedAt).toBe(at(-2 * MINUTE));
	});

	it('keeps a relay manager asking the relay it was started for, until the page replaces it', async () => {
		vi.useFakeTimers({
			toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date']
		});
		vi.setSystemTime(NOW);
		const { dashboard, services, navigate } = setup(relayData());
		services.relays.getRelayData.mockResolvedValue(relayRow());
		services.relays.getRelayHistory.mockResolvedValue([]);
		services.relays.updateRelay.mockResolvedValue({ requestedAt: at(0) });
		services.relays.requestRelayStatus.mockResolvedValue(null);
		dashboard.handleNavigation();
		await vi.advanceTimersByTimeAsync(0);
		await dashboard.queueRelayCommand(1, 'on');

		// The router hands the page the next relay; the manager checking the
		// command keeps running until handleNavigation replaces it.
		navigate(relayData({ devEui: 'RELAY-2', device: device({ dev_eui: 'RELAY-2' }) }));
		await vi.advanceTimersByTimeAsync(RELAY_STATUS_REQUEST_AFTER_MS + RELAY_CHECK_INTERVAL_MS);

		expect(services.relays.getRelayData.mock.calls.length).toBeGreaterThan(1);
		expect(new Set(services.relays.getRelayData.mock.calls.map(([devEui]) => devEui))).toEqual(
			new Set(['RELAY-1'])
		);
		expect(services.relays.requestRelayStatus.mock.calls).toEqual([['RELAY-1']]);
	});

	it("shows nothing from the previous relay's manager on the next device's page", async () => {
		vi.useFakeTimers({
			toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date']
		});
		vi.setSystemTime(NOW);
		const { dashboard, services, toast, navigate } = setup(relayData());
		services.relays.getRelayData.mockResolvedValue(relayRow());
		services.relays.getRelayHistory.mockResolvedValue([]);
		services.relays.updateRelay.mockResolvedValue({ requestedAt: at(0) });
		dashboard.handleNavigation();
		await vi.advanceTimersByTimeAsync(0);
		await dashboard.queueRelayCommand(1, 'on');
		toast.add.mockClear();

		navigate(relayData({ devEui: 'RELAY-2', device: device({ dev_eui: 'RELAY-2' }) }));
		// RELAY-1 confirms the command at the manager's next check.
		services.relays.getRelayData.mockResolvedValue(
			relayRow({ id: 'relay-row-2', created_at: at(3_000), relay_1: true })
		);
		await vi.advanceTimersByTimeAsync(RELAY_FIRST_CHECK_MS + RELAY_HISTORY_REFRESH_DELAY_MS);

		expect(toast.add).not.toHaveBeenCalled();
		expect(dashboard.relayStateSnapshot).toEqual({
			historicalData: [],
			latestData: null,
			pendingRelayStates: {}
		});
	});

	it('explains a failed load by the kind of device it was requested for', async () => {
		const { dashboard, services, toast, navigate } = setup(relayData());
		services.relays.getRelayData.mockResolvedValue(relayRow());
		const history = deferred<RelayHistoryEntryDto[]>();
		services.relays.getRelayHistory.mockReturnValue(history.promise);
		dashboard.handleNavigation();

		// The relay's history fails while the page shows a sensor.
		navigate(sensorData());
		history.reject(apiError(500));
		await vi.waitFor(() => expect(toast.add).toHaveBeenCalled());
		navigate(relayData());

		expect(toast.add).toHaveBeenCalledWith({
			tone: 'danger',
			message: m.devices_relay_history_load_failed()
		});
		expect(dashboard.fetchError).toBe(m.devices_relay_history_load_failed());
	});

	it('reports a failed relay history load', async () => {
		const { dashboard, services, toast } = setup(relayData());
		services.relays.getRelayData.mockResolvedValue(relayRow());
		services.relays.getRelayHistory.mockRejectedValue(apiError(500));

		dashboard.handleNavigation();

		await vi.waitFor(() =>
			expect(dashboard.fetchError).toBe(m.devices_relay_history_load_failed())
		);
		expect(toast.add).toHaveBeenCalledWith({
			tone: 'danger',
			message: m.devices_relay_history_load_failed()
		});
	});

	it('keeps one manager per device and session, and refreshes it on demand', async () => {
		vi.useFakeTimers({
			toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date']
		});
		vi.setSystemTime(NOW);
		vi.spyOn(Math, 'random').mockReturnValue(0);
		// Last reported 5 minutes ago with a 1-minute interval: the scheduler is due at once.
		const { dashboard, services } = setup(
			relayData({ device: device({ dev_eui: 'RELAY-1', upload_interval: 1 }) })
		);
		services.relays.getRelayData.mockResolvedValue(relayRow());
		services.relays.getRelayHistory.mockResolvedValue([]);

		dashboard.handleNavigation();
		dashboard.handleNavigation();
		await vi.advanceTimersByTimeAsync(0);
		expect(services.relays.getRelayData).toHaveBeenCalledTimes(1);

		// The scheduler refetches through the manager, not the sensor endpoint.
		const stop = dashboard.scheduleRefresh();
		cleanups.push(() => stop?.());
		await vi.advanceTimersByTimeAsync(10);
		expect(services.relays.getRelayData).toHaveBeenCalledTimes(2);
		expect(services.telemetry.getDeviceLatestData).not.toHaveBeenCalled();
	});

	it('refreshes the history shortly after the device reports a new state', async () => {
		vi.useFakeTimers({
			toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date']
		});
		vi.setSystemTime(NOW);
		const { dashboard, services } = setup(relayData());
		services.relays.getRelayData.mockResolvedValue(relayRow());
		services.relays.getRelayHistory.mockResolvedValueOnce([historyEntry('h1')]);
		dashboard.handleNavigation();
		await vi.advanceTimersByTimeAsync(0);
		expect(dashboard.relayHistory).toEqual([historyEntry('h1')]);

		// The manager's background refresh picks up a newer report.
		services.relays.getRelayData.mockResolvedValue(
			relayRow({ id: 'relay-row-2', created_at: at(0), relay_1: true })
		);
		services.relays.getRelayHistory.mockResolvedValueOnce([historyEntry('h2'), historyEntry('h1')]);
		await vi.advanceTimersByTimeAsync(30_000);
		expect(services.relays.getRelayHistory).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(RELAY_HISTORY_REFRESH_DELAY_MS);
		expect(services.relays.getRelayHistory).toHaveBeenCalledTimes(2);
		expectTodayBounds(services.relays.getRelayHistory.mock.calls[1][1]);
		expect(dashboard.relayHistory).toEqual([historyEntry('h2'), historyEntry('h1')]);
		expect(dashboard.displayLatestData).toMatchObject({ id: 'relay-row-2', relay_1: true });
	});

	it('drops a quiet history refresh when the range changed meanwhile, and logs a failed one', async () => {
		vi.useFakeTimers({
			toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date']
		});
		vi.setSystemTime(NOW);
		const { dashboard, services } = setup(relayData());
		services.relays.getRelayData.mockResolvedValue(relayRow());
		services.relays.getRelayHistory.mockResolvedValueOnce([historyEntry('today')]);
		dashboard.handleNavigation();
		await vi.advanceTimersByTimeAsync(0);

		const stale = deferred<RelayHistoryEntryDto[]>();
		services.relays.getRelayHistory.mockReturnValueOnce(stale.promise);
		services.relays.getRelayData.mockResolvedValue(relayRow({ id: 'r2', created_at: at(0) }));
		await vi.advanceTimersByTimeAsync(30_000 + RELAY_HISTORY_REFRESH_DELAY_MS);
		expect(services.relays.getRelayHistory).toHaveBeenCalledTimes(2);

		services.relays.getRelayHistory.mockResolvedValueOnce([historyEntry('72h')]);
		await dashboard.selectRange(72);
		stale.resolve([historyEntry('stale')]);
		await vi.advanceTimersByTimeAsync(0);
		expect(dashboard.activeRange).toBe(72);
		expect(dashboard.relayHistory).toEqual([historyEntry('72h')]);

		services.relays.getRelayHistory.mockRejectedValueOnce(new TypeError('Failed to fetch'));
		services.relays.getRelayData.mockResolvedValue(relayRow({ id: 'r3', created_at: at(MINUTE) }));
		await vi.advanceTimersByTimeAsync(30_000 + RELAY_HISTORY_REFRESH_DELAY_MS);
		expect(services.relays.getRelayHistory).toHaveBeenCalledTimes(4);
		expect(dashboard.relayHistory).toEqual([historyEntry('72h')]);
		expect(console.error).toHaveBeenCalledWith(
			'Failed to refresh relay history:',
			expect.any(TypeError)
		);
	});

	it('starts no relay manager without a device, and drops a refetch once the session ends', async () => {
		vi.useFakeTimers({
			toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date']
		});
		vi.setSystemTime(NOW);
		vi.spyOn(Math, 'random').mockReturnValue(0);
		const withoutDevice = setup(relayData({ devEui: '' }));
		withoutDevice.dashboard.handleNavigation();
		expect(withoutDevice.services.relays.getRelayData).not.toHaveBeenCalled();

		// Due at once (never reported), but the session is gone when it fires.
		const { dashboard, services, navigate } = setup(relayData());
		const stop = dashboard.scheduleRefresh();
		cleanups.push(() => stop?.());
		navigate(relayData({ authToken: null }));
		await vi.advanceTimersByTimeAsync(10);
		expect(services.relays.getRelayData).not.toHaveBeenCalled();
	});

	it('re-reads no history before a range has loaded, or while a range is loading', async () => {
		vi.useFakeTimers({
			toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date']
		});
		vi.setSystemTime(NOW);
		const early = setup(relayData());
		early.services.relays.getRelayData.mockResolvedValue(relayRow());
		early.services.relays.updateRelay.mockResolvedValue({ requestedAt: at(0) });
		await early.dashboard.queueRelayCommand(1, 'on');
		await vi.advanceTimersByTimeAsync(RELAY_HISTORY_REFRESH_DELAY_MS);
		expect(early.services.relays.getRelayHistory).not.toHaveBeenCalled();

		const { dashboard, services } = setup(relayData());
		services.relays.getRelayData.mockResolvedValue(relayRow());
		services.relays.getRelayHistory.mockResolvedValueOnce([historyEntry('today')]);
		dashboard.handleNavigation();
		await vi.advanceTimersByTimeAsync(0);
		const slow = deferred<RelayHistoryEntryDto[]>();
		services.relays.getRelayHistory.mockReturnValueOnce(slow.promise);
		void dashboard.selectRange(24);
		services.relays.updateRelay.mockResolvedValue({ requestedAt: at(0) });
		await dashboard.queueRelayCommand(1, 'on');
		await vi.advanceTimersByTimeAsync(RELAY_HISTORY_REFRESH_DELAY_MS);
		expect(services.relays.getRelayHistory).toHaveBeenCalledTimes(2);

		slow.resolve([historyEntry('24h')]);
		await vi.advanceTimersByTimeAsync(0);
		expect(dashboard.relayHistory).toEqual([historyEntry('24h')]);
	});

	it('asks the relay nothing once the session ended, and treats a missing reading as none', async () => {
		vi.useFakeTimers({
			toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date']
		});
		vi.setSystemTime(NOW);
		vi.spyOn(Math, 'random').mockReturnValue(0);
		const signedOut = setup(relayData());
		signedOut.services.relays.getRelayData.mockResolvedValue(relayRow());
		signedOut.services.relays.getRelayHistory.mockResolvedValue([]);
		signedOut.dashboard.handleNavigation();
		await vi.advanceTimersByTimeAsync(0);
		// The session ends before the page reacts; the manager's background refresh asks nothing.
		signedOut.navigate(relayData({ authToken: null }));
		await vi.advanceTimersByTimeAsync(30_000);
		expect(signedOut.services.relays.getRelayData).toHaveBeenCalledTimes(1);

		// A relay that never reported: the scheduler refetches at once and finds nothing.
		const { dashboard, services } = setup(relayData());
		services.relays.getRelayData.mockRejectedValue(apiError(404));
		services.relays.getRelayHistory.mockResolvedValue([]);
		dashboard.handleNavigation();
		const stop = dashboard.scheduleRefresh();
		cleanups.push(() => stop?.());
		await vi.advanceTimersByTimeAsync(10);
		expect(services.relays.getRelayData).toHaveBeenCalledTimes(2);
		expect(dashboard.displayLatestData).toBeNull();
	});

	it('tears the manager down when leaving the relay, and on destroy', async () => {
		vi.useFakeTimers({
			toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date']
		});
		vi.setSystemTime(NOW);
		const { dashboard, services, navigate } = setup(relayData());
		services.relays.getRelayData.mockResolvedValue(relayRow());
		services.relays.getRelayHistory.mockResolvedValue([]);
		services.telemetry.getDeviceDataWithinRange.mockResolvedValue([]);
		dashboard.handleNavigation();
		await vi.advanceTimersByTimeAsync(0);
		expect(dashboard.relayStateSnapshot.latestData).not.toBeNull();

		navigate(sensorData());
		dashboard.handleNavigation();
		expect(dashboard.relayStateSnapshot).toEqual({
			historicalData: [],
			latestData: null,
			pendingRelayStates: {}
		});
		await vi.advanceTimersByTimeAsync(5 * 30_000);
		expect(services.relays.getRelayData).toHaveBeenCalledTimes(1);

		navigate(relayData());
		dashboard.handleNavigation();
		await vi.advanceTimersByTimeAsync(0);
		expect(services.relays.getRelayData).toHaveBeenCalledTimes(2);
		dashboard.destroyRelayStateManager();
		await vi.advanceTimersByTimeAsync(5 * 30_000);
		expect(services.relays.getRelayData).toHaveBeenCalledTimes(2);
	});
});

describe('DeviceDashboard relay commands', () => {
	beforeEach(() => {
		vi.useFakeTimers({
			toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date']
		});
		vi.setSystemTime(NOW);
	});

	/** A relay dashboard that has loaded today's history and the current state. */
	async function loadedRelay(overrides: Partial<DeviceDashboardData> = {}) {
		const harness = setup(relayData(overrides));
		harness.services.relays.getRelayData.mockResolvedValue(relayRow());
		harness.services.relays.getRelayHistory.mockResolvedValue([]);
		harness.dashboard.handleNavigation();
		await vi.advanceTimersByTimeAsync(0);
		return harness;
	}

	it('switches a relay and confirms it from the next report', async () => {
		const { dashboard, services, toast } = await loadedRelay();
		services.relays.updateRelay.mockResolvedValue({ requestedAt: at(0) });

		await dashboard.queueRelayCommand(1, 'on');

		expect(services.relays.updateRelay).toHaveBeenCalledWith('RELAY-1', {
			relay: 1,
			targetState: 'on'
		});
		expect(services.relays.pulseRelay).not.toHaveBeenCalled();
		expect(toast.add).toHaveBeenCalledWith({
			tone: 'info',
			message: m.devices_relay_command_queued({ relay: '1' })
		});
		expect(dashboard.relayStateSnapshot.pendingRelayStates[1]).toEqual({
			requestedState: 'on',
			sentAt: at(0),
			phase: 'confirming',
			statusRequested: false
		});

		// The command shows up in the history shortly after it was sent.
		await vi.advanceTimersByTimeAsync(RELAY_HISTORY_REFRESH_DELAY_MS);
		expect(services.relays.getRelayHistory).toHaveBeenCalledTimes(2);

		// The device reports the new state after the command.
		services.relays.getRelayData.mockResolvedValue(
			relayRow({ id: 'relay-row-2', created_at: at(3_000), relay_1: true })
		);
		await vi.advanceTimersByTimeAsync(RELAY_FIRST_CHECK_MS - RELAY_HISTORY_REFRESH_DELAY_MS);

		expect(toast.add).toHaveBeenLastCalledWith({
			tone: 'success',
			message: m.devices_relay_confirmation_changed({
				relay: '1',
				state: getRelayTargetStateLabel('on')
			})
		});
		expect(dashboard.relayStateSnapshot.pendingRelayStates).toEqual({});

		// The new report and the confirmation collapse into one more history read.
		await vi.advanceTimersByTimeAsync(RELAY_HISTORY_REFRESH_DELAY_MS);
		expect(services.relays.getRelayHistory).toHaveBeenCalledTimes(3);
	});

	it('pulses a relay, and times the command locally when the API sends no time', async () => {
		const { dashboard, services } = await loadedRelay();
		services.relays.pulseRelay.mockResolvedValue(null);

		await dashboard.queueRelayCommand(2, 'on', 90);

		expect(services.relays.pulseRelay).toHaveBeenCalledWith('RELAY-1', {
			durationSeconds: 90,
			relay: 2
		});
		expect(services.relays.updateRelay).not.toHaveBeenCalled();
		expect(dashboard.relayStateSnapshot.pendingRelayStates[2]).toMatchObject({
			requestedState: 'on',
			sentAt: at(0),
			expiresAt: at(90_000)
		});
	});

	it('reports a mismatch when the device keeps the old state', async () => {
		const { dashboard, services, toast } = await loadedRelay();
		services.relays.updateRelay.mockResolvedValue({ requestedAt: at(0) });
		services.relays.requestRelayStatus.mockResolvedValue(null);
		await dashboard.queueRelayCommand(1, 'on');

		const oldState = relayRow({ id: 'relay-row-2', created_at: at(3_000), relay_1: false });
		services.relays.getRelayData.mockResolvedValue(oldState);
		// Checks run at 5 s and then every 4 s; the one at 61 s closes the window.
		await vi.advanceTimersByTimeAsync(RELAY_CONFIRMATION_WINDOW_MS + RELAY_CHECK_INTERVAL_MS);

		expect(toast.add).toHaveBeenCalledWith({
			tone: 'warning',
			message: m.devices_relay_confirmation_mismatch({
				relay: '1',
				state: getVerifiedRelayStateLabel(1, oldState)
			})
		});
	});

	it('asks an unresponsive device for its state, then reports the command unconfirmed', async () => {
		const { dashboard, services, toast } = await loadedRelay();
		services.relays.updateRelay.mockResolvedValue({ requestedAt: at(0) });
		services.relays.requestRelayStatus.mockResolvedValue(null);
		await dashboard.queueRelayCommand(1, 'off');

		// Checks run at 5 s and then every 4 s: the one at 21 s asks, the one at 61 s gives up.
		await vi.advanceTimersByTimeAsync(RELAY_STATUS_REQUEST_AFTER_MS + RELAY_CHECK_INTERVAL_MS);
		expect(services.relays.requestRelayStatus).toHaveBeenCalledWith('RELAY-1');

		await vi.advanceTimersByTimeAsync(RELAY_CONFIRMATION_WINDOW_MS - RELAY_STATUS_REQUEST_AFTER_MS);
		expect(toast.add).toHaveBeenCalledWith({
			tone: 'warning',
			message: m.devices_relay_confirmation_unconfirmed({ relay: '1' })
		});
		expect(dashboard.relayStateSnapshot.pendingRelayStates[1]?.phase).toBe('awaiting-report');
	});

	it('leaves a command answered after the page moved on to the relay it was sent to', async () => {
		const { dashboard, services, toast, navigate } = await loadedRelay();
		const answer = deferred<{ requestedAt: string }>();
		services.relays.updateRelay.mockReturnValue(answer.promise);
		const command = dashboard.queueRelayCommand(1, 'on');

		navigate(relayData({ devEui: 'RELAY-2', device: device({ dev_eui: 'RELAY-2' }) }));
		dashboard.handleNavigation();
		await vi.advanceTimersByTimeAsync(0);
		answer.resolve({ requestedAt: at(0) });
		await command;
		await vi.advanceTimersByTimeAsync(RELAY_HISTORY_REFRESH_DELAY_MS);

		expect(services.relays.updateRelay).toHaveBeenCalledWith('RELAY-1', {
			relay: 1,
			targetState: 'on'
		});
		// RELAY-2's manager waits for no command, and its history is not re-read for one.
		expect(dashboard.relayStateSnapshot.pendingRelayStates).toEqual({});
		expect(services.relays.getRelayHistory).toHaveBeenCalledTimes(2);
		expect(toast.add).not.toHaveBeenCalled();
	});

	it('sends nothing while a command is confirming, or without the right to manage', async () => {
		const { dashboard, services } = await loadedRelay();
		services.relays.updateRelay.mockResolvedValue({ requestedAt: at(0) });
		await dashboard.queueRelayCommand(1, 'on');
		await dashboard.queueRelayCommand(2, 'on');
		expect(services.relays.updateRelay).toHaveBeenCalledTimes(1);

		for (const data of [
			relayData({ permissionLevel: PermissionLevel.USER }),
			relayData({ authToken: null }),
			sensorData()
		]) {
			const other = setup(data);
			await other.dashboard.queueRelayCommand(1, 'on', 60);
			expect(other.services.relays.updateRelay).not.toHaveBeenCalled();
			expect(other.services.relays.pulseRelay).not.toHaveBeenCalled();
		}
	});

	it("explains a failed command with the API's message, or by its status", async () => {
		const { dashboard, services, toast } = await loadedRelay();
		const failures: Array<[unknown, string]> = [
			[apiError(403, { message: 'Relay is locked' }), 'Relay is locked'],
			[apiError(429), m.devices_relay_downlink_rate_limited()],
			[apiError(404), m.devices_relay_downlink_target_not_found()],
			[apiError(401), m.devices_relay_downlink_not_authorized()],
			[new TypeError('Failed to fetch'), m.devices_relay_command_failed()]
		];

		for (const [error, message] of failures) {
			services.relays.updateRelay.mockRejectedValueOnce(error);
			await dashboard.queueRelayCommand(1, 'on');
			expect(toast.add).toHaveBeenLastCalledWith({ tone: 'danger', message });
		}
		expect(console.error).toHaveBeenCalledWith('[relay-control] command failed', {
			devEui: 'RELAY-1',
			durationSeconds: undefined,
			error: failures[0][0],
			relay: 1,
			targetState: 'on'
		});
		expect(dashboard.relayStateSnapshot.pendingRelayStates).toEqual({});
	});
});
