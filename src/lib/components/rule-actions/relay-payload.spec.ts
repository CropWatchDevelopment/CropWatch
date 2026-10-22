import { describe, expect, it } from 'vitest';
import {
	buildPermanentRelayPayload,
	buildRelayPayload,
	buildTimedRelayPayload,
	bytesToHex,
	hexToBase64
} from './relay-payload';

describe('buildTimedRelayPayload', () => {
	it('builds the tested v1.7 payload for Relay 1 ON for 15 seconds', () => {
		expect(buildTimedRelayPayload('ro1_on_timed', 15)).toBe('05011000003A98');
	});

	it('builds the payload for Relay 2 ON for 15 seconds', () => {
		expect(buildTimedRelayPayload('ro2_on_timed', 15)).toBe('05010100003A98');
	});

	it('builds the payload for both relays ON for 15 seconds', () => {
		expect(buildTimedRelayPayload('both_on_timed', 15)).toBe('05011100003A98');
	});

	it('uses timeoutBehavior 0x01 and never the old bad 0x00 payload', () => {
		const payload = buildTimedRelayPayload('ro1_on_timed', 15);
		expect(payload.slice(2, 4)).toBe('01');
		expect(payload).not.toBe('0500023A98');
	});

	it('emits a 7-byte (4-byte latch time) payload', () => {
		expect(buildTimedRelayPayload('ro1_on_timed', 15)).toHaveLength(14);
	});

	it('handles long latch times beyond the old 2-byte 65-second limit', () => {
		// 24 hours = 86_400_000 ms = 0x05265C00
		expect(buildTimedRelayPayload('ro1_on_timed', 86400)).toBe('05011005265C00');
	});

	it('throws on a non-positive latch time', () => {
		expect(() => buildTimedRelayPayload('ro1_on_timed', 0)).toThrow();
	});

	it('throws on a latch time that is not a number', () => {
		expect(() => buildTimedRelayPayload('ro1_on_timed', Number.NaN)).toThrow(
			'Timed relay payload requires a positive latch time.'
		);
	});

	it('accepts the largest 4-byte latch time and rejects anything longer', () => {
		// 0xffffffff ms is the 4-byte maximum; 4294967.295 s fits, 4294968 s does not.
		expect(buildTimedRelayPayload('ro1_on_timed', 4294967.295)).toBe('050110FFFFFFFF');
		expect(() => buildTimedRelayPayload('ro1_on_timed', 4294968)).toThrow(
			'Timed relay payload exceeds 4-byte latch time limit.'
		);
	});
});

describe('buildPermanentRelayPayload', () => {
	it('builds permanent relay commands with the 0x03 command byte', () => {
		expect(buildPermanentRelayPayload('ro1_on_permanent')).toBe('030111');
		expect(buildPermanentRelayPayload('ro1_off_permanent')).toBe('030011');
		expect(buildPermanentRelayPayload('ro2_on_permanent')).toBe('031101');
		expect(buildPermanentRelayPayload('ro2_off_permanent')).toBe('031100');
	});

	it('has no permanent payload for a timed action', () => {
		expect(buildPermanentRelayPayload('ro1_on_timed')).toBe('');
	});
});

describe('bytesToHex', () => {
	it('writes two upper-case hex digits per byte', () => {
		expect(bytesToHex([0, 10, 255])).toBe('000AFF');
		expect(bytesToHex([])).toBe('');
	});
});

describe('buildRelayPayload', () => {
	it('routes timed actions to the timed builder', () => {
		expect(buildRelayPayload('ro1_on_timed', 15)).toBe('05011000003A98');
	});

	it('routes permanent actions to the permanent builder', () => {
		expect(buildRelayPayload('ro1_on_permanent', 15)).toBe('030111');
	});
});

describe('hexToBase64', () => {
	it('encodes the tested timed payloads to base64', () => {
		expect(hexToBase64('05011000003A98')).toBe('BQEQAAA6mA==');
		expect(hexToBase64('05010100003A98')).toBe('BQEBAAA6mA==');
		expect(hexToBase64('05011100003A98')).toBe('BQERAAA6mA==');
	});

	it('encodes an empty payload as an empty string', () => {
		expect(hexToBase64('')).toBe('');
	});
});
