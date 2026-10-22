import { describe, expect, it } from 'vitest';
import { checkAppKey, checkEui } from '$lib/devices/eui';
import { m } from '$lib/paraglide/messages.js';
import { hexFieldError, regionLabel, supportHref } from './setup-messages';

describe('hexFieldError', () => {
	it('says nothing about a complete value', () => {
		expect(hexFieldError(checkEui('00 13 7A 10 00 04 41 DF'), true)).toBeUndefined();
		expect(hexFieldError(checkAppKey('2B7E151628AED2A6ABF7158809CF4F3C'), true)).toBeUndefined();
	});

	it('names an invalid character straight away', () => {
		expect(hexFieldError(checkEui('00137Z'), false)).toBe(
			m.device_setup_hex_invalid_char({ char: 'Z' })
		);
	});

	it('reports a short value once the user tried to continue, a long one at once', () => {
		expect(hexFieldError(checkEui('0013'), false)).toBeUndefined();
		expect(hexFieldError(checkEui('0013'), true)).toBe(
			m.device_setup_hex_length({ got: 4, expected: 16 })
		);
		expect(hexFieldError(checkEui('00137A10000441DF00'), false)).toBe(
			m.device_setup_hex_length({ got: 18, expected: 16 })
		);
		expect(hexFieldError(checkAppKey('2B7E'), true)).toBe(
			m.device_setup_hex_length({ got: 4, expected: 32 })
		);
	});

	it('reports an empty value only once the user tried to continue', () => {
		expect(hexFieldError(checkEui(' '), false)).toBeUndefined();
		expect(hexFieldError(checkEui(' '), true)).toBe(m.device_setup_hex_empty());
	});
});

describe('regionLabel', () => {
	it('names each network region, defaulting to Asia-Pacific', () => {
		expect(regionLabel('au1')).toBe(m.device_setup_region_au1());
		expect(regionLabel('eu1')).toBe(m.device_setup_region_eu1());
		expect(regionLabel('nam1')).toBe(m.device_setup_region_nam1());
		expect(regionLabel('as1')).toBe(m.device_setup_region_as1());
		expect(regionLabel(null)).toBe(m.device_setup_region_as1());
		expect(regionLabel(undefined)).toBe(m.device_setup_region_as1());
	});
});

describe('supportHref', () => {
	it('mails support with the reference and the DevEUI in the subject', () => {
		expect(supportHref('CW-ABC123', '00137A10000441DF')).toBe(
			`mailto:sayaka@cropwatch.io?subject=${encodeURIComponent(
				`${m.device_setup_support_subject()} · CW-ABC123 · 00137A10000441DF`
			)}`
		);
	});

	it('leaves out what is missing', () => {
		expect(supportHref(null, '00137A10000441DF')).toBe(
			`mailto:sayaka@cropwatch.io?subject=${encodeURIComponent(
				`${m.device_setup_support_subject()} · 00137A10000441DF`
			)}`
		);
		expect(supportHref('', '')).toBe(
			`mailto:sayaka@cropwatch.io?subject=${encodeURIComponent(m.device_setup_support_subject())}`
		);
	});
});
