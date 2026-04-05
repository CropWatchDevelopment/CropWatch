import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	RELAY_REFRESH_INTERVAL_MS,
	RELAY_VERIFICATION_DELAY_MS,
	RelayStateManager
} from './relay-control';

function createRelayRow(overrides: Record<string, unknown> = {}) {
	return {
		created_at: '2026-04-05T10:00:00.000Z',
		id: 'relay-row-1',
		relay_1: false,
		relay_2: false,
		...overrides
	};
}

afterEach(() => {
	vi.useRealTimers();
});

describe('RelayStateManager', () => {
	it('fetches the current relay state immediately on creation', async () => {
		const fetchLatestData = vi.fn(async () =>
			createRelayRow({
				id: 'relay-row-current',
				relay_1: true
			})
		);

		const manager = new RelayStateManager({
			fetchLatestData,
			historicalData: [],
			latestData: null
		});

		await Promise.resolve();

		expect(fetchLatestData).toHaveBeenCalledTimes(1);
		expect(manager.getSnapshot().latestData).toMatchObject({
			id: 'relay-row-current',
			relay_1: true
		});

		manager.destroy();
	});

	it('schedules one verification fetch and clears pending when the API matches the requested state', async () => {
		vi.useFakeTimers();
		const onVerificationResolved = vi.fn();
		const fetchLatestData = vi.fn(async () =>
			createRelayRow({
				created_at: '2026-04-05T10:00:15.000Z',
				id: 'relay-row-verified',
				relay_1: true
			})
		);

		const manager = new RelayStateManager({
			fetchLatestData,
			historicalData: [],
			latestData: createRelayRow(),
			fetchOnInit: false,
			onVerificationResolved
		});

		manager.startVerification(1, 'on');
		expect(manager.getSnapshot().pendingRelayStates[1]).toEqual({
			requestedState: 'on',
			verifyAt: expect.any(String)
		});

		await vi.advanceTimersByTimeAsync(RELAY_VERIFICATION_DELAY_MS - 1);
		expect(fetchLatestData).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(1);

		expect(fetchLatestData).toHaveBeenCalledTimes(1);
		expect(manager.getSnapshot().pendingRelayStates[1]).toBeUndefined();
		expect(manager.getSnapshot().latestData).toMatchObject({
			id: 'relay-row-verified',
			relay_1: true
		});
		expect(onVerificationResolved).toHaveBeenCalledWith({
			matched: true,
			relay: 1,
			row: expect.objectContaining({
				id: 'relay-row-verified',
				relay_1: true
			}),
			targetState: 'on'
		});

		manager.destroy();
	});

	it('clears pending and keeps the API-reported state when verification does not match', async () => {
		vi.useFakeTimers();
		const onVerificationResolved = vi.fn();
		const fetchLatestData = vi.fn(async () =>
			createRelayRow({
				created_at: '2026-04-05T10:00:15.000Z',
				id: 'relay-row-mismatch',
				relay_1: false
			})
		);

		const manager = new RelayStateManager({
			fetchLatestData,
			historicalData: [],
			latestData: createRelayRow({
				id: 'relay-row-initial',
				relay_1: false
			}),
			fetchOnInit: false,
			onVerificationResolved
		});

		manager.startVerification(1, 'on');
		await vi.advanceTimersByTimeAsync(RELAY_VERIFICATION_DELAY_MS);

		expect(manager.getSnapshot().pendingRelayStates[1]).toBeUndefined();
		expect(manager.getSnapshot().latestData).toMatchObject({
			id: 'relay-row-mismatch',
			relay_1: false
		});
		expect(onVerificationResolved).toHaveBeenCalledWith({
			matched: false,
			relay: 1,
			row: expect.objectContaining({
				id: 'relay-row-mismatch',
				relay_1: false
			}),
			targetState: 'on'
		});

		manager.destroy();
	});

	it('refreshes relay state every 30 seconds to pick up external updates', async () => {
		vi.useFakeTimers();
		const fetchLatestData = vi
			.fn<() => Promise<Record<string, unknown> | null>>()
			.mockResolvedValueOnce(
				createRelayRow({
					created_at: '2026-04-05T10:00:30.000Z',
					id: 'relay-row-refresh',
					relay_2: true
				})
			);

		const manager = new RelayStateManager({
			fetchLatestData,
			historicalData: [],
			latestData: createRelayRow(),
			fetchOnInit: false
		});

		await vi.advanceTimersByTimeAsync(RELAY_REFRESH_INTERVAL_MS);

		expect(fetchLatestData).toHaveBeenCalledTimes(1);
		expect(manager.getSnapshot().latestData).toMatchObject({
			id: 'relay-row-refresh',
			relay_2: true
		});

		manager.destroy();
	});

	it('keeps the relay GET result as current state even when historical telemetry has a newer timestamp', async () => {
		vi.useFakeTimers();
		const onVerificationResolved = vi.fn();
		const fetchLatestData = vi.fn(async () =>
			createRelayRow({
				created_at: '2026-04-05T10:00:15.000Z',
				id: 'relay-row-current',
				relay_1: true
			})
		);

		const manager = new RelayStateManager({
			fetchLatestData,
			historicalData: [
				createRelayRow({
					created_at: '2026-04-05T10:00:30.000Z',
					id: 'relay-row-history-newer',
					relay_1: false
				})
			],
			latestData: createRelayRow({
				created_at: '2026-04-05T10:00:30.000Z',
				id: 'relay-row-history-newer',
				relay_1: false
			}),
			fetchOnInit: false,
			onVerificationResolved
		});

		manager.startVerification(1, 'on');
		await vi.advanceTimersByTimeAsync(RELAY_VERIFICATION_DELAY_MS);

		expect(manager.getSnapshot().latestData).toMatchObject({
			id: 'relay-row-current',
			relay_1: true
		});
		expect(manager.getSnapshot().historicalData[0]).toMatchObject({
			id: 'relay-row-history-newer',
			relay_1: false
		});
		expect(onVerificationResolved).toHaveBeenCalledWith({
			matched: true,
			relay: 1,
			row: expect.objectContaining({
				id: 'relay-row-current',
				relay_1: true
			}),
			targetState: 'on'
		});

		manager.destroy();
	});

	it('reuses the in-flight GET when verification and background refresh overlap', async () => {
		vi.useFakeTimers();
		let resolveFetch!: (value: Record<string, unknown> | null) => void;
		const fetchLatestData = vi.fn(
			() =>
				new Promise<Record<string, unknown> | null>((resolve) => {
					resolveFetch = resolve;
				})
		);

		const manager = new RelayStateManager({
			fetchLatestData,
			historicalData: [],
			latestData: createRelayRow(),
			fetchOnInit: false
		});

		manager.startVerification(1, 'on');
		await vi.advanceTimersByTimeAsync(RELAY_VERIFICATION_DELAY_MS);
		expect(fetchLatestData).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(RELAY_REFRESH_INTERVAL_MS);
		expect(fetchLatestData).toHaveBeenCalledTimes(1);

		resolveFetch(
			createRelayRow({
				created_at: '2026-04-05T10:00:15.000Z',
				id: 'relay-row-overlap',
				relay_1: true
			})
		);
		await vi.advanceTimersByTimeAsync(0);

		expect(manager.getSnapshot().pendingRelayStates[1]).toBeUndefined();

		await vi.advanceTimersByTimeAsync(RELAY_REFRESH_INTERVAL_MS);
		expect(fetchLatestData).toHaveBeenCalledTimes(2);

		manager.destroy();
	});
});
