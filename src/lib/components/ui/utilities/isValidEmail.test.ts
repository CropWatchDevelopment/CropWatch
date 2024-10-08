import { describe, it, expect } from 'vitest';
import { isValidEmail } from './isValidEmail'; // Adjust the path to your actual file

describe('isValidEmail', () => {
  it('should return true for valid email addresses', () => {
    const validEmails = [
      'test@example.com',
      'user.name+tag+sorting@example.com',
      'x@domain.co',
      'example@sub.domain.com',
      '123456@domain.org',
    ];

    validEmails.forEach(email => {
      expect(isValidEmail(email)).toBe(true);
    });
  });

  it('should return false for invalid email addresses', () => {
    const invalidEmails = [
      'plainaddress',
      '@missingusername.com',
      'username@.com',
      'username@domain..com',
      'username@domain.com.',
      'username@domain,com',
      'username@domain@domain.com',
      'username@domain',
    ];

    invalidEmails.forEach(email => {
      expect(isValidEmail(email)).toBe(false);
    });
  });
});
