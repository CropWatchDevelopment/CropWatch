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

describe('RelayStateManager subscriptions and base data', () => {
	it('sends the snapshot to a subscriber at once and on every change, until it unsubscribes', () => {
		useClockAtSend();
		const { manager } = createManager();
		const listener = vi.fn();

		const unsubscribe = manager.subscribe(listener);
		expect(listener).toHaveBeenCalledTimes(1);
		expect(listener).toHaveBeenLastCalledWith(manager.getSnapshot());

		manager.startVerification(2, 'off', { sentAt: SENT_AT });
		expect(listener).toHaveBeenCalledTimes(2);
		expect(listener.mock.lastCall?.[0].pendingRelayStates[2]).toMatchObject({
			requestedState: 'off'
		});

		unsubscribe();
		manager.startVerification(1, 'on', { sentAt: SENT_AT });
		expect(listener).toHaveBeenCalledTimes(2);

		manager.destroy();
	});

	it('merges new base data into the history, keeping the current state it already has', () => {
		const current = createRelayRow({ id: 'current', created_at: '2026-04-05T10:00:00.000Z' });
		const manager = new RelayStateManager({
			fetchLatestData: vi.fn(async () => null),
			historicalData: [],
			latestData: current,
			fetchOnInit: false
		});

		manager.replaceBaseData({
			historicalData: [createRelayRow({ id: 'older', created_at: '2026-04-05T09:00:00.000Z' })],
			latestData: createRelayRow({ id: 'newer', created_at: '2026-04-05T11:00:00.000Z' })
		});

		const snapshot = manager.getSnapshot();
		expect(snapshot.historicalData.map((row) => row.id)).toEqual(['newer', 'current', 'older']);
		expect(snapshot.latestData?.id).toBe('current');

		manager.destroy();
	});

	it('takes the current state from new base data when it had none', () => {
		const empty = () =>
			new RelayStateManager({
				fetchLatestData: vi.fn(async () => null),
				historicalData: [],
				latestData: null,
				fetchOnInit: false
			});

		const withLatest = empty();
		withLatest.replaceBaseData({ historicalData: [], latestData: createRelayRow({ id: 'base' }) });
		expect(withLatest.getSnapshot().latestData?.id).toBe('base');

		const historyOnly = empty();
		historyOnly.replaceBaseData({
			historicalData: [
				createRelayRow({ id: 'h1', created_at: '2026-04-05T09:00:00.000Z' }),
				createRelayRow({ id: 'h2', created_at: '2026-04-05T09:30:00.000Z' })
			],
			latestData: null
		});
		expect(historyOnly.getSnapshot().latestData?.id).toBe('h2');

		const nothing = empty();
		nothing.replaceBaseData({ historicalData: [{ id: 'no-time' }], latestData: null });
		expect(nothing.getSnapshot()).toMatchObject({ historicalData: [], latestData: null });

		for (const manager of [withLatest, historyOnly, nothing]) manager.destroy();
	});
});

describe('RelayStateManager fetching', () => {
	it('keeps the state when the device has nothing to report', async () => {
		const { manager, fetchLatestData, report } = createManager();
		const before = manager.getSnapshot();
		report(null as never);

		await expect(manager.refreshLatestData()).resolves.toBeNull();
		expect(fetchLatestData).toHaveBeenCalledWith(expect.any(AbortSignal));
		expect(manager.getSnapshot()).toBe(before);

		manager.destroy();
	});

	it('logs a failed fetch, but not an aborted one', async () => {
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		const failure = new Error('Bad Gateway');
		const aborted = Object.assign(new Error('The operation was aborted'), { name: 'AbortError' });
		const fetchLatestData = vi
			.fn<() => Promise<Record<string, unknown> | null>>()
			.mockRejectedValueOnce(failure)
			.mockRejectedValueOnce(aborted);
		const manager = new RelayStateManager({
			fetchLatestData,
			historicalData: [],
			latestData: null,
			fetchOnInit: false
		});

		await expect(manager.refreshLatestData()).resolves.toBeNull();
		expect(consoleError).toHaveBeenCalledWith('[relay-state] fetch failed', { error: failure });

		await expect(manager.refreshLatestData()).resolves.toBeNull();
		expect(consoleError).toHaveBeenCalledTimes(1);

		manager.destroy();
	});

	it('aborts the GET in flight and stops refreshing when destroyed (twice is harmless)', async () => {
		vi.useFakeTimers();
		let signal: AbortSignal | undefined;
		let resolveFetch!: (value: Record<string, unknown> | null) => void;
		const fetchLatestData = vi.fn(
			(abortSignal?: AbortSignal) =>
				new Promise<Record<string, unknown> | null>((resolve) => {
					signal = abortSignal;
					resolveFetch = resolve;
				})
		);
		const manager = new RelayStateManager({
			fetchLatestData,
			historicalData: [],
			latestData: null
		});
		const listener = vi.fn();
		manager.subscribe(listener);
		expect(fetchLatestData).toHaveBeenCalledTimes(1);

		manager.destroy();
		manager.destroy();
		expect(signal?.aborted).toBe(true);

		resolveFetch(createRelayRow({ id: 'late' }));
		await vi.advanceTimersByTimeAsync(RELAY_REFRESH_INTERVAL_MS * 2);

		expect(fetchLatestData).toHaveBeenCalledTimes(1);
		expect(listener).toHaveBeenCalledTimes(1);
	});
});

