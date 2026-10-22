import { describe, expect, it } from 'vitest';
import { isRelayNumber, isRelayTargetState } from './relay-types';

describe('isRelayNumber', () => {
	it('accepts relays 1 and 2 only', () => {
		expect(isRelayNumber(1)).toBe(true);
		expect(isRelayNumber(2)).toBe(true);
		for (const value of [0, 3, '1', 1.5, null, undefined]) {
			expect(isRelayNumber(value), String(value)).toBe(false);
		}
	});
});

describe('isRelayTargetState', () => {
	it('accepts on and off only', () => {
		expect(isRelayTargetState('on')).toBe(true);
		expect(isRelayTargetState('off')).toBe(true);
		for (const value of ['ON', 'toggle', '', true, 1, null]) {
			expect(isRelayTargetState(value), String(value)).toBe(false);
		}
	});
});
