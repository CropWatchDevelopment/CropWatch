import { afterEach, describe, expect, it, vi } from 'vitest';
import {
	hasConfirmingRelay,
	RELAY_CHECK_INTERVAL_MS,
	RELAY_CONFIRMATION_WINDOW_MS,
	RELAY_FIRST_CHECK_MS,
	RELAY_REFRESH_INTERVAL_MS,
	RELAY_STATUS_REQUEST_AFTER_MS,
	RelayStateManager
} from './relay-control';

/** When the API sent the command (its `requestedAt`). */
const SENT_AT = '2026-04-05T10:00:00.000Z';

function createRelayRow(overrides: Record<string, unknown> = {}) {
	return {
		created_at: '2026-04-05T09:55:00.000Z',
		id: 'relay-row-1',
		relay_1: false,
		relay_2: false,
		...overrides
	};
}

/** A manager whose GET returns whatever the device last "reported". */
function createManager(
	options: { requestStatus?: () => Promise<void>; initialRow?: Record<string, unknown> } = {}
) {
	let reported: Record<string, unknown> | null = options.initialRow ?? createRelayRow();
	const fetchLatestData = vi.fn(async () => reported);
	const onVerificationResolved = vi.fn();
	const manager = new RelayStateManager({
		fetchLatestData,
		historicalData: [],
		latestData: reported,
		fetchOnInit: false,
		onVerificationResolved,
		requestStatus: options.requestStatus
	});

	return {
		manager,
		fetchLatestData,
		onVerificationResolved,
		report(row: Record<string, unknown>) {
			reported = row;
		}
	};
}

