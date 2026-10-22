import { describe, expect, it } from 'vitest';
import { currentSignal, signalBars, signalQuality } from './signalStrength';

describe('signalBars', () => {
	it('gives full bars for a close, clean link', () => {
		expect(signalBars(-60, 9)).toBe(4);
		expect(signalBars(-100, 0)).toBe(4);
	});

	it('grades each RSSI band when SNR is good', () => {
		expect(signalBars(-105, 8)).toBe(3);
		expect(signalBars(-115, 8)).toBe(2);
		expect(signalBars(-125, 8)).toBe(1);
	});

	it('grades each SNR band when RSSI is good', () => {
		expect(signalBars(-70, -3)).toBe(3);
		expect(signalBars(-70, -8)).toBe(2);
		expect(signalBars(-70, -15)).toBe(1);
	});

	it('takes the weaker of the two metrics', () => {
		// Loud RSSI but buried in noise: SNR decides
		expect(signalBars(-80, -12)).toBe(1);
		// Clean SNR but far away: RSSI decides
		expect(signalBars(-119, 6)).toBe(1);
	});

	it('never shows 0 bars for a packet that was received', () => {
		expect(signalBars(-140, -25)).toBe(1);
	});

	it('grades a single metric when the other is missing', () => {
		expect(signalBars(-105, null)).toBe(3);
		expect(signalBars(undefined, -8)).toBe(2);
	});

	it('returns 0 when there is no usable reading', () => {
		expect(signalBars(null, null)).toBe(0);
		expect(signalBars(undefined, undefined)).toBe(0);
		expect(signalBars(Number.NaN, Number.NaN)).toBe(0);
	});
});

describe('signalQuality', () => {
	it('maps bars to weak / okay / strong', () => {
		expect(signalQuality(0)).toBe('none');
		expect(signalQuality(1)).toBe('weak');
		expect(signalQuality(2)).toBe('okay');
		expect(signalQuality(3)).toBe('strong');
		expect(signalQuality(4)).toBe('strong');
	});
});

describe('currentSignal', () => {
	const at = (hoursAgo: number) =>
		new Date(Date.UTC(2026, 9, 15, 12) - hoursAgo * 3_600_000).toISOString();

	it('picks the gateway with the most bars, then the higher RSSI', () => {
		const weak = { rssi: -119, snr: -12, last_update: at(0) };
		const strong = { rssi: -95, snr: 7, last_update: at(0.5) };
		const strongButQuieter = { rssi: -99, snr: 7, last_update: at(0.2) };
		expect(currentSignal([weak, strongButQuieter, strong])).toBe(strong);
	});

	it('ignores a gateway that last heard the device over a day before its newest reading', () => {
		const current = { rssi: -116, snr: -4, last_update: at(0) };
		const gone = { rssi: -80, snr: 9, last_update: at(25) };
		expect(currentSignal([gone, current])).toBe(current);
	});

	it('keeps the last known signal of a device that went silent', () => {
		const lastHeard = { rssi: -105, snr: 2, last_update: at(24 * 7) };
		const before = { rssi: -112, snr: 1, last_update: at(24 * 7 + 3) };
		expect(currentSignal([before, lastHeard])).toBe(lastHeard);
	});

	it('counts readings without a time', () => {
		const undated = { rssi: -90, snr: 5 };
		expect(currentSignal([{ rssi: -117, snr: 0, last_update: at(0) }, undated])).toBe(undated);
	});

	it('returns null when no gateway heard the device', () => {
		expect(currentSignal([])).toBeNull();
	});

	it('keeps the first of equally graded readings that carry no RSSI', () => {
		const first = { rssi: null, snr: 7, last_update: at(0) };
		const second = { rssi: null, snr: 8, last_update: at(0) };
		expect(currentSignal([first, second])).toBe(first);
	});
});
