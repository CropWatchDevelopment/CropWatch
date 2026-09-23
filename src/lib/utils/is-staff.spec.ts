import { describe, expect, it } from 'vitest';
import { isStaffEmail } from './is-staff';

describe('isStaffEmail', () => {
	it('accepts cropwatch.io addresses regardless of case and whitespace', () => {
		expect(isStaffEmail('kevin@cropwatch.io')).toBe(true);
		expect(isStaffEmail('  Kevin@CropWatch.IO ')).toBe(true);
	});

	it('rejects other domains, lookalikes, and empty values', () => {
		expect(isStaffEmail('kevin@cropwatch.co.jp')).toBe(false);
		expect(isStaffEmail('kevin@notcropwatch.io')).toBe(false);
		expect(isStaffEmail('kevin@cropwatch.io.evil.com')).toBe(false);
		expect(isStaffEmail('')).toBe(false);
		expect(isStaffEmail(null)).toBe(false);
		expect(isStaffEmail(undefined)).toBe(false);
	});
});
