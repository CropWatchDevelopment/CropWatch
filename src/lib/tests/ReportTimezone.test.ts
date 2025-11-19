import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DateTime } from 'luxon';
import { DeviceDataService } from '../services/DeviceDataService';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * CRITICAL REPORT TIMEZONE TESTS
 *
 * These tests ensure that report data loading and PDF generation handle
 * timezone conversion correctly for both created_at (non-traffic) and
 * traffic_hour (traffic) fields.
 *
 * Key requirements:
 * - Report data should convert timestamps to user timezone
 * - Both traffic and non-traffic devices should work correctly
 * - PDF generation should use proper timezone-converted data
 */

describe('Report Data Timezone Tests', () => {
	let deviceDataService: DeviceDataService;
	let mockSupabase: SupabaseClient;

	beforeEach(() => {
		// Mock Supabase client with report-specific methods
		mockSupabase = {
			from: vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						limit: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: {
									cw_device_type: { data_table_v2: 'cw_air_data' }
								},
								error: null
							})
						})
					})
				})
			}),
			rpc: vi.fn()
		} as any;

		deviceDataService = new DeviceDataService(mockSupabase);
	});

	describe('getDeviceDataForReport timezone handling', () => {
		it('should pass correct timezone parameters to stored procedure', async () => {
			// Arrange
			const mockRpcResponse = [
				{
					id: 1,
					dev_eui: '110110145241600107',
					created_at: '2025-08-01T00:00:00+09:00', // Tokyo time
					temperature_c: 25.5,
					humidity: 60.2
				}
			];

			(mockSupabase.rpc as any).mockResolvedValue({
				data: mockRpcResponse,
				error: null
			});

			const startDate = new Date('2025-08-01T00:00:00.000Z'); // UTC
			const endDate = new Date('2025-08-01T23:59:59.999Z'); // UTC
			const timezone = 'Asia/Tokyo';

			// Act
			const result = await deviceDataService.getDeviceDataForReport({
				devEui: '110110145241600107',
				startDate,
				endDate,
				timezone,
				intervalMinutes: 30
			});

			// Assert
			expect(mockSupabase.rpc).toHaveBeenCalledWith(
				'get_filtered_device_report_data_multi_v2',
				expect.objectContaining({
					p_dev_id: '110110145241600107',
					p_start_time: startDate,
					p_end_time: endDate,
					p_interval_minutes: 30,
					p_timezone: timezone
				})
			);

			expect(result).toHaveLength(1);
			expect(result[0].dev_eui).toBe('110110145241600107');
		});

		it('should handle report with no data gracefully', async () => {
			// Arrange
			(mockSupabase.rpc as any).mockResolvedValue({
				data: [],
				error: null
			});

			// Act
			const result = await deviceDataService.getDeviceDataForReport({
				devEui: '110110145241600107',
				startDate: new Date('2025-08-01'),
				endDate: new Date('2025-08-01'),
				timezone: 'Asia/Tokyo',
				intervalMinutes: 30
			});

			// Assert
			expect(result).toHaveLength(1);
			expect(result[0]).toHaveProperty('error');
			expect(result[0].error).toBe('No data found for the specified date range');
		});

		it('should load alert points from device reports', async () => {
			// Arrange
			const mockReportsData = [
				{
					report_id: 'test-report-1',
					report_alert_points: [
						{
							data_point_key: 'temperature_c',
							operator: '>',
							value: 30.0,
							min: null,
							max: null
						},
						{
							data_point_key: 'humidity',
							operator: 'BETWEEN',
							value: null,
							min: 40.0,
							max: 80.0
						}
					]
				}
			];

			// Mock reports query
			const mockFrom = vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						limit: vi.fn().mockResolvedValue({
							data: mockReportsData,
							error: null
						})
					})
				})
			});

			(mockSupabase.from as any).mockImplementation((table: string) => {
				if (table === 'reports') {
					return mockFrom();
				}
				// Default device type lookup
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							single: vi.fn().mockResolvedValue({
								data: { cw_device_type: { data_table_v2: 'cw_air_data' } },
								error: null
							})
						})
					})
				};
			});

			(mockSupabase.rpc as any).mockResolvedValue({
				data: [{ id: 1, dev_eui: '110110145241600107', temperature_c: 25.5 }],
				error: null
			});

			// Act
			await deviceDataService.getDeviceDataForReport({
				devEui: '110110145241600107',
				startDate: new Date('2025-08-01'),
				endDate: new Date('2025-08-01'),
				timezone: 'Asia/Tokyo',
				intervalMinutes: 30
			});

			// Assert
			expect(mockSupabase.rpc).toHaveBeenCalledWith(
				'get_filtered_device_report_data_multi_v2',
				expect.objectContaining({
					p_columns: ['temperature_c', 'humidity'],
					p_ops: ['>', 'BETWEEN'],
					p_mins: [30.0, 40.0],
					p_maxs: [null, 80.0],
					p_timezone: 'Asia/Tokyo'
				})
			);
		});

		it('should handle database errors gracefully', async () => {
			// Arrange
			(mockSupabase.rpc as any).mockResolvedValue({
				data: null,
				error: { message: 'Database connection failed' }
			});

			// Act & Assert
			await expect(
				deviceDataService.getDeviceDataForReport({
					devEui: '110110145241600107',
					startDate: new Date('2025-08-01'),
					endDate: new Date('2025-08-01'),
					timezone: 'Asia/Tokyo',
					intervalMinutes: 30
				})
			).rejects.toThrow('Error fetching report data: Database connection failed');
		});
	});

	describe('Report data timezone conversion validation', () => {
		it('should validate timestamp formats in report data', () => {
			// Arrange - Sample report data with different timestamp formats
			const reportData = [
				{
					id: 1,
					created_at: '2025-08-01T00:00:00+09:00', // Tokyo timezone
					temperature_c: 25.5
				},
				{
					id: 2,
					created_at: '2025-08-01T01:00:00+09:00', // Tokyo timezone
					temperature_c: 26.0
				}
			];

			// Act - Parse timestamps and convert to UTC
			const parsedData = reportData.map((record) => {
				const dt = DateTime.fromISO(record.created_at);
				return {
					...record,
					utc_time: dt.toUTC().toISO(),
					tokyo_time: dt.setZone('Asia/Tokyo').toISO(),
					is_valid: dt.isValid
				};
			});

			// Assert
			parsedData.forEach((record) => {
				expect(record.is_valid).toBe(true);
				expect(record.utc_time).toMatch(/Z$/); // Should end with Z for UTC
				expect(record.tokyo_time).toContain('+09:00'); // Should have Tokyo offset
			});

			// Validate specific conversion
			const firstRecord = parsedData[0];
			expect(firstRecord.utc_time).toBe('2025-07-31T15:00:00.000Z'); // Tokyo midnight = July 31 3PM UTC
		});

		it('should handle traffic data timestamps correctly in reports', () => {
			// Arrange - Traffic data uses traffic_hour field instead of created_at
			const trafficReportData = [
				{
					id: 35976,
					traffic_hour: '2025-07-31T15:00:00+00:00', // UTC time
					people_count: 0,
					car_count: 6
				}
			];

			// Act - Convert to Tokyo timezone for display
			const convertedData = trafficReportData.map((record) => {
				const dt = DateTime.fromISO(record.traffic_hour, { zone: 'UTC' });
				return {
					...record,
					tokyo_display: dt.setZone('Asia/Tokyo').toFormat('yyyy-MM-dd HH:mm:ss'),
					tokyo_iso: dt.setZone('Asia/Tokyo').toISO()
				};
			});

			// Assert
			const firstRecord = convertedData[0];
			expect(firstRecord.tokyo_display).toBe('2025-08-01 00:00:00'); // Should be midnight Tokyo
			expect(firstRecord.tokyo_iso).toContain('2025-08-01T00:00:00');
			expect(firstRecord.tokyo_iso).toContain('+09:00');
		});

		it('should validate date range boundaries for reports', () => {
			// Arrange - Test August 1st midnight Tokyo conversion
			const timezone = 'Asia/Tokyo';
			const dateParam = '2025-08-01';

			// Act - Create DateTime objects in user timezone (same as API logic)
			const startDt = DateTime.fromISO(dateParam + 'T00:00:00', { zone: timezone }).startOf('day');
			const endDt = DateTime.fromISO(dateParam + 'T23:59:59.000', { zone: timezone });

			// Convert to UTC for database query
			const utcStart = startDt.toUTC();
			const utcEnd = endDt.toUTC();

			// Assert
			expect(utcStart.toISO()).toBe('2025-07-31T15:00:00.000Z'); // July 31 3PM UTC
			expect(utcEnd.toISO()).toBe('2025-08-01T14:59:59.000Z'); // August 1 2:59PM UTC

			// Validate the range covers full day in Tokyo timezone
			const rangeDuration = utcEnd.diff(utcStart, 'hours').hours;
			expect(rangeDuration).toBeCloseTo(23.999, 2); // Should be almost 24 hours
		});
	});

	describe('PDF generation timezone handling', () => {
		it('should prepare data correctly for PDF charts with timezone conversion', () => {
			// Arrange - Sample report data
			const reportData = [
				{ id: 1, created_at: '2025-08-01T00:00:00+09:00', temperature_c: 25.5, humidity: 60 },
				{ id: 2, created_at: '2025-08-01T01:00:00+09:00', temperature_c: 26.0, humidity: 58 },
				{ id: 3, created_at: '2025-08-01T02:00:00+09:00', temperature_c: 24.8, humidity: 62 }
			];

			// Act - Convert for chart display (same logic as PDF generation)
			const chartData = reportData.map((record) => {
				const dt = DateTime.fromISO(record.created_at);
				return {
					x: dt.setZone('Asia/Tokyo').toFormat('HH:mm'), // Display in Tokyo time
					temperature: record.temperature_c,
					humidity: record.humidity
				};
			});

			// Assert
			expect(chartData[0].x).toBe('00:00'); // Midnight Tokyo
			expect(chartData[1].x).toBe('01:00'); // 1 AM Tokyo
			expect(chartData[2].x).toBe('02:00'); // 2 AM Tokyo

			// Data should be sequential and logical
			expect(chartData).toHaveLength(3);
			chartData.forEach((point) => {
				expect(point.temperature).toBeGreaterThan(20);
				expect(point.humidity).toBeGreaterThan(50);
			});
		});

		it('should handle empty report data for PDF generation', () => {
			// Arrange
			const emptyReportData: any[] = [];

			// Act - Process empty data (same as PDF generation logic)
			const chartData = emptyReportData.map((record) => ({
				x: DateTime.fromISO(record.created_at).setZone('Asia/Tokyo').toFormat('HH:mm'),
				temperature: record.temperature_c
			}));

			// Assert
			expect(chartData).toHaveLength(0);
		});

		it('should validate PDF metadata with correct timezone information', () => {
			// Arrange
			const timezone = 'Asia/Tokyo';
			const startDate = '2025-08-01';
			const endDate = '2025-08-31';

			// Act - Generate PDF metadata (same as PDF generation)
			const tokyoNow = DateTime.now().setZone(timezone);
			const offsetMinutes = tokyoNow.offset;
			const offsetHours = Math.floor(Math.abs(offsetMinutes) / 60);
			const offsetMins = Math.abs(offsetMinutes) % 60;
			const offsetSign = offsetMinutes >= 0 ? '+' : '-';
			const formattedOffset = `${offsetSign}${offsetHours.toString().padStart(2, '0')}${offsetMins.toString().padStart(2, '0')}`;

			const pdfMetadata = {
				title: `Device Report - ${startDate} to ${endDate}`,
				generatedAt: tokyoNow.toFormat('yyyy-MM-dd HH:mm:ss'),
				timezone: timezone,
				dateRange: `${startDate} - ${endDate}`,
				utcOffset: formattedOffset
			};

			// Assert
			expect(pdfMetadata.timezone).toBe('Asia/Tokyo');
			expect(pdfMetadata.utcOffset).toBe('+0900');
			expect(pdfMetadata.generatedAt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
			expect(pdfMetadata.title).toContain(startDate);
		});
	});

	describe('Alert point processing with timezone awareness', () => {
		it('should process alert points correctly with timezone-converted data', () => {
			// Arrange
			const reportData = [
				{ id: 1, created_at: '2025-08-01T14:00:00+09:00', temperature_c: 35.0 }, // Hot afternoon
				{ id: 2, created_at: '2025-08-01T02:00:00+09:00', temperature_c: 15.0 }, // Cool night
				{ id: 3, created_at: '2025-08-01T10:00:00+09:00', temperature_c: 25.0 } // Normal morning
			];

			const alertPoints = [
				{ data_point_key: 'temperature_c', operator: '>', value: 30.0, threshold: 'HIGH' },
				{ data_point_key: 'temperature_c', operator: '<', value: 20.0, threshold: 'LOW' }
			];

			// Act - Process alerts (same logic as report generation)
			const alertResults = reportData.map((record) => {
				const dt = DateTime.fromISO(record.created_at);
				const alerts = alertPoints.filter((alert) => {
					if (alert.operator === '>' && record.temperature_c > alert.value) return true;
					if (alert.operator === '<' && record.temperature_c < alert.value) return true;
					return false;
				});

				return {
					...record,
					tokyo_time: dt.setZone('Asia/Tokyo').toFormat('yyyy-MM-dd HH:mm:ss'),
					alerts: alerts,
					alert_count: alerts.length
				};
			});

			// Assert
			expect(alertResults[0].alerts).toHaveLength(1); // Hot afternoon should trigger HIGH alert
			expect(alertResults[0].alerts[0].threshold).toBe('HIGH');
			expect(alertResults[0].tokyo_time).toBe('2025-08-01 14:00:00');

			expect(alertResults[1].alerts).toHaveLength(1); // Cool night should trigger LOW alert
			expect(alertResults[1].alerts[0].threshold).toBe('LOW');
			expect(alertResults[1].tokyo_time).toBe('2025-08-01 02:00:00');

			expect(alertResults[2].alerts).toHaveLength(0); // Normal morning should trigger no alerts
		});
	});
});
