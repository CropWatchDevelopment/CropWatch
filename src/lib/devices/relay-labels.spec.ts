import { describe, expect, it } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import { relayStateLabel } from './relay-labels';

describe('relayStateLabel', () => {
	it('pairs the green dot with ON and the red dot with OFF', () => {
		expect(relayStateLabel(true)).toBe(`🟢 ${m.display_on()}`);
		expect(relayStateLabel(false)).toBe(`🔴 ${m.display_off()}`);
	});
});
