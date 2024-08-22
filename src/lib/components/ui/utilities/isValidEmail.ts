export function isValidEmail(email: string): boolean {
    // Regular expression pattern to match a valid email address
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Test the input email against the pattern
    return emailPattern.test(email);
}