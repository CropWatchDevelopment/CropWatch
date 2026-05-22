// Dragino LT-22222-L relay downlink payload builders.
//
// Reference: Dragino LT-22222-L LoRa I/O Controller User Manual (firmware v1.7).
//   - 0x05 = timed relay control, 0x03 = permanent relay control.
//   - Timed command layout: [0x05, timeoutBehavior, relayState, time1..time4].
//   - timeoutBehavior 0x01 = return relays to original state after the latch time;
//     0x00 = invert relays after the latch time.
//   - relayState is one hex digit per relay (1 = NC/closed/ON, 0 = NO/open/OFF).
//   - v1.6+ firmware uses a 4-byte big-endian latch time in milliseconds.

export type ActionValue =
	| 'ro1_on_timed'
	| 'ro2_on_timed'
	| 'both_on_timed'
	| 'ro1_on_permanent'
	| 'ro1_off_permanent'
	| 'ro2_on_permanent'
	| 'ro2_off_permanent';

// 4-byte latch time (v1.6+ firmware) supports far more than the old 2-byte limit;
// cap the UI at 24 hours rather than the previous 65-second clamp.
export const MAX_TIMED_RELAY_SECONDS = 86400;

export function bytesToHex(bytes: number[]): string {
	return bytes
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('')
		.toUpperCase();
}

export function hexToBase64(hex: string): string {
	const bytes = hex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) ?? [];
	return btoa(String.fromCharCode(...bytes));
}

export function buildTimedRelayPayload(action: ActionValue, seconds: number): string {
	const command = 0x05;

	// Use 0x01 so the relay returns to its original pre-command state after the
	// latch time. Do NOT use 0x00 here — 0x00 means invert/opposite after timeout.
	const timeoutBehavior = 0x01;

	// The relay-state byte is not binary bit flags. It is Dragino's relay-state
	// command byte, one hex digit per relay (1 = NC/closed/ON, 0 = NO/open/OFF):
	//   0x10 = RO1 ON,  RO2 OFF
	//   0x01 = RO1 OFF, RO2 ON
	//   0x11 = RO1 ON,  RO2 ON
	const relayState =
		action === 'ro1_on_timed' ? 0x10 : action === 'ro2_on_timed' ? 0x01 : 0x11;

	const milliseconds = seconds * 1000;

	if (!Number.isFinite(milliseconds) || milliseconds < 1) {
		throw new Error('Timed relay payload requires a positive latch time.');
	}

	if (milliseconds > 0xffffffff) {
		throw new Error('Timed relay payload exceeds 4-byte latch time limit.');
	}

	// v1.6+ firmware (LT-22222-L v1.7) uses a 4-byte big-endian latch time.
	const time1 = (milliseconds >>> 24) & 0xff;
	const time2 = (milliseconds >>> 16) & 0xff;
	const time3 = (milliseconds >>> 8) & 0xff;
	const time4 = milliseconds & 0xff;

	return bytesToHex([command, timeoutBehavior, relayState, time1, time2, time3, time4]);
}

export function buildPermanentRelayPayload(action: ActionValue): string {
	// Dragino fixed relay command: [0x03, relay1Byte, relay2Byte]
	// 0x00 = OFF, 0x01 = ON, 0x11 = no action on that relay.
	const command = 0x03;
	const NO_ACTION = 0x11;

	let relay1: number;
	let relay2: number;
	switch (action) {
		case 'ro1_on_permanent':
			relay1 = 0x01;
			relay2 = NO_ACTION;
			break;
		case 'ro1_off_permanent':
			relay1 = 0x00;
			relay2 = NO_ACTION;
			break;
		case 'ro2_on_permanent':
			relay1 = NO_ACTION;
			relay2 = 0x01;
			break;
		case 'ro2_off_permanent':
			relay1 = NO_ACTION;
			relay2 = 0x00;
			break;
		default:
			return '';
	}

	return bytesToHex([command, relay1, relay2]);
}

export function buildRelayPayload(action: ActionValue, seconds: number): string {
	if (action.endsWith('_timed')) {
		return buildTimedRelayPayload(action, seconds);
	}
	return buildPermanentRelayPayload(action);
}
