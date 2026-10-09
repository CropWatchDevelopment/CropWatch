import { m } from '$lib/paraglide/messages.js';
import type { RelayTargetState } from './relay-types';

/**
 * The icon shown with every displayed relay state: relay page chips and
 * history, dashboard cards and table, and command toasts. The ON/OFF word is
 * always kept next to it — red/green alone is unreadable for colour-blind users.
 */
export const RELAY_STATE_ICONS: Readonly<Record<RelayTargetState, string>> = {
	on: '🟢',
	off: '🔴'
};

/** "🟢 ON" / "🔴 OFF" */
export function relayStateLabel(on: boolean): string {
	return on
		? `${RELAY_STATE_ICONS.on} ${m.display_on()}`
		: `${RELAY_STATE_ICONS.off} ${m.display_off()}`;
}
