/**
 * LoRaWAN link quality → 0–4 signal bars.
 *
 * RSSI and SNR measure different things, so each is graded on its own and the
 * link gets the WORSE of the two grades:
 *
 * - RSSI (dBm) is total received power, signal + noise. A strong RSSI on its
 *   own can be misleading: next to a noise source (a motor, an inverter) the
 *   receiver still reads a high RSSI even when most of that power is noise.
 * - SNR (dB) is how far the signal sits above the noise floor. LoRa can decode
 *   below the noise floor (negative SNR), down to a limit set by the spreading
 *   factor: about -7.5 dB at SF7, then 2.5 dB lower per SF step, down to -20 dB
 *   at SF12 (Semtech AN1200.22). The SF is not in the uplink metadata we store,
 *   so the SNR grade is a fixed margin against those floors.
 *
 * Thresholds follow common LoRaWAN field guidance (Semtech, Robustel,
 * Sensing Labs): RSSI > -115 dBm with SNR > -7 dB is a reliable link, and
 * RSSI ≤ -120 dBm or SNR ≤ -13 dB is at the edge of range.
 */

export type SignalBars = 0 | 1 | 2 | 3 | 4;
export type SignalQuality = 'none' | 'weak' | 'okay' | 'strong';

/** Minimum RSSI (dBm) for 4, 3 and 2 bars. Anything lower that was still received is 1 bar. */
const RSSI_STEPS = [-100, -110, -118] as const;

/**
 * Minimum SNR (dB) for 4, 3 and 2 bars.
 *  0 dB: signal is above the noise floor.
 * -5 dB: still 2.5 dB of margin over the SF7 decode floor.
 * -10 dB: about the SF8 floor; lower only decodes at SF9+, close to the limit.
 */
const SNR_STEPS = [0, -5, -10] as const;

function grade(value: number, steps: readonly [number, number, number]): SignalBars {
	if (value >= steps[0]) return 4;
	if (value >= steps[1]) return 3;
	if (value >= steps[2]) return 2;
	return 1;
}

const isReading = (value: number | null | undefined): value is number =>
	typeof value === 'number' && Number.isFinite(value);

/**
 * Number of bars for a reading. 0 means there is no usable reading. A packet
 * that arrived always gets at least 1 bar. When only one metric is present it
 * is graded alone.
 */
export function signalBars(
	rssi: number | null | undefined,
	snr: number | null | undefined
): SignalBars {
	const grades: SignalBars[] = [];
	if (isReading(rssi)) grades.push(grade(rssi, RSSI_STEPS));
	if (isReading(snr)) grades.push(grade(snr, SNR_STEPS));
	if (grades.length === 0) return 0;
	return Math.min(...grades) as SignalBars;
}

/** 1 bar = weak (red), 2 = okay (yellow), 3–4 = strong (green). */
export function signalQuality(bars: SignalBars): SignalQuality {
	if (bars === 0) return 'none';
	if (bars === 1) return 'weak';
	if (bars === 2) return 'okay';
	return 'strong';
}

/** One gateway's reading of a device: RSSI/SNR as of when that gateway last heard it. */
export interface SignalReading {
	rssi: number | null;
	snr: number | null;
	last_update?: string | null;
}

/**
 * Readings this much older than a device's newest one come from gateways that
 * no longer hear it (the gateway went offline, or the device moved).
 */
export const CURRENT_SIGNAL_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * A device's current link. An uplink is delivered by whichever gateway heard it
 * best, so the link is the strongest gateway (most bars, then higher RSSI)
 * among those that heard the device within a day of its newest reading. The
 * day is counted back from that reading, not from now, so a device that went
 * silent keeps its last known signal. Null when no gateway heard it.
 */
export function currentSignal<T extends SignalReading>(readings: readonly T[]): T | null {
	const time = (reading: T) => (reading.last_update ? Date.parse(reading.last_update) : NaN);
	const newest = Math.max(...readings.map(time).filter(Number.isFinite));
	let best: T | null = null;
	for (const reading of readings) {
		// Undated readings always count (NaN is never > the window).
		if (newest - time(reading) > CURRENT_SIGNAL_WINDOW_MS) continue;
		const diff = best ? signalBars(reading.rssi, reading.snr) - signalBars(best.rssi, best.snr) : 1;
		if (diff > 0 || (diff === 0 && (reading.rssi ?? -Infinity) > (best?.rssi ?? -Infinity))) {
			best = reading;
		}
	}
	return best;
}
