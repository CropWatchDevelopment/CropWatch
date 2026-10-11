import type { HexCheck } from '$lib/devices/eui';
import type { NetworkRegion } from '$lib/api/api.dtos';
import { m } from '$lib/paraglide/messages.js';

/** Field error for a DevEUI / JoinEUI / AppKey input, or undefined when fine. */
export function hexFieldError(check: HexCheck, show: boolean): string | undefined {
	const issue = check.issue;
	if (!issue) return undefined;
	switch (issue.kind) {
		case 'invalid_char':
			return m.device_setup_hex_invalid_char({ char: issue.char });
		case 'length':
			return show || issue.got > issue.expected
				? m.device_setup_hex_length({ got: issue.got, expected: issue.expected })
				: undefined;
		case 'empty':
			return show ? m.device_setup_hex_empty() : undefined;
	}
}

export function regionLabel(region: NetworkRegion | null | undefined): string {
	switch (region) {
		case 'au1':
			return m.device_setup_region_au1();
		case 'eu1':
			return m.device_setup_region_eu1();
		case 'nam1':
			return m.device_setup_region_nam1();
		default:
			return m.device_setup_region_as1();
	}
}

/** CropWatch's support inbox (same contact the sign-up flow uses). */
const SUPPORT_EMAIL = 'sayaka@cropwatch.io';

export function supportHref(reference: string | null, devEui: string): string {
	const subject = [m.device_setup_support_subject(), reference, devEui].filter(Boolean).join(' · ');
	return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}
