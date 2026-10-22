import { describe, expect, it } from 'vitest';
import { m } from '$lib/paraglide/messages.js';
import { isStrongPassword } from './strongPasswordCheck';

// The unmet requirements, in the user's language (the requirement list's wording).
const ERRORS = {
	length: m.auth_password_requirement_length(),
	upper: m.auth_password_requirement_uppercase(),
	lower: m.auth_password_requirement_lowercase(),
	number: m.auth_password_requirement_number(),
	symbol: m.auth_password_requirement_symbol()
};

describe('isStrongPassword', () => {
	it('accepts a password that meets every rule', () => {
		expect(isStrongPassword('Abc12!')).toEqual({
			hasMinLength: true,
			hasUpperCase: true,
			hasLowerCase: true,
			hasNumber: true,
			hasSymbol: true,
			isValid: true,
			errors: []
		});
	});

	it('reports every rule an empty password breaks, in order', () => {
		expect(isStrongPassword('')).toEqual({
			hasMinLength: false,
			hasUpperCase: false,
			hasLowerCase: false,
			hasNumber: false,
			hasSymbol: false,
			isValid: false,
			errors: [ERRORS.length, ERRORS.upper, ERRORS.lower, ERRORS.number, ERRORS.symbol]
		});
	});

	it.each([
		['too short', 'Ab1!', 'hasMinLength', ERRORS.length],
		['no uppercase letter', 'abcd1!', 'hasUpperCase', ERRORS.upper],
		['no lowercase letter', 'ABCD1!', 'hasLowerCase', ERRORS.lower],
		['no number', 'Abcde!', 'hasNumber', ERRORS.number],
		['no symbol', 'Abcde1', 'hasSymbol', ERRORS.symbol]
	] as const)('rejects a password with %s', (_label, password, rule, error) => {
		const result = isStrongPassword(password);

		expect(result[rule]).toBe(false);
		expect(result.isValid).toBe(false);
		expect(result.errors).toEqual([error]);
	});

	it('counts each listed symbol as a symbol', () => {
		for (const symbol of '!@#$%^&*()_+-=[]{};\':"\\|,.<>/?`~') {
			expect(isStrongPassword(`Abc12${symbol}`).hasSymbol).toBe(true);
		}
	});

	it('does not count a space or a non-ASCII character as a symbol', () => {
		expect(isStrongPassword('Abc12 ').hasSymbol).toBe(false);
		expect(isStrongPassword('Abc12あ').hasSymbol).toBe(false);
	});
});