describe('RelayStateManager verification edge cases', () => {
	it('stamps a command with the current time when the API sent none', () => {
		useClockAtSend();
		const { manager } = createManager();

		manager.startVerification(1, 'on');

		expect(manager.getSnapshot().pendingRelayStates[1]?.sentAt).toBe(SENT_AT);

		manager.destroy();
	});

	it('calls it a mismatch when the first report after an unconfirmed command shows the old state', async () => {
		useClockAtSend();
		const { manager, onVerificationResolved, report } = createManager();

		manager.startVerification(1, 'on', { sentAt: SENT_AT });
		await vi.advanceTimersByTimeAsync(RELAY_CONFIRMATION_WINDOW_MS + RELAY_CHECK_INTERVAL_MS);
		expect(onVerificationResolved).toHaveBeenLastCalledWith(
			expect.objectContaining({ outcome: 'unconfirmed' })
		);

		report(createRelayRow({ created_at: '2026-04-05T10:02:00.000Z', id: 'late', relay_1: false }));
		await manager.refreshLatestData();

		expect(onVerificationResolved).toHaveBeenLastCalledWith({
			outcome: 'mismatch',
			relay: 1,
			row: expect.objectContaining({ id: 'late', relay_1: false }),
			targetState: 'on'
		});
		expect(manager.getSnapshot().pendingRelayStates[1]).toBeUndefined();

		manager.destroy();
	});

	it('ignores reports from after a pulse ended, and lets a long pulse lapse after the window', async () => {
		useClockAtSend();
		const { manager, onVerificationResolved, report } = createManager();

		manager.startVerification(1, 'on', { sentAt: SENT_AT, durationSeconds: 120 });
		// Reverted already: says nothing about whether the pulse started.
		report(
			createRelayRow({ created_at: '2026-04-05T10:02:10.000Z', id: 'reverted', relay_1: false })
		);
		await vi.advanceTimersByTimeAsync(RELAY_CONFIRMATION_WINDOW_MS + RELAY_CHECK_INTERVAL_MS);

		expect(onVerificationResolved).toHaveBeenCalledTimes(1);
		expect(onVerificationResolved).toHaveBeenCalledWith({
			outcome: 'unconfirmed',
			relay: 1,
			row: null,
			targetState: 'on'
		});
		expect(manager.getSnapshot().pendingRelayStates[1]).toMatchObject({ phase: 'awaiting-report' });

		// The relay reverts at 120 s: nothing is left to confirm.
		await vi.advanceTimersByTimeAsync(120_000 - RELAY_CONFIRMATION_WINDOW_MS);
		expect(manager.getSnapshot().pendingRelayStates[1]).toBeUndefined();
		expect(onVerificationResolved).toHaveBeenCalledTimes(1);

		manager.destroy();
	});

	it('does not ask for a status report that would only arrive after the pulse ended', async () => {
		useClockAtSend();
		const requestStatus = vi.fn(async () => {});
		const { manager, onVerificationResolved } = createManager({ requestStatus });

		manager.startVerification(2, 'on', { sentAt: SENT_AT, durationSeconds: 30 });
		await vi.advanceTimersByTimeAsync(RELAY_CONFIRMATION_WINDOW_MS);

		expect(requestStatus).not.toHaveBeenCalled();
		expect(onVerificationResolved).not.toHaveBeenCalled();
		expect(manager.getSnapshot().pendingRelayStates[2]).toBeUndefined();

		manager.destroy();
	});

	it('does not reopen a command that was settled while its status request was failing', async () => {
		useClockAtSend();
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
		let failRequest!: (error: unknown) => void;
		const requestStatus = vi.fn(
			() =>
				new Promise<void>((_, reject) => {
					failRequest = reject;
				})
		);
		const { manager, onVerificationResolved, report } = createManager({ requestStatus });

		manager.startVerification(1, 'on', { sentAt: SENT_AT });
		await vi.advanceTimersByTimeAsync(RELAY_STATUS_REQUEST_AFTER_MS + RELAY_CHECK_INTERVAL_MS);
		expect(requestStatus).toHaveBeenCalledTimes(1);

		report(createRelayRow({ created_at: '2026-04-05T10:00:22.000Z', id: 'answer', relay_1: true }));
		await vi.advanceTimersByTimeAsync(RELAY_CHECK_INTERVAL_MS);
		expect(onVerificationResolved).toHaveBeenCalledWith(
			expect.objectContaining({ outcome: 'confirmed' })
		);

		failRequest(new Error('timeout'));
		await vi.advanceTimersByTimeAsync(0);

		expect(consoleError).toHaveBeenCalledWith('[relay-state] status request failed', {
			error: expect.any(Error)
		});
		expect(manager.getSnapshot().pendingRelayStates[1]).toBeUndefined();

		manager.destroy();
	});

	it('settles nothing more once a listener destroyed the manager mid-report', async () => {
		useClockAtSend();
		const { manager, onVerificationResolved, report } = createManager();
		onVerificationResolved.mockImplementation(() => manager.destroy());

		manager.startVerification(1, 'on', { sentAt: SENT_AT });
		manager.startVerification(2, 'on', { sentAt: SENT_AT });
		report(
			createRelayRow({
				created_at: '2026-04-05T10:00:03.000Z',
				id: 'both',
				relay_1: true,
				relay_2: true
			})
		);
		await vi.advanceTimersByTimeAsync(RELAY_FIRST_CHECK_MS);

		expect(onVerificationResolved).toHaveBeenCalledTimes(1);
		expect(onVerificationResolved).toHaveBeenCalledWith(
			expect.objectContaining({ outcome: 'confirmed', relay: 1 })
		);
	});
});
