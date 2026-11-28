import type { RuleActionKind } from './rule-action-types.ts';

/**
 * Re-send: while an alarm stays open, the actions marked "send again" go out
 * again every N reports that still break the alert threshold, at most M times
 * per alarm. The limits are the API's.
 */
export const RESEND_REPORTS_MIN = 3;
export const RESEND_REPORTS_MAX = 1000;
export const RESEND_TIMES_MIN = 1;
export const RESEND_TIMES_MAX = 50;
/** What the form proposes when re-send is switched on. */
export const RESEND_REPORTS_DEFAULT = 3;
export const RESEND_TIMES_DEFAULT = 5;

/** The whole number a field holds, when it lies inside the limits; else null. */
export function readWholeNumber(text: string, min: number, max: number): number | null {
	const trimmed = text.trim();
	if (!/^\d+$/.test(trimmed)) return null;
	const value = Number(trimmed);
	return value >= min && value <= max ? value : null;
}

/** The actions that can be sent again at all: notifications and relays, never a rule switch. */
export function canBeRepeated(kind: RuleActionKind): boolean {
	return kind === 'email' || kind === 'push' || kind === 'relay';
}

/** A notification is sent again unless switched off; a relay only when switched on. */
export function repeatsByDefault(kind: RuleActionKind): boolean {
	return kind === 'email' || kind === 'push';
}

/**
 * Whether a relay action's command (the JSON the relay editor writes) is a
 * timed pulse. Only those are sent again: repeating a fixed on/off command
 * would re-assert a state somebody may have changed by hand.
 */
export function relayIsTimedPulse(recipient: string): boolean {
	try {
		const parsed: unknown = JSON.parse(recipient);
		const action =
			typeof parsed === 'object' && parsed !== null
				? (parsed as { action?: unknown }).action
				: undefined;
		return typeof action === 'string' && action.endsWith('_timed');
	} catch {
		return false;
	}
}
