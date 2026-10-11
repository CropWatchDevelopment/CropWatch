import { describe, expect, it } from 'vitest';
import { checkAppKey, checkEui, formatHexPairs } from './eui';
import { parseDeviceQr } from './qr-payload';

describe('checkEui', () => {
	it('accepts labels with separators and lower case', () => {
		expect(checkEui('00:13:7a:10:00:04:41:df')).toEqual({
			value: '00137A10000441DF',
			issue: null
		});
		expect(checkEui('00 13 7A 10-00 04 41 DF').issue).toBeNull();
	});

	it('reports the length it got', () => {
		expect(checkEui('00137A10000441D').issue).toEqual({ kind: 'length', got: 15, expected: 16 });
	});

	it('reports the first invalid character', () => {
		expect(checkEui('00137A10000441DG').issue).toEqual({ kind: 'invalid_char', char: 'G' });
	});

	it('reports empty input', () => {
		expect(checkEui('  ').issue).toEqual({ kind: 'empty' });
	});

	it('checks AppKeys at 32 characters', () => {
		expect(checkAppKey('2B7E 1516 28AE D2A6 ABF7 1588 09CF 4F3C').issue).toBeNull();
		expect(checkAppKey('2B7E151628AED2A6').issue).toMatchObject({ kind: 'length', got: 16 });
	});

	it('formats pairs for display', () => {
		expect(formatHexPairs('00137a10000441df')).toBe('00 13 7A 10 00 04 41 DF');
	});
});

describe('parseDeviceQr', () => {
	it('reads LoRa Alliance TR005', () => {
		expect(parseDeviceQr('LW:D0:70B3D57ED0000000:00137A10000441DF:A1B2C3D4:O1234')).toEqual({
			joinEui: '70B3D57ED0000000',
			devEui: '00137A10000441DF'
		});
	});

	it('reads key/value labels including the AppKey', () => {
		expect(
			parseDeviceQr(
				'DevEUI: AC1F09FFFE16AFFA\nAppEUI: AC1F09FFF9153172\nAppKey: 2B7E151628AED2A6ABF7158809CF4F3C'
			)
		).toEqual({
			devEui: 'AC1F09FFFE16AFFA',
			joinEui: 'AC1F09FFF9153172',
			appKey: '2B7E151628AED2A6ABF7158809CF4F3C'
		});
	});

	it('reads labels separated by spaces without swallowing the next label', () => {
		expect(
			parseDeviceQr(
				'DevEUI:AC1F09FFFE16AFFA AppEUI:AC1F09FFF9153172 AppKey:2B7E151628AED2A6ABF7158809CF4F3C'
			)
		).toEqual({
			devEui: 'AC1F09FFFE16AFFA',
			joinEui: 'AC1F09FFF9153172',
			appKey: '2B7E151628AED2A6ABF7158809CF4F3C'
		});
		expect(parseDeviceQr('DevEUI: 00 13 7A 10 00 04 41 DF AppKey: AB')).toEqual({
			devEui: '00137A10000441DF',
			joinEui: undefined,
			appKey: undefined
		});
	});

	it('rejects a labelled value that is too long instead of truncating it', () => {
		expect(parseDeviceQr('DevEUI: 00137A10000441DF00')).toBeNull();
	});

	it('reads vendor strings that lead with the DevEUI', () => {
		expect(parseDeviceQr('2CF7F1C04430017F,3E2A9C1D,S2103')).toEqual({
			devEui: '2CF7F1C04430017F'
		});
	});

	it('reads a bare DevEUI with separators', () => {
		expect(parseDeviceQr('00-13-7A-10-00-04-41-DF')).toEqual({ devEui: '00137A10000441DF' });
	});

	it('reads an EUI label without confusing it with JoinEUI', () => {
		expect(
			parseDeviceQr('JoinEUI:70B3D57ED0000000;EUI:24E124136C330016;SN:6136D17483950016')
		).toEqual({
			devEui: '24E124136C330016',
			joinEui: '70B3D57ED0000000',
			appKey: undefined
		});
	});

	it('finds the DevEUI inside URLs and other vendor strings', () => {
		expect(parseDeviceQr('https://example.com/devices/2cf7f1c04430017f?code=AB12')).toEqual({
			devEui: '2CF7F1C04430017F'
		});
		expect(parseDeviceQr('2CF7F1C04430017F:6C1D8AD8B65A2D63')).toEqual({
			devEui: '2CF7F1C04430017F'
		});
	});

	it('never takes part of a longer hex run as the DevEUI', () => {
		expect(parseDeviceQr('2B7E151628AED2A6ABF7158809CF4F3C')).toBeNull();
	});

	it('returns null for unrelated codes', () => {
		expect(parseDeviceQr('https://cropwatch.io')).toBeNull();
		expect(parseDeviceQr('')).toBeNull();
	});
});
