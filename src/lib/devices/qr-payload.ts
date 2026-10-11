import { stripHex } from './eui';

/** What a device QR code told us. Keys only when the label carries them. */
export interface DeviceQrPayload {
	devEui: string;
	joinEui?: string;
	appKey?: string;
}

const HEX16 = /^[0-9A-F]{16}$/;
const HEX32 = /^[0-9A-F]{32}$/;
/** A run of exactly 16 hex characters, not part of a longer hex run. */
const STANDALONE_EUI = /(?<![0-9A-Fa-f])[0-9A-Fa-f]{16}(?![0-9A-Fa-f])/;

const hex = (value: string | undefined, pattern: RegExp): string | undefined => {
	const cleaned = stripHex(value ?? '');
	return pattern.test(cleaned) ? cleaned : undefined;
};

/**
 * Reads the device QR formats we meet in the field:
 *  - LoRa Alliance TR005: `LW:D0:<JoinEUI>:<DevEUI>:<ProfileID>[:…]`
 *  - labelled values (RAK, Dragino, Milesight and many OEMs):
 *    `DevEUI:… AppEUI:… AppKey:…`, `EUI=…`, separated by , ; | newline or space
 *  - vendor strings and URLs that contain the DevEUI as a 16-character run
 *    (SenseCAP `<DevEUI>,<code>,…`, `…/devices/<DevEUI>`); the first one wins
 *  - a bare DevEUI, with or without separators
 * Returns null when no DevEUI can be found.
 */
export function parseDeviceQr(raw: string): DeviceQrPayload | null {
	const text = raw.trim();
	if (!text) return null;

	const tr005 = /^LW:D0:([0-9A-Fa-f]{16}):([0-9A-Fa-f]{16})(?::|$)/i.exec(text);
	if (tr005) {
		return { devEui: tr005[2].toUpperCase(), joinEui: tr005[1].toUpperCase() };
	}

	// A labelled value is exactly `bytes` hex pairs, optionally separated by
	// one space, colon or dash, and not followed by more hex — so a following
	// label ("… AppEUI: …") is never swallowed into the value. A label only
	// matches at a word start, so "EUI" never matches inside "JoinEUI".
	const field = (names: string[], bytes: number): string | undefined => {
		const value = `([0-9A-Fa-f]{2}(?:[\\s:-]?[0-9A-Fa-f]{2}){${bytes - 1}})(?![0-9A-Fa-f])`;
		for (const name of names) {
			const match = new RegExp(`(?<![A-Za-z_])${name}\\s*[:=]\\s*${value}`, 'i').exec(text);
			if (match) return match[1];
		}
		return undefined;
	};
	const labelled = hex(
		field(['DevEUI', 'Dev_EUI', 'Dev EUI', 'Device EUI', 'Device_EUI', 'DEUI', 'EUI'], 8),
		HEX16
	);
	if (labelled) {
		return {
			devEui: labelled,
			joinEui: hex(field(['JoinEUI', 'AppEUI', 'App_EUI', 'Join_EUI'], 8), HEX16),
			appKey: hex(field(['AppKey', 'App_Key'], 16), HEX32)
		};
	}

	const standalone = STANDALONE_EUI.exec(text);
	if (standalone) return { devEui: standalone[0].toUpperCase() };

	const bare = hex(text, HEX16);
	return bare ? { devEui: bare } : null;
}
