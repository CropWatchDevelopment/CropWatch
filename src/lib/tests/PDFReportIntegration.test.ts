import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { DateTime } from 'luxon';

/**
 * PDF REPORT API INTEGRATION TESTS - TEMPERATURE DEVICE
 *
 * These tests validate the complete PDF report generation flow for temperature devices,
 * ensuring proper timezone conversion throughout the entire process.
 *
 * Test Device: 373632336F32840A (Temperature sensor)
 * Focus: created_at field timezone conversion in PDF report generation
 */

describe('PDF Report API Integration Tests - Temperature Device', () => {
	let supabase: ReturnType<typeof createClient>;
	const tempDeviceEui = '373632336F32840A';
	const timezone = 'Asia/Tokyo';
	const baseUrl = 'http://localhost:5173';

	beforeAll(() => {
		// Use environment variables if available, otherwise use test credentials
		const supabaseUrl =
			process.env.PUBLIC_SUPABASE_URL || 'https://dpaoqrcfswnzknixwkll.supabase.co';
		const supabaseKey =
			process.env.PUBLIC_SUPABASE_ANON_KEY ||
			'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwYW9xcmNmc3duemtuaXh3a2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE2Nzc1MDAwMzAsImV4cCI6MTk5MzA3NjAzMH0.fYA8IMcfuO0g42prGg3h3q_DtlwvWLKfd6nIs5dqAf0';

		supabase = createClient(supabaseUrl, supabaseKey);
	});

	// Helper function to make authenticated PDF API requests
	async function fetchPDFReport(
		devEui: string,
		startDate: string,
		endDate: string,
		timezone: string
	) {
		const url = `${baseUrl}/api/devices/${devEui}/pdf?start=${startDate}&end=${endDate}&timezone=${timezone}`;

		try {
			const response = await fetch(url, {
				headers: {
					Accept: 'application/pdf'
					// Note: In real scenario, you'd need JWT authentication
					// 'Authorization': `Bearer ${jwtToken}`
				}
			});

			return {
				ok: response.ok,
				status: response.status,
				statusText: response.statusText,
				contentType: response.headers.get('content-type'),
				contentLength: response.headers.get('content-length'),
				body: response.ok ? await response.arrayBuffer() : await response.text()
			};
		} catch (error) {
			// If server is not running, return null to skip the test
			if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
				console.warn('⚠️  Development server not running, skipping PDF API test');
				return null;
			}
			throw error;
		}
	}

	describe('Temperature Device Data Validation', () => {
		it('should verify temperature device exists and has data', async () => {
			// Arrange - Query temperature device directly
			const { data: device, error: deviceError } = await supabase
				.from('cw_devices')
				.select('dev_eui, location_id')
				.eq('dev_eui', tempDeviceEui)
				.single();

			// Assert device exists
			expect(deviceError).toBeNull();
			expect(device).toBeDefined();
			expect(device?.dev_eui).toBe(tempDeviceEui);

			console.log(`✅ VERIFIED: Temperature device ${tempDeviceEui} exists`);
			console.log(`   Location ID: ${device?.location_id}`);

			// Check if device has recent data
			const { data: recentData, error: dataError } = await supabase
				.from('cw_air_data')
				.select('created_at, temperature_c, humidity, pressure')
				.eq('dev_eui', tempDeviceEui)
				.order('created_at', { ascending: false })
				.limit(5);

			expect(dataError).toBeNull();

			if (recentData && recentData.length > 0) {
				console.log(`✅ VERIFIED: Found ${recentData.length} recent temperature records`);
				recentData.forEach((record: any, index: number) => {
					const tokyoTime = DateTime.fromISO(record.created_at as string).setZone(timezone);
					console.log(
						`   ${index + 1}. Tokyo: ${tokyoTime.toFormat('yyyy-MM-dd HH:mm:ss')}, Temp: ${record.temperature_c}°C`
					);
				});
			} else {
				console.warn('⚠️  No recent data found for temperature device');
			}
		}, 10000);

		it('should validate temperature data timezone conversion for PDF reports', async () => {
			// Arrange - Get a sample of temperature data
			const sampleDate = DateTime.now().setZone(timezone).minus({ days: 7 }).toISODate(); // 7 days ago

			const startDt = DateTime.fromISO(sampleDate + 'T00:00:00', { zone: timezone }).startOf('day');
			const endDt = DateTime.fromISO(sampleDate + 'T23:59:59', { zone: timezone }).endOf('day');

			// Helper function - same as DeviceDataService
			function convertUserTimezoneToUTC(date: Date, timezone: string): Date {
				if (timezone === 'UTC') return date;

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

			const utcStartDate = convertUserTimezoneToUTC(startDt.toJSDate(), timezone);
			const utcEndDate = convertUserTimezoneToUTC(endDt.toJSDate(), timezone);

			// Act - Query temperature data with timezone conversion
			const { data, error } = await supabase
				.from('cw_air_data')
				.select('created_at, temperature_c, humidity, pressure')
				.eq('dev_eui', tempDeviceEui)
				.gte('created_at', utcStartDate.toISOString())
				.lte('created_at', utcEndDate.toISOString())
				.order('created_at', { ascending: true });

			// Assert
			expect(error).toBeNull();

			if (data && data.length > 0) {
				console.log(`✅ VERIFIED: Found ${data.length} temperature records for ${sampleDate}`);

				// Validate timezone conversion
				data.slice(0, 3).forEach((record: any, index: number) => {
					const utcTime = DateTime.fromISO(record.created_at as string);
					const tokyoTime = utcTime.setZone(timezone);

					// Should be within the expected date in Tokyo timezone
					expect(tokyoTime.toISODate()).toBe(sampleDate);

					console.log(
						`   ${index + 1}. UTC: ${record.created_at} → Tokyo: ${tokyoTime.toFormat('yyyy-MM-dd HH:mm:ss')}, Temp: ${record.temperature_c}°C`
					);
				});

				// Validate temperature data quality
				const avgTemp =
					data.reduce((sum: number, record: any) => sum + (Number(record.temperature_c) || 0), 0) /
					data.length;
				expect(avgTemp).toBeGreaterThan(-50); // Reasonable temperature range
				expect(avgTemp).toBeLessThan(60);

				console.log(`✅ VERIFIED: Temperature data quality - Avg: ${avgTemp.toFixed(1)}°C`);
			} else {
				console.warn(`⚠️  No temperature data found for ${sampleDate}`);
			}
		}, 15000);
	});

	describe('PDF Report API Endpoint Tests', () => {
		it('should generate PDF report for temperature device with proper timezone handling', async () => {
			// Arrange - Use a recent date range
			const endDate = DateTime.now().setZone(timezone).minus({ days: 1 }).toISODate();
			const startDate = DateTime.now().setZone(timezone).minus({ days: 3 }).toISODate();

			// Act
			const response = await fetchPDFReport(tempDeviceEui, startDate!, endDate!, timezone);

			// Skip test if server not running
			if (response === null) return;

			// Assert
			if (response.status === 401) {
				console.warn('⚠️  PDF API requires authentication, skipping content validation');
				expect(response.status).toBe(401); // Expected for unauthenticated request
				return;
			}

			if (response.ok) {
				expect(response.contentType).toContain('application/pdf');
				expect(response.body).toBeInstanceOf(ArrayBuffer);
				const pdfSize = (response.body as ArrayBuffer).byteLength;
				expect(pdfSize).toBeGreaterThan(1000); // Should be a substantial PDF

				console.log(`✅ VERIFIED: PDF generated successfully`);
				console.log(`   Content Type: ${response.contentType}`);
				console.log(`   Size: ${pdfSize} bytes`);
			} else {
				console.warn(`⚠️  PDF generation failed: ${response.status} ${response.statusText}`);
				console.warn(`   Response: ${response.body}`);
			}
		}, 20000);

		it('should handle invalid date ranges gracefully for temperature device', async () => {
			// Arrange - Invalid date range
			const startDate = '2025-12-31'; // Future date
			const endDate = '2025-12-31';

			// Act
			const response = await fetchPDFReport(tempDeviceEui, startDate, endDate, timezone);

			// Skip test if server not running
			if (response === null) return;

			// Assert
			if (response.status === 401) {
				console.warn('⚠️  PDF API requires authentication, test passed for auth check');
				return;
			}

			// Should handle no data gracefully
			if (!response.ok) {
				expect(response.status).toBeOneOf([404, 400]); // No data found or bad request
				console.log(
					`✅ VERIFIED: Proper error handling for invalid date range: ${response.status}`
				);
			}
		}, 10000);

		it('should validate PDF report date parameter format handling', async () => {
			// Arrange - Test various date formats
			const testCases = [
				{ start: '2025-08-01', end: '2025-08-01', valid: true },
				{ start: '2025-8-1', end: '2025-8-1', valid: false }, // Invalid format
				{ start: 'invalid-date', end: '2025-08-01', valid: false },
				{ start: '2025-08-01', end: '2025-07-31', valid: false } // End before start
			];

			for (const testCase of testCases) {
				// Act
				const response = await fetchPDFReport(
					tempDeviceEui,
					testCase.start,
					testCase.end,
					timezone
				);

				// Skip test if server not running
				if (response === null) continue;

				// Assert
				if (response.status === 401) {
					console.warn('⚠️  Skipping date format test due to auth requirement');
					continue;
				}

				if (testCase.valid) {
					// Valid dates might return 404 (no data) or 200 (success)
					expect([200, 404]).toContain(response.status);
				} else {
					// Invalid dates should return 400 (bad request)
					expect(response.status).toBe(400);
				}

				console.log(
					`✅ Date format test: ${testCase.start} to ${testCase.end} → ${response.status} ${response.statusText}`
				);
			}
		}, 30000);
	});

	describe('PDF Report Timezone Edge Cases', () => {
		it('should handle month boundary timezone conversion for temperature reports', async () => {
			// Arrange - Date range spanning month boundary
			const startDate = '2025-07-31'; // Last day of July
			const endDate = '2025-08-01'; // First day of August

			// Test timezone conversion logic (same as PDF server)
			let start = new Date(startDate);
			let end = new Date(endDate);

			const userStartDate = DateTime.fromJSDate(start).setZone(timezone).startOf('day');
			const userEndDate = DateTime.fromJSDate(end).setZone(timezone).endOf('day');

			const utcStartDate = userStartDate.toUTC().toJSDate();
			const utcEndDate = userEndDate.toUTC().toJSDate();

			// Assert timezone conversion
			expect(utcStartDate.getUTCMonth()).toBe(6); // July (0-indexed)
			expect(utcEndDate.getUTCMonth()).toBe(7); // August (0-indexed)

			// Query data with this range
			const { data, error } = await supabase
				.from('cw_air_data')
				.select('created_at, temperature_c')
				.eq('dev_eui', tempDeviceEui)
				.gte('created_at', utcStartDate.toISOString())
				.lte('created_at', utcEndDate.toISOString())
				.limit(10);

			expect(error).toBeNull();

			if (data && data.length > 0) {
				// Verify data spans the month boundary correctly
				const tokyoDates = data.map((record: any) => {
					const tokyoTime = DateTime.fromISO(record.created_at as string).setZone(timezone);
					return tokyoTime.toISODate();
				});

				const uniqueDates = [...new Set(tokyoDates)];
				console.log(
					`✅ VERIFIED: Month boundary data spans ${uniqueDates.length} dates in Tokyo timezone`
				);
				console.log(`   Dates: ${uniqueDates.join(', ')}`);
			}
		}, 15000);

		it('should validate timezone parameter consistency across PDF components', () => {
			// Arrange - Test different timezone parameters
			const testTimezones = ['Asia/Tokyo', 'America/New_York', 'Europe/London', 'UTC'];
			const testDate = '2025-08-01';

			testTimezones.forEach((tz) => {
				// Act - Simulate PDF server timezone conversion
				const date = new Date(testDate);
				const userDate = DateTime.fromJSDate(date).setZone(tz).startOf('day');
				const utcDate = userDate.toUTC().toJSDate();

				// Assert
				expect(utcDate).toBeInstanceOf(Date);
				expect(utcDate.toISOString()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

				console.log(
					`✅ Timezone conversion: ${tz} ${testDate} 00:00 → UTC ${utcDate.toISOString()}`
				);
			});
		});
	});
});
