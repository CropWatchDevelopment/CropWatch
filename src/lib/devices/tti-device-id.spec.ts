import { describe, expect, it } from 'vitest';
import {
	isValidTtiDeviceId,
	normalizeTtiDeviceId,
	TTI_DEVICE_ID_MAX_LENGTH,
	TTI_DEVICE_ID_PATTERN
} from './tti-device-id';

describe('normalizeTtiDeviceId', () => {
	it('trims and lower-cases', () => {
		expect(normalizeTtiDeviceId('  Eui-00137A10000441DF ')).toBe('eui-00137a10000441df');
	});

	it('turns a missing value into an empty id', () => {
		expect(normalizeTtiDeviceId(null)).toBe('');
		expect(normalizeTtiDeviceId(undefined)).toBe('');
	});
});

describe('isValidTtiDeviceId', () => {
	it('accepts lower-case letters, digits and inner dashes', () => {
		expect(isValidTtiDeviceId('a')).toBe(true);
		expect(isValidTtiDeviceId('eui-00137a10000441df')).toBe(true);
		expect(isValidTtiDeviceId('cw-air-thvd-01')).toBe(true);
	});

	it('rejects an empty id and one longer than 36 characters', () => {
		expect(TTI_DEVICE_ID_MAX_LENGTH).toBe(36);
		expect(isValidTtiDeviceId('')).toBe(false);
		expect(isValidTtiDeviceId('a'.repeat(36))).toBe(true);
		expect(isValidTtiDeviceId('a'.repeat(37))).toBe(false);
	});

	it('rejects upper case, other characters and dashes at either end', () => {
		for (const id of ['Device', 'dev_1', 'dev.1', 'dev 1', '-dev', 'dev-', '-']) {
			expect(isValidTtiDeviceId(id), id).toBe(false);
		}
		expect(TTI_DEVICE_ID_PATTERN.test('dev--1')).toBe(true);
	});
});
