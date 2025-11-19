import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DateTime } from 'luxon';
import { DeviceDataService } from '../services/DeviceDataService';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { DeviceDataRecord } from '../models/DeviceDataRecord';
import type { ReportAlertPoint } from '../models/Report';

/**
 * CRITICAL PDF REPORT TIMEZONE TESTS - TEMPERATURE DEVICES
 *
 * These tests ensure that PDF report generation for temperature devices
 * properly handles timezone conversion for the created_at field.
 *
 * Test Device: 373632336F32840A (Temperature sensor)
 * Key requirement: created_at timestamps must be converted properly between
 * user timezone and UTC for accurate report generation.
 */

describe('PDF Report Temperature Device Timezone Tests', () => {
	let deviceDataService: DeviceDataService;
	let mockSupabase: SupabaseClient;

	const tempDeviceEui = '373632336F32840A';
	const timezone = 'Asia/Tokyo';

	// Mock temperature device data structure
	const mockTempDevice = {
		dev_eui: tempDeviceEui,
		location_id: 'test-location-1',
		cw_device_type: {
			data_table_v2: 'cw_air_data', // Temperature sensors use air data table
			device_type: 'air_sensor'
		}
	};

	// Mock temperature data records
	const mockTempData: DeviceDataRecord[] = [
		{
			dev_eui: tempDeviceEui,
			created_at: '2025-08-01T06:00:00+00:00', // UTC: Aug 1st 6AM = Tokyo: Aug 1st 3PM
			temperature_c: 25.5,
			humidity: 60.2,
			pressure: 1013.25
		},
		{
			dev_eui: tempDeviceEui,
			created_at: '2025-08-01T03:00:00+00:00', // UTC: Aug 1st 3AM = Tokyo: Aug 1st 12PM
			temperature_c: 28.3,
			humidity: 58.7,
			pressure: 1012.8
		},
		{
			dev_eui: tempDeviceEui,
			created_at: '2025-07-31T21:00:00+00:00', // UTC: Jul 31st 9PM = Tokyo: Aug 1st 6AM
			temperature_c: 22.1,
			humidity: 65.4,
			pressure: 1014.1
		}
	];

	beforeEach(() => {
		// Mock Supabase client with temperature device responses
		mockSupabase = {
			from: vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: mockTempDevice,
							error: null
						}),
						gte: vi.fn().mockReturnValue({
							lte: vi.fn().mockReturnValue({
								order: vi.fn().mockResolvedValue({
									data: mockTempData,
									error: null
								})
							})
						})
					})
				})
			}),
			rpc: vi.fn().mockResolvedValue({
				data: mockTempData,
				error: null
			})
		} as any;

		deviceDataService = new DeviceDataService(mockSupabase);
	});

	describe('PDF Report Date Range Processing', () => {
		it('should properly convert PDF report date parameters to UTC for temperature device', () => {
			// Arrange - Same logic as PDF server
			const startDateParam = '2025-08-01';
			const endDateParam = '2025-08-01';

			// Act - Convert dates like PDF server does
			let startDate = new Date(startDateParam);
			let endDate = new Date(endDateParam);

			// Convert to user timezone and include full day (PDF server logic)
			const userStartDate = DateTime.fromJSDate(startDate).setZone(timezone).startOf('day');
			const userEndDate = DateTime.fromJSDate(endDate).setZone(timezone).endOf('day');

			// Convert back to UTC for database queries
			const utcStartDate = userStartDate.toUTC().toJSDate();
			const utcEndDate = userEndDate.toUTC().toJSDate();

			// Assert - Check the conversion matches expected values
			expect(utcStartDate.toISOString()).toBe('2025-07-31T15:00:00.000Z'); // Aug 1st 00:00 Tokyo = Jul 31st 15:00 UTC
			expect(utcEndDate.toISOString()).toBe('2025-08-01T14:59:59.999Z'); // Aug 1st 23:59 Tokyo = Aug 1st 14:59 UTC

			console.log('✅ PDF Report Date Range Conversion:');
			console.log(`   Tokyo Range: ${userStartDate.toISO()} to ${userEndDate.toISO()}`);
			console.log(`   UTC Range: ${utcStartDate.toISOString()} to ${utcEndDate.toISOString()}`);
		});

		it('should handle multi-day PDF report date ranges correctly', () => {
			// Arrange - Multi-day report
			const startDateParam = '2025-08-01';
			const endDateParam = '2025-08-05';

			// Act
			let startDate = new Date(startDateParam);
			let endDate = new Date(endDateParam);

			const userStartDate = DateTime.fromJSDate(startDate).setZone(timezone).startOf('day');
			const userEndDate = DateTime.fromJSDate(endDate).setZone(timezone).endOf('day');

			const utcStartDate = userStartDate.toUTC().toJSDate();
			const utcEndDate = userEndDate.toUTC().toJSDate();

			// Assert
			expect(utcStartDate.toISOString()).toBe('2025-07-31T15:00:00.000Z');
			expect(utcEndDate.toISOString()).toBe('2025-08-05T14:59:59.999Z');

			// Should span 5 days in Tokyo time
			const daysDiff = userEndDate.diff(userStartDate, 'days').days;
			expect(Math.ceil(daysDiff)).toBe(5);
		});
	});

	describe('Temperature Device Data Timezone Conversion', () => {
		it('should convert temperature data created_at timestamps to user timezone for PDF display', async () => {
			// Arrange
			const startDate = new Date('2025-07-31T15:00:00.000Z'); // UTC
			const endDate = new Date('2025-08-01T14:59:59.999Z'); // UTC

			// Act - Get data like PDF server does
			const result = await deviceDataService.getDeviceDataByDateRange(
				tempDeviceEui,
				startDate,
				endDate,
				timezone
			);

			// Assert
			expect(result).toBeDefined();
			expect(Array.isArray(result)).toBe(true);

			// Verify timezone conversion for each record
			if (result && result.length > 0) {
				result.forEach((record) => {
					// created_at should be converted to Tokyo timezone
					const tokyoTime = DateTime.fromISO(record.created_at).setZone(timezone);

					// Should be August 1st in Tokyo timezone
					expect(tokyoTime.year).toBe(2025);
					expect(tokyoTime.month).toBe(8); // August
					expect(tokyoTime.day).toBe(1);

					console.log(
						`✅ Temperature Record: UTC ${record.created_at} → Tokyo ${tokyoTime.toFormat('yyyy-MM-dd HH:mm:ss')}, Temp: ${(record as any).temperature_c}°C`
					);
				});
			}
		});

		it('should handle temperature device report data with alert points', async () => {
			// Arrange - Report with temperature alert points
			const startDate = new Date('2025-07-31T15:00:00.000Z');
			const endDate = new Date('2025-08-01T14:59:59.999Z');

			const alertPoints: ReportAlertPoint[] = [
				{
					id: 1,
					data_point_key: 'temperature_c',
					name: 'High Temperature Alert',
					operator: 'gt',
					value: 25.0,
					min: 25.0,
					max: null,
					hex_color: '#ff0000',
					created_at: '2025-07-31T00:00:00Z',
					report_id: 'report-1',
					user_id: 'user-1'
				}
			];

			// Act
			const result = await deviceDataService.getDeviceDataForReport({
				devEui: tempDeviceEui,
				startDate,
				endDate,
				timezone,
				columns: alertPoints.map((p) => p.data_point_key),
				ops: alertPoints.map((p) => p.operator || 'gt'),
				mins: alertPoints.map((p) => p.min || p.value || 0),
				maxs: alertPoints.map((p) => p.max || null),
				intervalMinutes: 30
			});

			// Assert
			expect(result).toBeDefined();
			expect(Array.isArray(result)).toBe(true);

			// Verify the report data has proper timezone conversion
			if (result && result.length > 0) {
				result.forEach((record) => {
					const tokyoTime = DateTime.fromISO(record.created_at).setZone(timezone);
					expect(tokyoTime.month).toBe(8); // Should be August in Tokyo

					// Should have temperature data
					expect((record as any).temperature_c).toBeDefined();
					expect(typeof (record as any).temperature_c).toBe('number');
				});
			}
		});

		it('should convert report data timestamps to the requested timezone', async () => {
			const rpcRows: DeviceDataRecord[] = [
				{
					dev_eui: tempDeviceEui,
					created_at: '2025-11-08T15:00:00Z',
					temperature_c: 24.2
				},
				{
					dev_eui: tempDeviceEui,
					created_at: '2025-11-08T14:30:00Z',
					temperature_c: 22.9
				}
			];

			(mockSupabase.rpc as any).mockResolvedValueOnce({
				data: rpcRows,
				error: null
			});

			const startDate = new Date('2025-11-08T00:00:00.000Z');
			const endDate = new Date('2025-11-09T00:00:00.000Z');
			const result = await deviceDataService.getDeviceDataForReport({
				devEui: tempDeviceEui,
				startDate,
				endDate,
				timezone,
				intervalMinutes: 30
			});

			expect(result).toHaveLength(2);
			expect(result[0].created_at).toContain('+09:00');
			expect(DateTime.fromISO(result[0].created_at).toISO()).toBe('2025-11-09T00:00:00.000+09:00');
			expect(DateTime.fromISO(result[1].created_at).toISO()).toBe('2025-11-08T23:30:00.000+09:00');
		});
	});

	describe('PDF Report Data Sorting and Formatting', () => {
		it('should sort temperature data by created_at for chronological PDF display', async () => {
			// Arrange
			const startDate = new Date('2025-07-31T15:00:00.000Z');
			const endDate = new Date('2025-08-01T14:59:59.999Z');

			// Act
			const deviceData = await deviceDataService.getDeviceDataByDateRange(
				tempDeviceEui,
				startDate,
				endDate,
				timezone
			);

			// Sort like PDF server does
			if (deviceData) {
				deviceData.sort((a, b) => {
					const dateA = new Date(a.created_at).getTime();
					const dateB = new Date(b.created_at).getTime();
					return dateA - dateB; // Ascending
				});

				// Assert
				expect(deviceData.length).toBeGreaterThan(0);

				// Verify chronological order
				for (let i = 1; i < deviceData.length; i++) {
					const prevTime = new Date(deviceData[i - 1].created_at).getTime();
					const currentTime = new Date(deviceData[i].created_at).getTime();
					expect(currentTime).toBeGreaterThanOrEqual(prevTime);
				}

				console.log('✅ Temperature Data Chronological Order:');
				deviceData.forEach((record, index) => {
					const tokyoTime = DateTime.fromISO(record.created_at).setZone(timezone);
					console.log(
						`   ${index + 1}. Tokyo: ${tokyoTime.toFormat('yyyy-MM-dd HH:mm:ss')}, Temp: ${(record as any).temperature_c}°C`
					);
				});
			}
		});

		it('should validate temperature data fields for PDF table generation', async () => {
			// Arrange
			const startDate = new Date('2025-07-31T15:00:00.000Z');
			const endDate = new Date('2025-08-01T14:59:59.999Z');

			// Act
			const deviceData = await deviceDataService.getDeviceDataByDateRange(
				tempDeviceEui,
				startDate,
				endDate,
				timezone
			);

			// Assert
			expect(deviceData).toBeDefined();

			if (deviceData && deviceData.length > 0) {
				const firstRecord = deviceData[0];

				// Should have required fields for PDF generation
				expect(firstRecord.created_at).toBeDefined();
				expect(firstRecord.dev_eui).toBe(tempDeviceEui);

				// Temperature-specific fields
				expect(firstRecord.temperature_c).toBeDefined();
				expect(typeof firstRecord.temperature_c).toBe('number');

				// Optional environmental fields
				if (firstRecord.humidity !== undefined) {
					expect(typeof firstRecord.humidity).toBe('number');
				}
				if (firstRecord.pressure !== undefined) {
					expect(typeof firstRecord.pressure).toBe('number');
				}

				console.log('✅ Temperature Data Fields Validation:');
				console.log(`   Device: ${firstRecord.dev_eui}`);
				console.log(`   Timestamp: ${firstRecord.created_at}`);
				console.log(`   Temperature: ${firstRecord.temperature}°C`);
				console.log(`   Humidity: ${firstRecord.humidity}%`);
				console.log(`   Pressure: ${firstRecord.pressure} hPa`);
			}
		});
	});

	describe('PDF Report Edge Cases', () => {
		it('should handle timezone conversion across month boundaries for temperature reports', () => {
			// Arrange - Date range that crosses month boundary in Tokyo timezone
			const startDateParam = '2025-07-31'; // Last day of July
			const endDateParam = '2025-08-01'; // First day of August

			// Act
			let startDate = new Date(startDateParam);
			let endDate = new Date(endDateParam);

			const userStartDate = DateTime.fromJSDate(startDate).setZone(timezone).startOf('day');
			const userEndDate = DateTime.fromJSDate(endDate).setZone(timezone).endOf('day');

			const utcStartDate = userStartDate.toUTC().toJSDate();
			const utcEndDate = userEndDate.toUTC().toJSDate();

			// Assert - UTC range should properly span the month boundary
			expect(utcStartDate.getUTCMonth()).toBe(6); // July (0-indexed)
			expect(utcStartDate.getUTCDate()).toBe(30); // July 30th UTC

			expect(utcEndDate.getUTCMonth()).toBe(7); // August (0-indexed)
			expect(utcEndDate.getUTCDate()).toBe(1); // August 1st UTC

			console.log('✅ Month Boundary Timezone Conversion:');
			console.log(`   Tokyo: Jul 31st 00:00 → UTC: Jul 30th 15:00`);
			console.log(`   Tokyo: Aug 1st 23:59 → UTC: Aug 1st 14:59`);
		});

		it('should handle empty temperature data gracefully in PDF reports', async () => {
			// Arrange - Mock empty response
			const emptySupabase = {
				from: vi.fn().mockReturnValue({
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: mockTempDevice,
								error: null
							}),
							gte: vi.fn().mockReturnValue({
								lte: vi.fn().mockReturnValue({
									order: vi.fn().mockResolvedValue({
										data: [], // Empty data
										error: null
									})
								})
							})
						})
					})
				}),
				rpc: vi.fn().mockResolvedValue({
					data: [],
					error: null
				})
			} as any;

			const emptyDataService = new DeviceDataService(emptySupabase);

			// Act
			const result = await emptyDataService.getDeviceDataByDateRange(
				tempDeviceEui,
				new Date('2025-08-01T00:00:00Z'),
				new Date('2025-08-01T23:59:59Z'),
				timezone
			);

			// Assert
			expect(result).toBeDefined();
			expect(Array.isArray(result)).toBe(true);
			expect(result.length).toBe(0);
		});

		it('should validate timezone parameter handling for different timezones', () => {
			// Arrange - Test different timezone scenarios
			const testTimezones = ['Asia/Tokyo', 'America/New_York', 'Europe/London', 'UTC'];

			const testDate = '2025-08-01';

			testTimezones.forEach((tz) => {
				// Act
				const startDate = new Date(testDate);
				const userStartDate = DateTime.fromJSDate(startDate).setZone(tz).startOf('day');
				const utcStartDate = userStartDate.toUTC().toJSDate();

				// Assert
				expect(utcStartDate).toBeInstanceOf(Date);
				expect(utcStartDate.toISOString()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

				console.log(`✅ ${tz}: ${testDate} 00:00 → UTC: ${utcStartDate.toISOString()}`);
			});
		});
	});
});
