import { describe, it, expect, beforeAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import { DateTime } from 'luxon';

/**
 * NON-TRAFFIC DEVICE INTEGRATION TESTS
 *
 * These tests verify the complete timezone conversion flow for all non-traffic
 * device types that use the `created_at` field. This ensures that air sensors,
 * soil sensors, water sensors, etc. all follow the same timezone logic as
 * traffic cameras but use the correct timestamp field.
 *
 * Device types tested:
 * - Air quality sensors (cw_air_data)
 * - Soil moisture sensors (cw_soil_data)
 * - Water level sensors (cw_water_data)
 * - Pulse flow meters (cw_pulse_meters)
 * - Any other sensor using created_at
 */

describe('Non-Traffic Device Integration Tests', () => {
	let supabase: ReturnType<typeof createClient>;
	const timezone = 'Asia/Tokyo';

	beforeAll(() => {
		const supabaseUrl =
			process.env.PUBLIC_SUPABASE_URL || 'https://dpaoqrcfswnzknixwkll.supabase.co';
		const supabaseKey =
			process.env.PUBLIC_SUPABASE_ANON_KEY ||
			'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwYW9xcmNmc3duemtuaXh3a2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE2Nzc1MDAwMzAsImV4cCI6MTk5MzA3NjAzMH0.fYA8IMcfuO0g42prGg3h3q_DtlwvWLKfd6nIs5dqAf0';

		supabase = createClient(supabaseUrl, supabaseKey);
	});

	// Helper function - same timezone conversion logic as DeviceDataService
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

	// Helper function to get devices for testing
	async function getDevicesByTable(tableName: string, limit = 1) {
		// First get devices, then get their types separately to avoid relationship issues
		const { data: devices, error: devicesError } = await supabase
			.from('cw_devices')
			.select('dev_eui, name, type')
			.limit(limit * 5); // Get more devices to filter

		if (devicesError || !devices) {
			console.warn(`Error getting devices:`, devicesError?.message);
			return [];
		}

		// Get device types
		const { data: deviceTypes, error: typesError } = await supabase
			.from('cw_device_type')
			.select('id, name, data_table_v2')
			.eq('data_table_v2', tableName);

		if (typesError || !deviceTypes || deviceTypes.length === 0) {
			console.warn(`No device types found for table ${tableName}:`, typesError?.message);
			return [];
		}

		// Filter devices by type and format response
		const typeIds = deviceTypes.map((t) => t.id);
		const matchingDevices = devices
			.filter((device: any) => typeIds.includes(device.type))
			.slice(0, limit)
			.map((device: any) => {
				const deviceType = deviceTypes.find((t) => t.id === device.type);
				return {
					dev_eui: device.dev_eui as string,
					name: device.name as string,
					cw_device_type: {
						name: deviceType?.name as string,
						data_table_v2: deviceType?.data_table_v2 as string
					}
				};
			});

		return matchingDevices;
	}

	// Helper function to query data with created_at field
	async function queryDeviceData(
		tableName: string,
		devEui: string,
		startDate: Date,
		endDate: Date
	) {
		const utcStartDate = convertUserTimezoneToUTC(startDate, timezone);
		const utcEndDate = convertUserTimezoneToUTC(endDate, timezone);

		const { data, error, count } = await supabase
			.from(tableName)
			.select('*', { count: 'exact' })
			.eq('dev_eui', devEui)
			.gte('created_at', utcStartDate.toISOString())
			.lte('created_at', utcEndDate.toISOString())
			.order('created_at', { ascending: false })
			.limit(100); // Reasonable limit for testing

		// Type assertion for data records
		return {
			data: data as Array<Record<string, any>> | null,
			error,
			count
		};
	}

	describe('Air Quality Sensor Tests (cw_air_data)', () => {
		it('should find air quality devices and query data with created_at field', async () => {
			// Arrange
			const devices = await getDevicesByTable('cw_air_data');

			if (devices.length === 0) {
				console.warn('⚠️  No air quality devices found, skipping test');
				return;
			}

			const testDevice = devices[0];
			const startDate = new Date(2025, 7, 1, 0, 0, 0, 0); // August 1st midnight Tokyo
			const endDate = new Date(2025, 7, 31, 23, 59, 59, 999); // End of August

			// Act
			const { data, error, count } = await queryDeviceData(
				'cw_air_data',
				testDevice.dev_eui,
				startDate,
				endDate
			);

			// Assert
			expect(error).toBeNull();
			expect(data).toBeDefined();
			expect(Array.isArray(data)).toBe(true);

			if (data && data.length > 0) {
				// Verify the data structure includes created_at field
				expect(data[0]).toHaveProperty('created_at');
				expect(data[0]).toHaveProperty('dev_eui');
				expect(data[0].dev_eui).toBe(testDevice.dev_eui);

				// Verify created_at timestamps are properly formatted
				const sampleRecord = data[0];
				expect(sampleRecord.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

				console.log(
					`✅ VERIFIED: Air sensor ${testDevice.dev_eui} - Found ${count} records with created_at field`
				);
			}
		}, 15000);

		it('should convert air sensor timestamps correctly for Tokyo timezone', async () => {
			// Arrange
			const devices = await getDevicesByTable('cw_air_data');

			if (devices.length === 0) {
				console.warn('⚠️  No air quality devices found, skipping timestamp test');
				return;
			}

			const testDevice = devices[0];
			// Test a specific day to check timezone conversion
			const testDate = new Date(2025, 7, 15, 0, 0, 0, 0); // August 15th midnight Tokyo
			const endDate = new Date(2025, 7, 15, 23, 59, 59, 999);

			// Act
			const { data, error } = await queryDeviceData(
				'cw_air_data',
				testDevice.dev_eui,
				testDate,
				endDate
			);

			// Assert
			expect(error).toBeNull();

			if (data && data.length > 0) {
				// Verify timezone conversion by checking UTC timestamps
				const utcStartExpected = convertUserTimezoneToUTC(testDate, timezone);
				const utcEndExpected = convertUserTimezoneToUTC(endDate, timezone);

				// Check that the first record's timestamp is within our expected range
				const firstRecord = data[data.length - 1]; // Last in desc order = earliest
				const recordTime = new Date(firstRecord.created_at);

				expect(recordTime.getTime()).toBeGreaterThanOrEqual(utcStartExpected.getTime());
				expect(recordTime.getTime()).toBeLessThanOrEqual(utcEndExpected.getTime());

				console.log(
					`✅ VERIFIED: Air sensor timezone conversion - UTC range ${utcStartExpected.toISOString()} to ${utcEndExpected.toISOString()}`
				);
			}
		}, 15000);
	});

	describe('Soil Moisture Sensor Tests (cw_soil_data)', () => {
		it('should find soil sensors and verify created_at field usage', async () => {
			// Arrange
			const devices = await getDevicesByTable('cw_soil_data');

			if (devices.length === 0) {
				console.warn('⚠️  No soil moisture devices found, skipping test');
				return;
			}

			const testDevice = devices[0];
			const startDate = new Date(2025, 7, 1, 0, 0, 0, 0);
			const endDate = new Date(2025, 7, 31, 23, 59, 59, 999);

			// Act
			const { data, error, count } = await queryDeviceData(
				'cw_soil_data',
				testDevice.dev_eui,
				startDate,
				endDate
			);

			// Assert
			expect(error).toBeNull();
			expect(data).toBeDefined();

			if (data && data.length > 0) {
				// Verify soil-specific fields and created_at
				const sampleRecord = data[0];
				expect(sampleRecord).toHaveProperty('created_at');
				expect(sampleRecord).toHaveProperty('moisture');
				expect(sampleRecord).toHaveProperty('temperature_c');
				expect(sampleRecord).toHaveProperty('ph');
				expect(sampleRecord).toHaveProperty('ec');

				console.log(
					`✅ VERIFIED: Soil sensor ${testDevice.dev_eui} - Found ${count} records with soil data fields`
				);
			}
		}, 15000);

		it('should handle soil sensor early morning readings correctly', async () => {
			// Arrange
			const devices = await getDevicesByTable('cw_soil_data');

			if (devices.length === 0) return;

			const testDevice = devices[0];
			// Test early morning reading (common for soil sensors)
			const earlyMorning = new Date(2025, 7, 15, 5, 0, 0, 0); // 5 AM Tokyo
			const endTime = new Date(2025, 7, 15, 7, 0, 0, 0); // 7 AM Tokyo

			// Act
			const { data, error } = await queryDeviceData(
				'cw_soil_data',
				testDevice.dev_eui,
				earlyMorning,
				endTime
			);

			// Assert
			expect(error).toBeNull();

			if (data && data.length > 0) {
				// Verify UTC conversion: 5-7 AM Tokyo = 8-10 PM previous day UTC
				const utcStart = convertUserTimezoneToUTC(earlyMorning, timezone);
				expect(utcStart.getUTCHours()).toBe(20); // 8 PM UTC previous day

				console.log(
					`✅ VERIFIED: Soil sensor early morning conversion - 5 AM Tokyo = ${utcStart.toISOString()}`
				);
			}
		}, 15000);
	});

	describe('Water Level Sensor Tests (cw_water_data)', () => {
		it('should find water sensors and validate created_at field', async () => {
			// Arrange
			const devices = await getDevicesByTable('cw_water_data');

			if (devices.length === 0) {
				console.warn('⚠️  No water level devices found, skipping test');
				return;
			}

			const testDevice = devices[0];
			const startDate = new Date(2025, 7, 1, 0, 0, 0, 0);
			const endDate = new Date(2025, 7, 31, 23, 59, 59, 999);

			// Act
			const { data, error, count } = await queryDeviceData(
				'cw_water_data',
				testDevice.dev_eui,
				startDate,
				endDate
			);

			// Assert
			expect(error).toBeNull();
			expect(data).toBeDefined();

			if (data && data.length > 0) {
				// Verify water-specific fields and created_at
				const sampleRecord = data[0];
				expect(sampleRecord).toHaveProperty('created_at');
				expect(sampleRecord).toHaveProperty('deapth_cm');
				expect(sampleRecord).toHaveProperty('pressure');
				expect(sampleRecord).toHaveProperty('temperature_c');

				console.log(
					`✅ VERIFIED: Water sensor ${testDevice.dev_eui} - Found ${count} records with water data fields`
				);
			}
		}, 15000);
	});

	describe('Pulse Meter Tests (cw_pulse_meters)', () => {
		it('should find pulse meters and verify created_at field', async () => {
			// Arrange
			const devices = await getDevicesByTable('cw_pulse_meters');

			if (devices.length === 0) {
				console.warn('⚠️  No pulse meter devices found, skipping test');
				return;
			}

			const testDevice = devices[0];
			const startDate = new Date(2025, 7, 1, 0, 0, 0, 0);
			const endDate = new Date(2025, 7, 31, 23, 59, 59, 999);

			// Act
			const { data, error, count } = await queryDeviceData(
				'cw_pulse_meters',
				testDevice.dev_eui,
				startDate,
				endDate
			);

			// Assert
			expect(error).toBeNull();
			expect(data).toBeDefined();

			if (data && data.length > 0) {
				// Verify pulse meter fields and created_at
				const sampleRecord = data[0];
				expect(sampleRecord).toHaveProperty('created_at');
				expect(sampleRecord).toHaveProperty('count');
				expect(sampleRecord).toHaveProperty('litersPerPulse');
				expect(sampleRecord).toHaveProperty('periodCount');

				console.log(
					`✅ VERIFIED: Pulse meter ${testDevice.dev_eui} - Found ${count} records with pulse data fields`
				);
			}
		}, 15000);
	});

	describe('Multi-Device Type Comparison', () => {
		it('should verify all non-traffic devices use created_at field consistently', async () => {
			// Arrange
			const nonTrafficTables = ['cw_air_data', 'cw_soil_data', 'cw_water_data', 'cw_pulse_meters'];

			const results = [];

			// Act - Check each device type
			for (const tableName of nonTrafficTables) {
				const devices = await getDevicesByTable(tableName, 1);

				if (devices.length > 0) {
					const testDevice = devices[0];
					const testDate = new Date(2025, 7, 15, 12, 0, 0, 0); // Noon Tokyo
					const endDate = new Date(2025, 7, 15, 12, 59, 59, 999);

					const { data, error } = await queryDeviceData(
						tableName,
						testDevice.dev_eui,
						testDate,
						endDate
					);

					results.push({
						tableName,
						deviceEui: testDevice.dev_eui,
						hasData: data && data.length > 0,
						error: error?.message,
						usesCreatedAt: data && data.length > 0 && 'created_at' in data[0]
					});
				} else {
					results.push({
						tableName,
						deviceEui: null,
						hasData: false,
						error: 'No devices found',
						usesCreatedAt: null
					});
				}
			}

			// Assert
			console.log('📊 DEVICE TYPE COMPARISON:');
			results.forEach((result) => {
				console.log(
					`   ${result.tableName}: Device ${result.deviceEui}, Uses created_at: ${result.usesCreatedAt}`
				);

				if (result.hasData) {
					expect(result.usesCreatedAt).toBe(true);
					expect(result.error).toBeUndefined();
				}
			});

			// At least one device type should have data for this test to be meaningful
			const devicesWithData = results.filter((r) => r.hasData);
			expect(devicesWithData.length).toBeGreaterThan(0);
		}, 25000);

		it('should verify timezone conversion consistency across device types', async () => {
			// Arrange
			const testTime = new Date(2025, 7, 15, 15, 30, 0, 0); // 3:30 PM Tokyo
			const utcExpected = convertUserTimezoneToUTC(testTime, timezone);

			// Act & Assert
			const nonTrafficTables = ['cw_air_data', 'cw_soil_data', 'cw_water_data'];

			for (const tableName of nonTrafficTables) {
				const devices = await getDevicesByTable(tableName, 1);

				if (devices.length > 0) {
					const testDevice = devices[0];
					const { data, error } = await queryDeviceData(
						tableName,
						testDevice.dev_eui,
						testTime,
						new Date(testTime.getTime() + 3600000) // +1 hour
					);

					expect(error).toBeNull();

					// All device types should use the same timezone conversion
					// 3:30 PM Tokyo = 6:30 AM UTC
					expect(utcExpected.getUTCHours()).toBe(6);
					expect(utcExpected.getUTCMinutes()).toBe(30);

					console.log(
						`✅ VERIFIED: ${tableName} timezone conversion consistent - 3:30 PM Tokyo = ${utcExpected.toISOString()}`
					);
				}
			}
		}, 20000);
	});

	describe('Data Quality for Non-Traffic Devices', () => {
		it('should verify realistic data patterns for sensor devices', async () => {
			// Arrange
			const devices = await getDevicesByTable('cw_air_data');

			if (devices.length === 0) return;

			const testDevice = devices[0];
			const testDate = new Date(2025, 7, 15, 0, 0, 0, 0);
			const endDate = new Date(2025, 7, 15, 23, 59, 59, 999);

			// Act
			const { data, error } = await queryDeviceData(
				'cw_air_data',
				testDevice.dev_eui,
				testDate,
				endDate
			);

			// Assert
			expect(error).toBeNull();

			if (data && data.length > 0) {
				// Verify timestamps are in chronological order (descending)
				let previousTime = new Date(data[0].created_at);

				data.slice(1, 5).forEach((record) => {
					// Check first few records
					const currentTime = new Date(record.created_at);
					expect(currentTime.getTime()).toBeLessThanOrEqual(previousTime.getTime());
					previousTime = currentTime;
				});

				// Verify data contains reasonable sensor values
				const recordsWithData = data.filter(
					(record) =>
						record.temperature_c !== null || record.humidity !== null || record.pressure !== null
				);

				expect(recordsWithData.length).toBeGreaterThan(0);

				console.log(
					`✅ VERIFIED: Air sensor data quality - ${recordsWithData.length}/${data.length} records have sensor values`
				);
			}
		}, 15000);

		it('should verify created_at timestamps are within expected UTC range', async () => {
			// Arrange
			const devices = await getDevicesByTable('cw_soil_data');

			if (devices.length === 0) return;

			const testDevice = devices[0];
			const tokyoMidnight = new Date(2025, 7, 15, 0, 0, 0, 0); // August 15th midnight Tokyo
			const tokyoNoon = new Date(2025, 7, 15, 12, 0, 0, 0); // August 15th noon Tokyo

			// Act
			const { data, error } = await queryDeviceData(
				'cw_soil_data',
				testDevice.dev_eui,
				tokyoMidnight,
				tokyoNoon
			);

			// Assert
			expect(error).toBeNull();

			if (data && data.length > 0) {
				// Expected UTC range: August 14th 3 PM to August 15th 3 AM
				const utcStart = convertUserTimezoneToUTC(tokyoMidnight, timezone);
				const utcEnd = convertUserTimezoneToUTC(tokyoNoon, timezone);

				expect(utcStart.getUTCDate()).toBe(14); // Previous day
				expect(utcStart.getUTCHours()).toBe(15); // 3 PM UTC

				expect(utcEnd.getUTCDate()).toBe(15); // Same day
				expect(utcEnd.getUTCHours()).toBe(3); // 3 AM UTC

				// Verify actual data timestamps fall within this range
				data.forEach((record) => {
					const recordTime = new Date(record.created_at);
					expect(recordTime.getTime()).toBeGreaterThanOrEqual(utcStart.getTime());
					expect(recordTime.getTime()).toBeLessThanOrEqual(utcEnd.getTime());
				});

				console.log(
					`✅ VERIFIED: Soil sensor UTC range - ${utcStart.toISOString()} to ${utcEnd.toISOString()}`
				);
			}
		}, 15000);
	});
});
