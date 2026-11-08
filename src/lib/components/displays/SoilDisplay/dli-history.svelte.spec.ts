import { describe, expect, it } from 'vitest';
import { ApiError } from '$lib/api/api-error';
import { createMockServices } from '$lib/testing/mock-services';
import { DLI_HISTORY_DAYS, DliHistory } from './dli-history.svelte';

/** Local times, so the test holds in any time zone. */
const at = (day: number, hours: number, minutes = 0) =>
	new Date(2026, 10, day, hours, minutes).toISOString();
/** 500 µmol/m²/s from 10:00 to 11:00 on a November day: 1.8 mol/m². */
const hourOfLight = (day: number) => [
	{ created_at: at(day, 10), ppfd: 500 },
	{ created_at: at(day, 10, 30), ppfd: 500 },
	{ created_at: at(day, 11), ppfd: 500 }
];

function setup() {
	const { telemetry } = createMockServices();
	return { telemetry, history: new DliHistory({ telemetry }) };
}

describe('DliHistory', () => {
	it('loads the complete days before today and totals each one', async () => {
		const { telemetry, history } = setup();
		// Newest first, as the API answers; a row without light is ignored.
		telemetry.getDeviceDataWithinRange.mockResolvedValue({
			data: [
				...hourOfLight(6).reverse(),
				{ created_at: at(5, 9), moisture: 20 },
				...hourOfLight(1)
			],
			total: 7
		} as never);

		await history.load('DEV-1', new Date(2026, 10, 7, 14, 30));

		const end = new Date(2026, 10, 7);
		const start = new Date(2026, 10, 7 - DLI_HISTORY_DAYS);
		expect(telemetry.getDeviceDataWithinRange).toHaveBeenCalledWith(
			'DEV-1',
			{ start: start.toISOString(), end: end.toISOString(), take: 1500 },
			{ suppressNotFoundError: true }
		);
		expect(history.days.map((day) => day.date)).toEqual(['2026-11-01', '2026-11-06']);
		expect(history.days[1].value).toBeCloseTo(1.8, 10);
	});

	it('loads once per device and day', async () => {
		const { telemetry, history } = setup();
		telemetry.getDeviceDataWithinRange.mockResolvedValue([] as never);

		await history.load('DEV-1', new Date(2026, 10, 7, 9));
		await history.load('DEV-1', new Date(2026, 10, 7, 18));
		expect(telemetry.getDeviceDataWithinRange).toHaveBeenCalledTimes(1);

		await history.load('DEV-1', new Date(2026, 10, 8, 0, 5));
		await history.load('DEV-2', new Date(2026, 10, 8, 0, 5));
		expect(telemetry.getDeviceDataWithinRange).toHaveBeenCalledTimes(3);
	});

	it('has no history for a device without readings, and does not ask again that day', async () => {
		const { telemetry, history } = setup();
		telemetry.getDeviceDataWithinRange.mockResolvedValueOnce(hourOfLight(6) as never);
		await history.load('DEV-1', new Date(2026, 10, 7, 9));
		expect(history.days).toHaveLength(1);

		telemetry.getDeviceDataWithinRange.mockRejectedValue(new ApiError(404, 'Not Found', {}));
		await history.load('DEV-2', new Date(2026, 10, 7, 9));
		expect(history.days).toEqual([]);

		await history.load('DEV-2', new Date(2026, 10, 7, 10));
		expect(telemetry.getDeviceDataWithinRange).toHaveBeenCalledTimes(2);
	});

	it('keeps the newer device when an older answer arrives late', async () => {
		const { telemetry, history } = setup();
		let answerFirst: (rows: unknown) => void = () => {};
		telemetry.getDeviceDataWithinRange
			.mockImplementationOnce(() => new Promise((resolve) => (answerFirst = resolve)) as never)
			.mockResolvedValueOnce(hourOfLight(6) as never);

		const first = history.load('DEV-1', new Date(2026, 10, 7, 9));
		await history.load('DEV-2', new Date(2026, 10, 7, 9));
		answerFirst([]);
		await first;

		expect(history.days.map((day) => day.date)).toEqual(['2026-11-06']);
	});

	it('ignores a late failure for a device it moved away from', async () => {
		const { telemetry, history } = setup();
		let failFirst: (error: unknown) => void = () => {};
		telemetry.getDeviceDataWithinRange
			.mockImplementationOnce(() => new Promise((_, reject) => (failFirst = reject)) as never)
			.mockResolvedValueOnce(hourOfLight(6) as never);

		const first = history.load('DEV-1', new Date(2026, 10, 7, 9));
		await history.load('DEV-2', new Date(2026, 10, 7, 9));
		failFirst(new Error('network'));
		await first;

		expect(history.days).toHaveLength(1);
	});

	it('needs a device', async () => {
		const { telemetry, history } = setup();
		await history.load('', new Date(2026, 10, 7, 9));
		expect(telemetry.getDeviceDataWithinRange).not.toHaveBeenCalled();
	});
});