function useClockAtSend() {
	vi.useFakeTimers();
	vi.setSystemTime(new Date(SENT_AT));
}

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
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

	it('confirms as soon as a report sent after the command shows the requested state', async () => {
		useClockAtSend();
		const { manager, onVerificationResolved, report } = createManager();

		manager.startVerification(1, 'on', { sentAt: SENT_AT });
		expect(manager.getSnapshot().pendingRelayStates[1]).toEqual({
			requestedState: 'on',
			sentAt: SENT_AT,
			phase: 'confirming',
			statusRequested: false
		});

		report(createRelayRow({ created_at: '2026-04-05T10:00:04.000Z', id: 'after', relay_1: true }));
		await vi.advanceTimersByTimeAsync(RELAY_FIRST_CHECK_MS);

		expect(manager.getSnapshot().pendingRelayStates[1]).toBeUndefined();
		expect(onVerificationResolved).toHaveBeenCalledWith({
			outcome: 'confirmed',
			relay: 1,
			row: expect.objectContaining({ id: 'after', relay_1: true }),
			targetState: 'on'
		});

		manager.destroy();
	});

	it('ignores a report from before the command instead of calling it a mismatch', async () => {
		// The 19:40 incident: the newest row predated the command, so it said
		// nothing about it, yet the old check reported "did not match".
		useClockAtSend();
		const { manager, onVerificationResolved } = createManager({
			initialRow: createRelayRow({ created_at: '2026-04-05T09:59:53.000Z', relay_1: false })
		});

		manager.startVerification(1, 'on', { sentAt: SENT_AT });
		await vi.advanceTimersByTimeAsync(RELAY_FIRST_CHECK_MS + RELAY_CHECK_INTERVAL_MS * 2);

		expect(onVerificationResolved).not.toHaveBeenCalled();
		expect(manager.getSnapshot().pendingRelayStates[1]).toMatchObject({
			requestedState: 'on',
			phase: 'confirming'
		});

		manager.destroy();
	});

	it('asks the device for its state once when no report arrives within 20 seconds', async () => {
		useClockAtSend();
		const requestStatus = vi.fn(async () => {});
		const { manager } = createManager({ requestStatus });

		manager.startVerification(1, 'on', { sentAt: SENT_AT });
		await vi.advanceTimersByTimeAsync(RELAY_STATUS_REQUEST_AFTER_MS - 1);
		expect(requestStatus).not.toHaveBeenCalled();

		await vi.advanceTimersByTimeAsync(RELAY_CHECK_INTERVAL_MS);
		expect(requestStatus).toHaveBeenCalledTimes(1);
		expect(manager.getSnapshot().pendingRelayStates[1]?.statusRequested).toBe(true);

		await vi.advanceTimersByTimeAsync(RELAY_CHECK_INTERVAL_MS * 5);
		expect(requestStatus).toHaveBeenCalledTimes(1);

		manager.destroy();
	});

	it('never asks more than twice when the status request keeps failing', async () => {
		useClockAtSend();
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const requestStatus = vi.fn(async () => {
			throw new Error('Not Found');
		});
		const { manager } = createManager({ requestStatus });

		manager.startVerification(1, 'on', { sentAt: SENT_AT });
		await vi.advanceTimersByTimeAsync(RELAY_CONFIRMATION_WINDOW_MS);

		expect(requestStatus).toHaveBeenCalledTimes(2);
		expect(manager.getSnapshot().pendingRelayStates[1]?.statusRequested).toBe(false);

		manager.destroy();
	});

	it('unlocks after a minute without a report, then settles on the next report', async () => {
		useClockAtSend();
		const { manager, onVerificationResolved, report } = createManager();

		manager.startVerification(1, 'on', { sentAt: SENT_AT });
		await vi.advanceTimersByTimeAsync(RELAY_CONFIRMATION_WINDOW_MS + RELAY_CHECK_INTERVAL_MS);

		expect(onVerificationResolved).toHaveBeenCalledWith({
			outcome: 'unconfirmed',
			relay: 1,
			row: null,
			targetState: 'on'
		});
		const pending = manager.getSnapshot().pendingRelayStates;
		expect(pending[1]).toMatchObject({ requestedState: 'on', phase: 'awaiting-report' });
		expect(hasConfirmingRelay(pending)).toBe(false);

		// The device's next scheduled report, picked up by the background refresh.
		report(createRelayRow({ created_at: '2026-04-05T10:09:59.000Z', id: 'next', relay_1: true }));
		await vi.advanceTimersByTimeAsync(RELAY_REFRESH_INTERVAL_MS);

		expect(onVerificationResolved).toHaveBeenLastCalledWith({
			outcome: 'confirmed',
			relay: 1,
			row: expect.objectContaining({ id: 'next', relay_1: true }),
			targetState: 'on'
		});
		expect(manager.getSnapshot().pendingRelayStates[1]).toBeUndefined();

		manager.destroy();
	});

	it('waits through a report sent just before the command ran and confirms on the next one', async () => {
		useClockAtSend();
		const { manager, onVerificationResolved, report } = createManager();

		manager.startVerification(1, 'on', { sentAt: SENT_AT });
		report(createRelayRow({ created_at: '2026-04-05T10:00:01.000Z', id: 'race', relay_1: false }));
		await vi.advanceTimersByTimeAsync(RELAY_FIRST_CHECK_MS);
		expect(onVerificationResolved).not.toHaveBeenCalled();

		report(createRelayRow({ created_at: '2026-04-05T10:00:06.000Z', id: 'after', relay_1: true }));
		await vi.advanceTimersByTimeAsync(RELAY_CHECK_INTERVAL_MS);

		expect(onVerificationResolved).toHaveBeenCalledTimes(1);
		expect(onVerificationResolved).toHaveBeenCalledWith(
			expect.objectContaining({ outcome: 'confirmed', relay: 1 })
		);

		manager.destroy();
	});

	it('reports a mismatch when the device reported after the command and still shows the old state', async () => {
		useClockAtSend();
		const { manager, onVerificationResolved, report } = createManager();

		manager.startVerification(1, 'on', { sentAt: SENT_AT });
		report(
			createRelayRow({ created_at: '2026-04-05T10:00:04.000Z', id: 'old-state', relay_1: false })
		);
		await vi.advanceTimersByTimeAsync(RELAY_CONFIRMATION_WINDOW_MS + RELAY_CHECK_INTERVAL_MS);

		expect(onVerificationResolved).toHaveBeenCalledTimes(1);
		expect(onVerificationResolved).toHaveBeenCalledWith({
			outcome: 'mismatch',
			relay: 1,
			row: expect.objectContaining({ id: 'old-state', relay_1: false }),
			targetState: 'on'
		});
		expect(manager.getSnapshot().pendingRelayStates[1]).toBeUndefined();

		manager.destroy();
	});

	it('lets a short pulse lapse quietly instead of asking the device about a relay that reverted', async () => {
		useClockAtSend();
		const requestStatus = vi.fn(async () => {});
		const { manager, onVerificationResolved } = createManager({ requestStatus });

		manager.startVerification(1, 'on', { sentAt: SENT_AT, durationSeconds: 15 });
		expect(manager.getSnapshot().pendingRelayStates[1]?.expiresAt).toBe('2026-04-05T10:00:15.000Z');

		await vi.advanceTimersByTimeAsync(RELAY_CONFIRMATION_WINDOW_MS);

		expect(manager.getSnapshot().pendingRelayStates[1]).toBeUndefined();
		expect(requestStatus).not.toHaveBeenCalled();
		expect(onVerificationResolved).not.toHaveBeenCalled();

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
		useClockAtSend();
		const onVerificationResolved = vi.fn();
		const fetchLatestData = vi.fn(async () =>
			createRelayRow({
				created_at: '2026-04-05T10:00:03.000Z',
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

		manager.startVerification(1, 'on', { sentAt: SENT_AT });
		await vi.advanceTimersByTimeAsync(RELAY_FIRST_CHECK_MS);

		expect(manager.getSnapshot().latestData).toMatchObject({
			id: 'relay-row-current',
			relay_1: true
		});
		expect(manager.getSnapshot().historicalData[0]).toMatchObject({
			id: 'relay-row-history-newer',
			relay_1: false
		});
		expect(onVerificationResolved).toHaveBeenCalledWith(
			expect.objectContaining({
				outcome: 'confirmed',
				row: expect.objectContaining({ id: 'relay-row-current', relay_1: true })
			})
		);

		manager.destroy();
	});

	it('reuses the in-flight GET when verification and background refresh overlap', async () => {
		useClockAtSend();
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

		manager.startVerification(1, 'on', { sentAt: SENT_AT });
		await vi.advanceTimersByTimeAsync(RELAY_FIRST_CHECK_MS);
		expect(fetchLatestData).toHaveBeenCalledTimes(1);

		await vi.advanceTimersByTimeAsync(RELAY_REFRESH_INTERVAL_MS);
		expect(fetchLatestData).toHaveBeenCalledTimes(1);

		resolveFetch(
			createRelayRow({
				created_at: '2026-04-05T10:00:04.000Z',
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
