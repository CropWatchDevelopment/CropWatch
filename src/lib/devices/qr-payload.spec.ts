import { describe, expect, it } from 'vitest';
import { checkAppKey, checkEui, formatHexPairs, stripHex } from './eui';
import { CROPWATCH_LABEL_TYPES, parseDeviceQr } from './qr-payload';

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

	it('ignores underscores and dots as separators too', () => {
		expect(stripHex('00_13.7a-10:00 04\t41df')).toBe('00137A10000441DF');
		expect(checkEui('00_13_7A_10_00_04_41_DF').issue).toBeNull();
	});

	it('reports a bad character before a bad length', () => {
		expect(checkAppKey('XYZ').issue).toEqual({ kind: 'invalid_char', char: 'X' });
		expect(checkAppKey('2B7E151628AED2A6ABF7158809CF4F3C00').issue).toEqual({
			kind: 'length',
			got: 34,
			expected: 32
		});
	});

	it('formats partial and empty values', () => {
		expect(formatHexPairs('00137')).toBe('00 13 7');
		expect(formatHexPairs('')).toBe('');
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

	describe('CropWatch labels', () => {
		it('reads the keys, the DevEUI and the device type', () => {
			expect(
				parseDeviceQr(
					'app:24E124C0002A0001,dev:24E124126E270425,key:2B7E151628AED2A6ABF7158809CF4F3C,type:TH'
				)
			).toEqual({
				devEui: '24E124126E270425',
				joinEui: '24E124C0002A0001',
				appKey: '2B7E151628AED2A6ABF7158809CF4F3C',
				typeCode: 'TH',
				deviceTypeId: 2
			});
		});

		it('marks an AppKey printed as X’s as kept private', () => {
			expect(
				parseDeviceQr(
					'app:24E124C0002A0001,dev:24E124126E270425,key:XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX,type:TH'
				)
			).toEqual({
				devEui: '24E124126E270425',
				joinEui: '24E124C0002A0001',
				appKeyMasked: true,
				typeCode: 'TH',
				deviceTypeId: 2
			});
		});

		it('accepts any case, = and separators inside values', () => {
			expect(
				parseDeviceQr('APP = 24 E1 24 C0 00 2A 00 01; Dev=24e124126e270425; Type = th')
			).toEqual({
				devEui: '24E124126E270425',
				joinEui: '24E124C0002A0001',
				typeCode: 'TH',
				deviceTypeId: 2
			});
		});

		it('keeps a type code this app does not know, without a model', () => {
			expect(parseDeviceQr('dev:24E124126E270425,type:zz')).toEqual({
				devEui: '24E124126E270425',
				typeCode: 'ZZ'
			});
		});

		it('ignores fields it does not know', () => {
			expect(
				parseDeviceQr('app:24E124C0002A0001,dev:24E124126E270425,fw:1.2.3,LOT 42,type:TH')
			).toMatchObject({ devEui: '24E124126E270425', joinEui: '24E124C0002A0001', deviceTypeId: 2 });
		});

		it('never takes the JoinEUI for the DevEUI when the DevEUI is unreadable', () => {
			expect(parseDeviceQr('app:24E124C0002A0001,dev:24E124126E27042,type:TH')).toBeNull();
		});

		it('reads a label without a type code, or with an empty one, without a model', () => {
			expect(parseDeviceQr('app:24E124C0002A0001,dev:24E124126E270425')).toEqual({
				devEui: '24E124126E270425',
				joinEui: '24E124C0002A0001'
			});
			expect(parseDeviceQr('dev:24E124126E270425,type:')).toEqual({ devEui: '24E124126E270425' });
		});

		it('drops keys of the wrong length instead of guessing', () => {
			expect(parseDeviceQr('app:24E124C0002A00,dev:24E124126E270425,key:2B7E15')).toEqual({
				devEui: '24E124126E270425'
			});
		});

		it('never takes another field for the DevEUI when the label has no dev field', () => {
			expect(parseDeviceQr('app:24E124C0002A0001,type:TH')).toBeNull();
			expect(parseDeviceQr('app:24E124C0002A0001,key:2B7E151628AED2A6ABF7158809CF4F3C')).toBeNull();
			expect(
				parseDeviceQr('APP = 24E124C0002A0001; KEY = XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX; Type = th')
			).toBeNull();
			expect(parseDeviceQr('key:2B7E151628AED2A6ABF7158809CF4F3C,type:TH,fw:1.2')).toBeNull();
		});

		it('leaves a single label field to the generic readers', () => {
			expect(parseDeviceQr('dev:24E124126E270425')).toEqual({ devEui: '24E124126E270425' });
			expect(parseDeviceQr('dev:24E124126E270425,fw:1.2.3')).toEqual({
				devEui: '24E124126E270425'
			});
			// A vendor string that happens to carry a `type:` field still reads its DevEUI.
			expect(parseDeviceQr('DevEUI:A84041000181C61A,type:LHT65')).toEqual({
				devEui: 'A84041000181C61A',
				joinEui: undefined,
				appKey: undefined
			});
		});

		it('knows the TH label type', () => {
			expect(CROPWATCH_LABEL_TYPES.get('TH')).toBe(2);
		});
	});
});
