import { describe, expect, it } from 'vitest';
import { signalBars, signalQuality } from './signalStrength';

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
