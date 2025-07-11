import { DeviceDataService } from './src/lib/services/DeviceDataService';

// This is just a compilation test to ensure the new method signature works
function testMethod() {
	// Test with all parameters
	const service = new DeviceDataService({} as any);

	const result1 = service.getDeviceDataForReport({
		devEui: 'test',
		startDate: new Date(),
		endDate: new Date(),
		timezone: 'UTC',
		intervalMinutes: 30,
		columns: ['temperature_c'],
		ops: ['>'],
		mins: [25.0],
		maxs: [null]
	});

	// Test with default parameters
	const result2 = service.getDeviceDataForReport({
		devEui: 'test',
		startDate: new Date(),
		endDate: new Date(),
		timezone: 'UTC',
		intervalMinutes: 30
	});

	console.log('Method signatures compile correctly');
}
