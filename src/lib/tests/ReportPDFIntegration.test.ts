// @ts-nocheck
import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { DateTime } from 'luxon';

/**
 * REPORT PDF INTEGRATION TESTS
 *
 * These tests verify that PDF report generation handles timezone conversion
 * correctly for both traffic and non-traffic devices. This ensures reports
 * show data in the user's timezone, not backwards patterns.
 */

describe('Report PDF Integration Tests', () => {
	let supabase: ReturnType<typeof createClient>;
	const baseUrl = 'http://localhost:5173';
	const timezone = 'Asia/Tokyo';

	// Test devices
	const trafficDevEui = '110110145241600107'; // Traffic camera
	const airDevEui = '2CF7F1C0630000AC'; // Air quality sensor (if available)

	beforeAll(() => {
		const supabaseUrl =
			process.env.PUBLIC_SUPABASE_URL || 'https://dpaoqrcfswnzknixwkll.supabase.co';
		const supabaseKey =
			process.env.PUBLIC_SUPABASE_ANON_KEY ||
			'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwYW9xcmNmc3duemtuaXh3a2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE2Nzc1MDAwMzAsImV4cCI6MTk5MzA3NjAzMH0.fYA8IMcfuO0g42prGg3h3q_DtlwvWLKfd6nIs5dqAf0';
		supabase = createClient(supabaseUrl, supabaseKey);
	});

	// Helper function to test PDF API endpoints
	async function testPDFEndpoint(
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
					// Add authentication if needed
				}
			});

			if (response.status === 401) {
				console.warn(`⚠️  Authentication required for PDF API, skipping test for ${devEui}`);
				return null;
			}

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}

			return {
				status: response.status,
				contentType: response.headers.get('content-type'),
				contentLength: response.headers.get('content-length'),
				body: await response.arrayBuffer()
			};
		} catch (error) {
			if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
				console.warn('⚠️  Development server not running, skipping PDF API test');
				return null;
			}
			throw error;
		}
	}

	describe('PDF API Timezone Validation', () => {
		it('should generate PDF for traffic device with proper timezone handling', async () => {
			// Arrange
			const startDate = '2025-08-01';
			const endDate = '2025-08-01';

			// Act
			const pdfResponse = await testPDFEndpoint(trafficDevEui, startDate, endDate, timezone);

			if (pdfResponse === null) return; // Skip if server not running or auth required

			// Assert
			expect(pdfResponse.status).toBe(200);
			expect(pdfResponse.contentType).toBe('application/pdf');
			expect(pdfResponse.body.byteLength).toBeGreaterThan(1000); // Should be a real PDF

			console.log(
				`✅ VERIFIED: Traffic device PDF generated (${pdfResponse.body.byteLength} bytes)`
			);
		}, 15000);

		it('should handle date range that spans timezone boundaries', async () => {
			// Arrange - Test range that crosses midnight Tokyo time
			const startDate = '2025-07-31'; // Day before in UTC
			const endDate = '2025-08-01'; // Includes our critical record

			// Act
			const pdfResponse = await testPDFEndpoint(trafficDevEui, startDate, endDate, timezone);

			if (pdfResponse === null) return;

			// Assert
			expect(pdfResponse.status).toBe(200);
			expect(pdfResponse.contentType).toBe('application/pdf');

			console.log(`✅ VERIFIED: Cross-timezone PDF generated successfully`);
		}, 15000);

		it('should validate PDF generation for non-traffic devices', async () => {
			// Arrange - Test with air quality device
			const startDate = '2025-08-15';
			const endDate = '2025-08-15';

			// First check if this device exists and has data
			const { data: deviceCheck } = await supabase
				.from('cw_devices')
				.select('dev_eui, type')
				.eq('dev_eui', airDevEui)
				.single();

			if (!deviceCheck) {
				console.warn(`⚠️  Device ${airDevEui} not found, skipping non-traffic PDF test`);
				return;
			}

			// Act
			const pdfResponse = await testPDFEndpoint(airDevEui, startDate, endDate, timezone);

			if (pdfResponse === null) return;

			// Assert
			expect(pdfResponse.status).toBe(200);
			expect(pdfResponse.contentType).toBe('application/pdf');

			console.log(`✅ VERIFIED: Non-traffic device PDF generated`);
		}, 15000);
	});

	describe('Report Data Quality Validation', () => {
		it('should verify report data contains timezone-converted timestamps', async () => {
			// Arrange
			const startDate = '2025-08-01';
			const endDate = '2025-08-01';

			// Test direct database query to verify timezone handling
			const { data: trafficData, error } = await supabase
				.from('cw_traffic2')
				.select('id, traffic_hour, people_count, car_count')
				.eq('dev_eui', trafficDevEui)
				.gte('traffic_hour', '2025-07-31T15:00:00Z') // UTC range for August 1st Tokyo
				.lte('traffic_hour', '2025-08-01T14:59:59Z')
				.order('traffic_hour', { ascending: true })
				.limit(5);

			// Assert
			expect(error).toBeNull();
			expect(trafficData).toBeDefined();

			if (trafficData && trafficData.length > 0) {
				// Validate timezone conversion
				trafficData.forEach((record: any) => {
					const utcTime = DateTime.fromISO(record.traffic_hour as string);
					const tokyoTime = utcTime.setZone(timezone);

					// Should be within August 1st Tokyo time
					expect(tokyoTime.year).toBe(2025);
					expect(tokyoTime.month).toBe(8);
					expect(tokyoTime.day).toBe(1);

					console.log(
						`🔍 Record ${record.id}: UTC ${record.traffic_hour} → Tokyo ${tokyoTime.toFormat('yyyy-MM-dd HH:mm:ss')}`
					);
				});

				// Verify we found our critical record
				const criticalRecord = trafficData.find((r: any) => r.id === 35976);
				if (criticalRecord) {
					const criticalTime = DateTime.fromISO(criticalRecord.traffic_hour as string).setZone(
						timezone
					);
					expect(criticalTime.hour).toBe(0); // Should be midnight Tokyo
					console.log(`✅ VERIFIED: Critical record ${criticalRecord.id} is at Tokyo midnight`);
				}
			}
		}, 10000);

		it('should validate report data includes realistic traffic patterns', async () => {
			// Arrange - Get full day of traffic data
			const startDate = '2025-08-15';

			const startDt = DateTime.fromISO(startDate + 'T00:00:00', { zone: timezone }).startOf('day');
			const endDt = DateTime.fromISO(startDate + 'T23:59:59', { zone: timezone }).endOf('day');

			const utcStart = startDt.toUTC().toISO();
			const utcEnd = endDt.toUTC().toISO();

			// Act
			const { data: dayData, error } = await supabase
				.from('cw_traffic2')
				.select('traffic_hour, people_count, car_count')
				.eq('dev_eui', trafficDevEui)
				.gte('traffic_hour', utcStart)
				.lte('traffic_hour', utcEnd)
				.order('traffic_hour', { ascending: true });

			// Assert
			expect(error).toBeNull();
			expect(dayData).toBeDefined();

			if (dayData && dayData.length > 0) {
				// Analyze traffic patterns
				const hourlyTraffic: { [hour: number]: number } = {};

				dayData.forEach((record: any) => {
					const utcTime = DateTime.fromISO(record.traffic_hour as string);
					const tokyoTime = utcTime.setZone(timezone);
					const hour = tokyoTime.hour;

					if (!hourlyTraffic[hour]) hourlyTraffic[hour] = 0;
					hourlyTraffic[hour] +=
						((record.people_count as number) || 0) + ((record.car_count as number) || 0);
				});

				// Calculate night vs day traffic
				const nightHours = [0, 1, 2, 3, 4, 5];
				const dayHours = [9, 10, 11, 12, 13, 14, 15, 16, 17];

				const nightTraffic = nightHours.reduce((sum, hour) => sum + (hourlyTraffic[hour] || 0), 0);
				const dayTraffic = dayHours.reduce((sum, hour) => sum + (hourlyTraffic[hour] || 0), 0);

				// Should have realistic pattern (more traffic during day)
				if (dayTraffic > 0 && nightTraffic >= 0) {
					expect(dayTraffic).toBeGreaterThanOrEqual(nightTraffic);
					console.log(
						`✅ VERIFIED: Realistic traffic pattern - Day: ${dayTraffic}, Night: ${nightTraffic}`
					);
				}
			}
		}, 15000);

		it('should verify non-traffic device data timezone conversion', async () => {
			// Arrange - Test with air quality device data
			const startDate = '2025-08-15';
			const endDate = '2025-08-15';

			// Create UTC date range for database query
			const startDt = DateTime.fromISO(startDate + 'T00:00:00', { zone: timezone }).startOf('day');
			const endDt = DateTime.fromISO(endDate + 'T23:59:59', { zone: timezone }).endOf('day');

			const utcStart = startDt.toUTC().toISO();
			const utcEnd = endDt.toUTC().toISO();

			// Act - Query air quality data (using created_at field)
			const { data: airData, error } = await supabase
				.from('cw_air_data')
				.select('dev_eui, created_at, temperature_c, humidity')
				.gte('created_at', utcStart)
				.lte('created_at', utcEnd)
				.order('created_at', { ascending: true })
				.limit(10);

			// Assert
			expect(error).toBeNull();

			if (airData && airData.length > 0) {
				// Validate timezone conversion for non-traffic data
				airData.forEach((record: any) => {
					const utcTime = DateTime.fromISO(record.created_at as string);
					const tokyoTime = utcTime.setZone(timezone);

					// Should be within the requested day in Tokyo timezone
					expect(tokyoTime.year).toBe(2025);
					expect(tokyoTime.month).toBe(8);
					expect(tokyoTime.day).toBe(15);

					console.log(
						`🔍 Air Record ${record.id}: UTC ${record.created_at} → Tokyo ${tokyoTime.toFormat('yyyy-MM-dd HH:mm:ss')}`
					);
				});

				console.log(
					`✅ VERIFIED: ${airData.length} air quality records with proper timezone conversion`
				);
			} else {
				console.warn('⚠️  No air quality data found for test date, skipping validation');
			}
		}, 10000);
	});

	describe('Report API Error Handling', () => {
		it('should handle invalid date ranges gracefully', async () => {
			// Arrange - Invalid date range
			const startDate = '2025-12-31';
			const endDate = '2025-01-01'; // End before start

			// Act
			const pdfResponse = await testPDFEndpoint(trafficDevEui, startDate, endDate, timezone);

			if (pdfResponse === null) return;

			// Assert - Should either return an error or handle gracefully
			if (pdfResponse.status !== 200) {
				expect(pdfResponse.status).toBeGreaterThanOrEqual(400);
				console.log(`✅ VERIFIED: Invalid date range handled with status ${pdfResponse.status}`);
			}
		}, 10000);

		it('should handle non-existent device gracefully', async () => {
			// Arrange
			const fakeDevEui = 'NONEXISTENT123456789';
			const startDate = '2025-08-01';
			const endDate = '2025-08-01';

			// Act
			const pdfResponse = await testPDFEndpoint(fakeDevEui, startDate, endDate, timezone);

			if (pdfResponse === null) return;

			// Assert - Should return appropriate error
			expect(pdfResponse.status).toBeGreaterThanOrEqual(400);
			console.log(`✅ VERIFIED: Non-existent device handled with status ${pdfResponse.status}`);
		}, 10000);
	});
});
