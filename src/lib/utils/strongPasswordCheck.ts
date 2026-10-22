import { m } from '$lib/paraglide/messages.js';

export interface IPasswordValidationResult {
	hasMinLength: boolean;
	hasUpperCase: boolean;
	hasLowerCase: boolean;
	hasNumber: boolean;
	hasSymbol: boolean;
	isValid: boolean;
	/** The unmet requirements, localized (the same wording as the requirement list). */
	errors: string[];
}

/**
 * The password policy, shared by the forms (live requirement list) and their
 * server actions (which enforce it): at least 6 characters, with an uppercase
 * letter, a lowercase letter, a number and a symbol.
 */
export function isStrongPassword(password: string): IPasswordValidationResult {
	const result: IPasswordValidationResult = {
		hasMinLength: password.length >= 6,
		hasUpperCase: /[A-Z]/.test(password),
		hasLowerCase: /[a-z]/.test(password),
		hasNumber: /[0-9]/.test(password),
		hasSymbol: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password),
		isValid: false,
		errors: []
	};

	result.isValid =
		result.hasMinLength &&
		result.hasUpperCase &&
		result.hasLowerCase &&
		result.hasNumber &&
		result.hasSymbol;

	if (!result.hasMinLength) result.errors.push(m.auth_password_requirement_length());
	if (!result.hasUpperCase) result.errors.push(m.auth_password_requirement_uppercase());
	if (!result.hasLowerCase) result.errors.push(m.auth_password_requirement_lowercase());
	if (!result.hasNumber) result.errors.push(m.auth_password_requirement_number());
	if (!result.hasSymbol) result.errors.push(m.auth_password_requirement_symbol());

	return result;
}
