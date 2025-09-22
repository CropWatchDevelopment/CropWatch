import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DateTime } from 'luxon';
import { DeviceDataService } from '../services/DeviceDataService';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * CRITICAL TIMEZONE CONVERSION TESTS
 *
 * These tests ensure that the timezone conversion logic that fixes the
 * "very very backwards" traffic patterns continues to work correctly.
 *
 * Key requirement: August 1st midnight Tokyo should convert to July 31st 3PM UTC
 * This specific conversion was verified to return record ID 35976 in production.
 */

describe('DeviceDataService - Critical Timezone Conversions', () => {
	let deviceDataService: DeviceDataService;
	let mockSupabase: SupabaseClient;

	beforeEach(() => {
		// Mock Supabase client
		mockSupabase = {
			from: vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: {
								cw_device_type: { data_table_v2: 'cw_traffic2' }
							},
							error: null
						})
					})
				})
			})
		} as any;

		deviceDataService = new DeviceDataService(mockSupabase);
	});

	describe('convertUserTimezoneToUTC', () => {
		it('should handle UTC timezone (no conversion)', () => {
			// Arrange
			const date = new Date('2025-08-01T00:00:00.000Z');
			const timezone = 'UTC';

			// Act
			const result = (deviceDataService as any).convertUserTimezoneToUTC(date, timezone);

			// Assert
			expect(result).toEqual(date);
		});

		it('should convert August 1st midnight Tokyo to July 31st 3PM UTC (CRITICAL TEST)', () => {
			// Arrange - This is the exact conversion that was verified to work
			const tokyoMidnight = new Date(2025, 7, 1, 0, 0, 0, 0); // Month is 0-indexed (7 = August)
			const timezone = 'Asia/Tokyo';

			// Act
			const result = (deviceDataService as any).convertUserTimezoneToUTC(tokyoMidnight, timezone);

			// Assert - Must convert to July 31st 15:00 UTC (3PM)
			expect(result.getUTCFullYear()).toBe(2025);
			expect(result.getUTCMonth()).toBe(6); // 0-indexed (6 = July)
			expect(result.getUTCDate()).toBe(31);
			expect(result.getUTCHours()).toBe(15); // 3 PM UTC
			expect(result.getUTCMinutes()).toBe(0);
			expect(result.getUTCSeconds()).toBe(0);

			// Additional verification using Luxon
			const luxonResult = DateTime.fromJSDate(result, { zone: 'UTC' });
			expect(luxonResult.toISO()).toBe('2025-07-31T15:00:00.000Z');
		});

		it('should convert August 31st 11:59 PM Tokyo correctly', () => {
			// Arrange - End of August in Tokyo
			const tokyoEndOfMonth = new Date(2025, 7, 31, 23, 59, 59, 0);
			const timezone = 'Asia/Tokyo';

			// Act
			const result = (deviceDataService as any).convertUserTimezoneToUTC(tokyoEndOfMonth, timezone);

			// Assert - Should convert to August 31st 14:59 UTC
			expect(result.getUTCFullYear()).toBe(2025);
			expect(result.getUTCMonth()).toBe(7); // 0-indexed (7 = August)
			expect(result.getUTCDate()).toBe(31);
			expect(result.getUTCHours()).toBe(14);
			expect(result.getUTCMinutes()).toBe(59);
		});

		it('should handle New York timezone correctly', () => {
			// Arrange
			const nyMidnight = new Date(2025, 7, 1, 0, 0, 0, 0);
			const timezone = 'America/New_York';

			// Act
			const result = (deviceDataService as any).convertUserTimezoneToUTC(nyMidnight, timezone);

			// Assert - August 1st midnight EST/EDT should convert to 4AM or 5AM UTC (depending on DST)
			expect(result.getUTCFullYear()).toBe(2025);
			expect(result.getUTCMonth()).toBe(7); // Same month
			expect(result.getUTCDate()).toBe(1); // Same day
			expect(result.getUTCHours()).toBeGreaterThanOrEqual(4);
			expect(result.getUTCHours()).toBeLessThanOrEqual(5);
		});

		it('should handle DST transitions correctly', () => {
			// Arrange - Test during a known DST period
			const date = new Date(2025, 5, 15, 12, 0, 0, 0); // June 15th noon
			const timezone = 'America/New_York';

			// Act
			const result = (deviceDataService as any).convertUserTimezoneToUTC(date, timezone);

			// Assert - Should handle DST correctly
			expect(result).toBeInstanceOf(Date);
			expect(result.getUTCHours()).toBeGreaterThan(12); // Should be afternoon UTC
		});

		it('should preserve exact time components during conversion', () => {
			// Arrange
			const date = new Date(2025, 7, 15, 14, 30, 45, 123); // Specific time with milliseconds
			const timezone = 'Asia/Tokyo';

			// Act
			const result = (deviceDataService as any).convertUserTimezoneToUTC(date, timezone);

			// Assert - Minutes, seconds should be preserved (hours will shift)
			expect(result.getUTCMinutes()).toBe(30);
			expect(result.getUTCSeconds()).toBe(45);
		});
	});

	describe('convertUTCToUserTimezone', () => {
		it('should handle UTC timezone (no conversion)', () => {
			// Arrange
			const utcTimestamp = '2025-08-01T15:00:00.000Z';
			const timezone = 'UTC';

			// Act
			const result = (deviceDataService as any).convertUTCToUserTimezone(utcTimestamp, timezone);

			// Assert
			expect(result).toBe(utcTimestamp);
		});

		it('should convert UTC back to Tokyo timezone correctly (CRITICAL TEST)', () => {
			// Arrange - This is the reverse of our critical conversion
			const utcTimestamp = '2025-07-31T15:00:00.000Z'; // July 31st 3PM UTC
			const timezone = 'Asia/Tokyo';

			// Act
			const result = (deviceDataService as any).convertUTCToUserTimezone(utcTimestamp, timezone);

			// Assert - Should convert back to August 1st midnight Tokyo
			const resultDt = DateTime.fromISO(result);
			expect(resultDt.year).toBe(2025);
			expect(resultDt.month).toBe(8); // August
			expect(resultDt.day).toBe(1);
			expect(resultDt.hour).toBe(0); // Midnight
			expect(resultDt.minute).toBe(0);
		});

		it('should handle SQL timestamp format', () => {
			// Arrange - Test SQL format (common in Supabase)
			const sqlTimestamp = '2025-07-31 15:00:00+00';
			const timezone = 'Asia/Tokyo';

			// Act
			const result = (deviceDataService as any).convertUTCToUserTimezone(sqlTimestamp, timezone);

			// Assert - Should parse and convert correctly
			expect(result).toContain('2025-08-01');
			expect(result).toContain('00:00:00');
		});

		it('should handle invalid timestamps gracefully', () => {
			// Arrange
			const invalidTimestamp = 'invalid-date-string';
			const timezone = 'Asia/Tokyo';

			// Act
			const result = (deviceDataService as any).convertUTCToUserTimezone(
				invalidTimestamp,
				timezone
			);

			// Assert - Should return original string when parsing fails
			expect(result).toBe(invalidTimestamp);
		});

		it('should preserve timezone offset in output', () => {
			// Arrange
			const utcTimestamp = '2025-08-01T12:00:00.000Z';
			const timezone = 'Asia/Tokyo';

			// Act
			const result = (deviceDataService as any).convertUTCToUserTimezone(utcTimestamp, timezone);

			// Assert - Should include timezone offset
			expect(result).toContain('+09:00'); // Tokyo is UTC+9
		});
	});

	describe('Round-trip conversion accuracy', () => {
		it('should maintain accuracy through round-trip conversions', () => {
			// Arrange
			const originalDate = new Date(2025, 7, 1, 0, 0, 0, 0); // August 1st midnight
			const timezone = 'Asia/Tokyo';

			// Act - Convert to UTC and back
			const utcDate = (deviceDataService as any).convertUserTimezoneToUTC(originalDate, timezone);
			const backToTimezone = (deviceDataService as any).convertUTCToUserTimezone(
				utcDate.toISOString(),
				timezone
			);

			// Assert - Should get back to original time
			const finalDt = DateTime.fromISO(backToTimezone);
			expect(finalDt.year).toBe(2025);
			expect(finalDt.month).toBe(8); // August
			expect(finalDt.day).toBe(1);
			expect(finalDt.hour).toBe(0); // Midnight
		});

		it('should handle Tokyo timezone round-trips accurately (CRITICAL TEST)', () => {
			// Arrange - Test the specific timezone we verified works
			const testDates = [
				new Date(2025, 7, 1, 0, 0, 0, 0), // August 1st midnight
				new Date(2025, 7, 15, 12, 0, 0, 0), // August 15th noon
				new Date(2025, 7, 31, 23, 59, 59, 0) // August 31st end of day
			];
			const timezone = 'Asia/Tokyo';

			testDates.forEach((testDate) => {
				// Act
				const utcDate = (deviceDataService as any).convertUserTimezoneToUTC(testDate, timezone);
				const backToTimezone = (deviceDataService as any).convertUTCToUserTimezone(
					utcDate.toISOString(),
					timezone
				);

				// Assert
				const finalDt = DateTime.fromISO(backToTimezone);
				expect(finalDt.year).toBe(testDate.getFullYear());
				expect(finalDt.month).toBe(testDate.getMonth() + 1); // Luxon uses 1-based months
				expect(finalDt.day).toBe(testDate.getDate());
				expect(finalDt.hour).toBe(testDate.getHours());
			});
		});
	});

	describe('Edge cases and error handling', () => {
		it('should handle leap year dates correctly', () => {
			// Arrange - February 29th, 2024 (leap year)
			const leapDate = new Date(2024, 1, 29, 12, 0, 0, 0);
			const timezone = 'Asia/Tokyo';

			// Act
			const result = (deviceDataService as any).convertUserTimezoneToUTC(leapDate, timezone);

			// Assert
			expect(result).toBeInstanceOf(Date);
			expect(result.getUTCMonth()).toBe(1); // February
			expect(result.getUTCDate()).toBe(29);
		});

		it('should handle year boundaries correctly', () => {
			// Arrange - New Year's Eve 11:59 PM Tokyo
			const newYearEve = new Date(2024, 11, 31, 23, 59, 59, 0);
			const timezone = 'Asia/Tokyo';

			// Act
			const result = (deviceDataService as any).convertUserTimezoneToUTC(newYearEve, timezone);

			// Assert - Should convert to earlier in the day UTC (still Dec 31st)
			expect(result.getUTCFullYear()).toBe(2024);
			expect(result.getUTCMonth()).toBe(11); // December
			expect(result.getUTCDate()).toBe(31);
		});

		it('should handle various timezone formats', () => {
			// Arrange
			const date = new Date(2025, 7, 1, 12, 0, 0, 0);
			const timezones = [
				'Asia/Tokyo',
				'America/New_York',
				'Europe/London',
				'UTC',
				'Pacific/Auckland'
			];

			timezones.forEach((timezone) => {
				// Act & Assert - Should not throw errors
				expect(() => {
					(deviceDataService as any).convertUserTimezoneToUTC(date, timezone);
				}).not.toThrow();
			});
		});
	});
});
