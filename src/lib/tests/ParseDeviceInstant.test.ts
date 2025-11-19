import { describe, expect, it } from 'vitest';
import { parseDeviceInstant } from '$lib/pdf/parseDeviceInstant';

describe('parseDeviceInstant', () => {
	it('treats offset-less ISO timestamps as local values in the requested zone', () => {
		const dt = parseDeviceInstant('2025-11-08T15:00:00', 'Asia/Tokyo');
		expect(dt.toISO()).toBe('2025-11-08T15:00:00.000+09:00');
	});

	it('respects explicit offsets on the source timestamp', () => {
		const dt = parseDeviceInstant('2025-11-08T15:00:00-05:00', 'Asia/Tokyo');
		expect(dt.toISO()).toBe('2025-11-09T05:00:00.000+09:00');
	});

	it('handles Date objects by treating them as UTC instants', () => {
		const dt = parseDeviceInstant(new Date('2025-11-08T15:00:00Z'), 'Asia/Tokyo');
		expect(dt.toISO()).toBe('2025-11-09T00:00:00.000+09:00');
	});
});
