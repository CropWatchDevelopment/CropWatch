/**
 * LoRaWAN identifier input: DevEUI / JoinEUI (16 hex) and AppKey (32 hex).
 * Users paste these from labels in every shape — spaced pairs, colons,
 * dashes, lower case — so separators are ignored and anything else is
 * reported precisely ("15 of 16 characters", "G isn't valid").
 */

export type HexIssue =
	| { kind: 'empty' }
	| { kind: 'invalid_char'; char: string }
	| { kind: 'length'; got: number; expected: number };

export interface HexCheck {
	/** Upper-case hex with separators removed (may be partial). */
	value: string;
	issue: HexIssue | null;
}

const SEPARATORS = /[\s:\-_.]/g;

export const stripHex = (raw: string): string => raw.replace(SEPARATORS, '').toUpperCase();

export function checkHex(raw: string, expected: 16 | 32): HexCheck {
	const value = stripHex(raw);
	if (!value) return { value, issue: { kind: 'empty' } };
	const bad = value.match(/[^0-9A-F]/);
	if (bad) return { value, issue: { kind: 'invalid_char', char: bad[0] } };
	if (value.length !== expected) {
		return { value, issue: { kind: 'length', got: value.length, expected } };
	}
	return { value, issue: null };
}

export const checkEui = (raw: string): HexCheck => checkHex(raw, 16);
export const checkAppKey = (raw: string): HexCheck => checkHex(raw, 32);

/** `00137A10000441DF` → `00 13 7A 10 00 04 41 DF` for display. */
export const formatHexPairs = (value: string): string =>
	stripHex(value)
		.replace(/(..)(?=.)/g, '$1 ')
		.trim();
