import { describe, expect, it } from 'vitest';
import {
	buildPermanentRelayPayload,
	buildRelayPayload,
	buildTimedRelayPayload,
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
});

describe('buildPermanentRelayPayload', () => {
	it('builds permanent relay commands with the 0x03 command byte', () => {
		expect(buildPermanentRelayPayload('ro1_on_permanent')).toBe('030111');
		expect(buildPermanentRelayPayload('ro1_off_permanent')).toBe('030011');
		expect(buildPermanentRelayPayload('ro2_on_permanent')).toBe('031101');
		expect(buildPermanentRelayPayload('ro2_off_permanent')).toBe('031100');
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
});
