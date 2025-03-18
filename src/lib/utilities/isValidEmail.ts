export function isValidEmail(email: string): boolean {
    // Improved regular expression to match valid email addresses, preventing consecutive dots in the domain part
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;

    // Test the input email against the pattern
    return emailPattern.test(email);
}