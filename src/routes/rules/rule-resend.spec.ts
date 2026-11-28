import { describe, expect, it } from 'vitest';
import {
	RESEND_REPORTS_MAX,
	RESEND_REPORTS_MIN,
	canBeRepeated,
	readWholeNumber,
	relayIsTimedPulse,
	repeatsByDefault
} from './rule-resend.ts';

describe('readWholeNumber', () => {
	it('reads a whole number inside the limits', () => {
		expect(readWholeNumber('3', RESEND_REPORTS_MIN, RESEND_REPORTS_MAX)).toBe(3);
		expect(readWholeNumber(' 12 ', RESEND_REPORTS_MIN, RESEND_REPORTS_MAX)).toBe(12);
		expect(readWholeNumber('1000', RESEND_REPORTS_MIN, RESEND_REPORTS_MAX)).toBe(1000);
	});

	it('refuses everything else', () => {
		for (const text of ['', ' ', '2', '1001', '3.5', '-3', '3e2', 'three', '0x10', '4 5']) {
			expect(readWholeNumber(text, RESEND_REPORTS_MIN, RESEND_REPORTS_MAX)).toBeNull();
		}
	});
});

describe('which actions can be sent again', () => {
	it('notifications and relays can; a rule switch never', () => {
		expect((['email', 'push', 'relay'] as const).map(canBeRepeated)).toEqual([true, true, true]);
		expect(
			(['activate_rule', 'deactivate_rule', 'deactivate_self', 'other'] as const).map(canBeRepeated)
		).toEqual([false, false, false, false]);
	});

	it('a notification repeats unless switched off, a relay only when switched on', () => {
		expect(repeatsByDefault('email')).toBe(true);
		expect(repeatsByDefault('push')).toBe(true);
		expect(repeatsByDefault('relay')).toBe(false);
		expect(repeatsByDefault('other')).toBe(false);
	});
});

describe('relayIsTimedPulse', () => {
	it('is true for the timed commands of the relay editor only', () => {
		for (const action of ['ro1_on_timed', 'ro2_on_timed', 'both_on_timed']) {
			expect(relayIsTimedPulse(JSON.stringify({ devEui: 'RELAY', action }))).toBe(true);
		}
		for (const action of ['ro1_on_permanent', 'ro2_off_permanent', '', 7, null]) {
			expect(relayIsTimedPulse(JSON.stringify({ devEui: 'RELAY', action }))).toBe(false);
		}
	});

	it('is false while no command has been chosen', () => {
		expect(relayIsTimedPulse('')).toBe(false);
		expect(relayIsTimedPulse('not json')).toBe(false);
		expect(relayIsTimedPulse('null')).toBe(false);
		expect(relayIsTimedPulse('"ro1_on_timed"')).toBe(false);
		expect(relayIsTimedPulse(JSON.stringify({ devEui: 'RELAY' }))).toBe(false);
	});
});
