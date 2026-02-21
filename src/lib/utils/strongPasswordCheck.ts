
export interface IPasswordValidationResult {
    hasMinLength: boolean;
    hasUpperCase: boolean;
    hasLowerCase: boolean;
    hasNumber: boolean;
    hasSymbol: boolean;
    isValid: boolean;
    errors: string[];
}

// Password must be at least 6 characters long, and contain at least one uppercase letter, one lowercase letter, one number, and one symbol.
export function isStrongPassword(password: string): IPasswordValidationResult {
    const result: IPasswordValidationResult = {
        hasMinLength: password.length >= 6,
        hasUpperCase: /[A-Z]/.test(password),
        hasLowerCase: /[a-z]/.test(password),
        hasNumber: /[0-9]/.test(password),
        hasSymbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password),
        isValid: false,
        errors: []
    };

    result.isValid = result.hasMinLength && result.hasUpperCase && result.hasLowerCase && result.hasNumber && result.hasSymbol;

    if (!result.hasMinLength) {
        result.errors.push('Password must be at least 6 characters long.');
    }
    if (!result.hasUpperCase) {
        result.errors.push('Password must contain at least one uppercase letter.');
    }
    if (!result.hasLowerCase) {
        result.errors.push('Password must contain at least one lowercase letter.');
    }
    if (!result.hasNumber) {
        result.errors.push('Password must contain at least one number.');
    }
    if (!result.hasSymbol) {
        result.errors.push('Password must contain at least one symbol.');
    }

    return result;
}
