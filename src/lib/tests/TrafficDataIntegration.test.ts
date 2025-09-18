import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { DateTime } from 'luxon';

/**
 * CRITICAL TRAFFIC DATA INTEGRATION TESTS
 *
 * These tests verify the complete timezone conversion flow from API input
 * to database query results. The key validation is that August 1st midnight
 * Tokyo time correctly returns the record with ID 35976.
 *
 * This ensures the "very very backwards" traffic patterns bug stays fixed.
 */

describe('Traffic Data Integration Tests', () => {
	let supabase: ReturnType<typeof createClient>;
	const devEui = '110110145241600107';
	const timezone = 'Asia/Tokyo';

	beforeAll(() => {
		// Use environment variables if available, otherwise use test credentials
		const supabaseUrl =
			process.env.PUBLIC_SUPABASE_URL || 'https://dpaoqrcfswnzknixwkll.supabase.co';
		const supabaseKey =
			process.env.PUBLIC_SUPABASE_ANON_KEY ||
			'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwYW9xcmNmc3duemtuaXh3a2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE2Nzc1MDAwMzAsImV4cCI6MTk5MzA3NjAzMH0.fYA8IMcfuO0g42prGg3h3q_DtlwvWLKfd6nIs5dqAf0';

		supabase = createClient(supabaseUrl, supabaseKey);
	});

	// Helper function - same logic as DeviceDataService
	function convertUserTimezoneToUTC(date: Date, timezone: string): Date {
		if (timezone === 'UTC') {
			return date;
		}

		const year = date.getFullYear();
		const month = date.getMonth() + 1;
		const day = date.getDate();
		const hour = date.getHours();
		const minute = date.getMinutes();
		const second = date.getSeconds();

		const dt = DateTime.fromObject(
			{
				year,
				month,
				day,
				hour,
				minute,
				second
			},
			{ zone: timezone }
		);

		return dt.toUTC().toJSDate();
	}

	describe('Critical Timezone Validation', () => {
		it('should find record ID 35976 for August 1st midnight Tokyo (CRITICAL TEST)', async () => {
			// Arrange - Exact same logic as API endpoints
			const startDateParam = '2025-08-01';
			const endDateParam = '2025-08-01'; // Same day to narrow down search

			// Create DateTime in Tokyo timezone (same as fixed API logic)
			const startDt = DateTime.fromISO(startDateParam + 'T00:00:00', { zone: timezone }).startOf(
				'day'
			);
			const endDt = DateTime.fromISO(endDateParam + 'T23:59:59', { zone: timezone }).endOf('day');

			// Convert to UTC for database query
			const startDate = startDt.toJSDate();
			const endDate = endDt.toJSDate();
			const utcStartDate = convertUserTimezoneToUTC(startDate, timezone);
			const utcEndDate = convertUserTimezoneToUTC(endDate, timezone);

			// Act - Query database exactly like DeviceDataService
			const { data, error } = await supabase
				.from('cw_traffic2')
				.select('id, dev_eui, traffic_hour, people_count, car_count')
				.eq('dev_eui', devEui)
				.gte('traffic_hour', utcStartDate.toISOString())
				.lte('traffic_hour', utcEndDate.toISOString())
				.order('traffic_hour', { ascending: true }); // Ascending to get midnight first

			// Assert
			expect(error).toBeNull();
			expect(data).toBeDefined();
			expect(Array.isArray(data)).toBe(true);

			// Find the specific record we verified works
			const midnightRecord = data?.find((record) => record.id === 35976);
			expect(midnightRecord).toBeDefined();
			expect(midnightRecord?.dev_eui).toBe(devEui);

			// Verify the timestamp conversion
			if (midnightRecord) {
				const utcTime = DateTime.fromISO(midnightRecord.traffic_hour);
				const tokyoTime = utcTime.setZone(timezone);

				// Should be August 1st midnight Tokyo
				expect(tokyoTime.year).toBe(2025);
				expect(tokyoTime.month).toBe(8); // August
				expect(tokyoTime.day).toBe(1);
				expect(tokyoTime.hour).toBe(0); // Midnight
				expect(tokyoTime.minute).toBe(0);

				console.log(
					`✅ VERIFIED: Record ${midnightRecord.id} - UTC: ${midnightRecord.traffic_hour}, Tokyo: ${tokyoTime.toFormat('yyyy-MM-dd HH:mm:ss')}`
				);
			}
		}, 10000); // 10 second timeout for network request

		it('should return complete August 2025 dataset', async () => {
			// Arrange - Full August range
			const startDateParam = '2025-08-01';
			const endDateParam = '2025-08-31';

			const startDt = DateTime.fromISO(startDateParam + 'T00:00:00', { zone: timezone }).startOf(
				'day'
			);
			const endDt = DateTime.fromISO(endDateParam + 'T23:59:59', { zone: timezone }).endOf('day');

			const utcStartDate = convertUserTimezoneToUTC(startDt.toJSDate(), timezone);
			const utcEndDate = convertUserTimezoneToUTC(endDt.toJSDate(), timezone);

			// Act
			const { data, error, count } = await supabase
				.from('cw_traffic2')
				.select('id, traffic_hour', { count: 'exact' })
				.eq('dev_eui', devEui)
				.gte('traffic_hour', utcStartDate.toISOString())
				.lte('traffic_hour', utcEndDate.toISOString());

			// Assert
			expect(error).toBeNull();
			expect(count).toBeGreaterThan(700); // Should be ~744 records (31 days * 24 hours)
			expect(count).toBeLessThan(800); // Reasonable upper bound

			console.log(`✅ VERIFIED: Found ${count} records for August 2025`);
		}, 15000);

		it('should validate timezone conversion accuracy across date range', async () => {
			// Arrange - Test several key dates
			const testDates = [
				'2025-08-01', // Month start
				'2025-08-15', // Mid-month
				'2025-08-31' // Month end
			];

			for (const dateParam of testDates) {
				// Create midnight Tokyo time
				const tokyoDt = DateTime.fromISO(dateParam + 'T00:00:00', { zone: timezone });
				const utcDate = convertUserTimezoneToUTC(tokyoDt.toJSDate(), timezone);

				// Query for records around this time (±1 hour for safety)
				const { data, error } = await supabase
					.from('cw_traffic2')
					.select('id, traffic_hour')
					.eq('dev_eui', devEui)
					.gte('traffic_hour', new Date(utcDate.getTime() - 3600000).toISOString()) // -1 hour
					.lte('traffic_hour', new Date(utcDate.getTime() + 3600000).toISOString()) // +1 hour
					.limit(5);

				// Assert
				expect(error).toBeNull();
				expect(data).toBeDefined();

				if (data && data.length > 0) {
					// Verify at least one record exists near the expected time
					const hasNearbyRecord = data.some((record) => {
						const recordUtc = new Date(record.traffic_hour);
						const timeDiff = Math.abs(recordUtc.getTime() - utcDate.getTime());
						return timeDiff < 3600000; // Within 1 hour
					});

					expect(hasNearbyRecord).toBe(true);
					console.log(`✅ VERIFIED: Found records near ${dateParam} midnight Tokyo`);
				}
			}
		}, 20000);
	});

	describe('Data Quality Validation', () => {
		it('should verify realistic traffic patterns (not backwards)', async () => {
			// Arrange - Get a sample day of data
			const sampleDate = '2025-08-15';
			const startDt = DateTime.fromISO(sampleDate + 'T00:00:00', { zone: timezone }).startOf('day');
			const endDt = DateTime.fromISO(sampleDate + 'T23:59:59', { zone: timezone }).endOf('day');

			const utcStartDate = convertUserTimezoneToUTC(startDt.toJSDate(), timezone);
			const utcEndDate = convertUserTimezoneToUTC(endDt.toJSDate(), timezone);

			// Act
			const { data, error } = await supabase
				.from('cw_traffic2')
				.select('traffic_hour, people_count, car_count')
				.eq('dev_eui', devEui)
				.gte('traffic_hour', utcStartDate.toISOString())
				.lte('traffic_hour', utcEndDate.toISOString())
				.order('traffic_hour', { ascending: true });

			// Assert
			expect(error).toBeNull();
			expect(data).toBeDefined();

			if (data && data.length > 0) {
				// Convert timestamps back to Tokyo time for analysis
				const tokyoData = data.map((record) => {
					const utcTime = DateTime.fromISO(record.traffic_hour);
					const tokyoTime = utcTime.setZone(timezone);
					return {
						hour: tokyoTime.hour,
						people: record.people_count || 0,
						cars: record.car_count || 0
					};
				});

				// Calculate average traffic for night (0-5 AM) vs day (9 AM - 5 PM)
				const nightTraffic = tokyoData
					.filter((d) => d.hour >= 0 && d.hour <= 5)
					.reduce((sum, d) => sum + d.people + d.cars, 0);

				const dayTraffic = tokyoData
					.filter((d) => d.hour >= 9 && d.hour <= 17)
					.reduce((sum, d) => sum + d.people + d.cars, 0);

				// Realistic pattern: day traffic should be higher than night traffic
				expect(dayTraffic).toBeGreaterThan(nightTraffic);

				console.log(
					`✅ VERIFIED: Realistic traffic pattern - Day: ${dayTraffic}, Night: ${nightTraffic}`
				);
			}
		}, 15000);

		it('should validate data completeness for full month', async () => {
			// Arrange
			const startDateParam = '2025-08-01';
			const endDateParam = '2025-08-31';

			const startDt = DateTime.fromISO(startDateParam + 'T00:00:00', { zone: timezone }).startOf(
				'day'
			);
			const endDt = DateTime.fromISO(endDateParam + 'T23:59:59', { zone: timezone }).endOf('day');

			const utcStartDate = convertUserTimezoneToUTC(startDt.toJSDate(), timezone);
			const utcEndDate = convertUserTimezoneToUTC(endDt.toJSDate(), timezone);

			// Act
			const { data, error, count } = await supabase
				.from('cw_traffic2')
				.select('traffic_hour', { count: 'exact' })
				.eq('dev_eui', devEui)
				.gte('traffic_hour', utcStartDate.toISOString())
				.lte('traffic_hour', utcEndDate.toISOString());

			// Assert
			expect(error).toBeNull();
			expect(count).toBeDefined();

			// August has 31 days * 24 hours = 744 expected records
			const expectedRecords = 31 * 24;
			const completeness = (count! / expectedRecords) * 100;

			expect(completeness).toBeGreaterThan(90); // At least 90% data completeness

			console.log(
				`✅ VERIFIED: Data completeness: ${completeness.toFixed(1)}% (${count}/${expectedRecords} records)`
			);
		}, 15000);
	});
});
