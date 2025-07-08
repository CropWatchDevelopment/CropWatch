import { DeviceDataService } from './src/lib/services/DeviceDataService';

// This is just a compilation test to ensure the new method signature works
function testMethod() {
	// Test with all parameters
	const service = new DeviceDataService({} as any);

	const result1 = service.getDeviceDataForReport(
		'test',
		new Date(),
		new Date(),
		'UTC',
		30,
		['temperature_c'],
		['>'],
		[25.0],
		[null]
	);

	// Test with default parameters
	const result2 = service.getDeviceDataForReport('test', new Date(), new Date(), 'UTC', 30);

	console.log('Method signatures compile correctly');
}
