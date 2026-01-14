import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PRIVATE_TTI_API_URL, PRIVATE_TTI_API_KEY } from '$env/static/private';

/**
 * Verify if a device exists in The Things Industries (TTI) by its DevEUI.
 * 
 * Strategy:
 * 1. Try direct lookup using common device_id formats (eui-{deveui}, etc.)
 * 2. Fall back to listing all devices and filtering locally by DevEUI
 * 
 * @see https://www.thethingsindustries.com/docs/api/reference/grpc/end_device/
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	// Verify authentication
	const { session, user } = await locals.safeGetSession();
	if (!session || !user) {
		return json({ success: false, error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const { devEui, applicationId } = await request.json();

		// Validate inputs
		if (!devEui || typeof devEui !== 'string') {
			return json({ success: false, error: 'DevEUI is required' }, { status: 400 });
		}

		if (!applicationId || typeof applicationId !== 'string') {
			return json({ 
				success: false, 
				error: 'TTI Application ID is required. Please select a device type first.' 
			}, { status: 400 });
		}

		// Validate DevEUI format (16 hex characters)
		const cleanDevEui = devEui.replace(/\s/g, '').toUpperCase();
		if (!/^[A-Fa-f0-9]{16}$/.test(cleanDevEui)) {
			return json({ 
				success: false, 
				error: 'Invalid DevEUI format. Must be 16 hexadecimal characters.' 
			}, { status: 400 });
		}

		// Check if TTI configuration is available
		if (!PRIVATE_TTI_API_URL || !PRIVATE_TTI_API_KEY) {
			console.error('TTI configuration missing: TTI_API_URL or PRIVATE_TTI_API_KEY not set');
			return json({ 
				success: false, 
				error: 'TTI integration not configured. Please contact support.',
				configError: true
			}, { status: 503 });
		}

		// First, try to get the device directly using common device_id formats
		// Many TTI setups use the DevEUI as part of the device_id
		const possibleDeviceIds = [
			`eui-${cleanDevEui.toLowerCase()}`,  // Common format: eui-0025ca0000002371
			cleanDevEui.toLowerCase(),            // Just the EUI lowercase
			cleanDevEui                           // Just the EUI uppercase
		];

		for (const deviceId of possibleDeviceIds) {
			try {
				const directUrl = `${PRIVATE_TTI_API_URL}/api/v3/applications/${applicationId}/devices/${deviceId}`;
				// TTI requires each field_mask.paths as a separate query parameter
				const params = new URLSearchParams();
				params.append('field_mask.paths', 'ids');
				params.append('field_mask.paths', 'name');
				params.append('field_mask.paths', 'description');

				const response = await fetch(`${directUrl}?${params}`, {
					method: 'GET',
					headers: {
						'Authorization': `Bearer ${PRIVATE_TTI_API_KEY}`,
						'Accept': 'application/json'
					}
				});

				if (response.ok) {
					const device = await response.json();
					
					// Verify the DevEUI matches (case-insensitive)
					const deviceDevEui = device.ids?.dev_eui?.toUpperCase() || '';
					if (deviceDevEui === cleanDevEui) {
						return json({ 
							success: true, 
							exists: true,
							device: {
								deviceId: device.ids?.device_id,
								devEui: device.ids?.dev_eui,
								name: device.name,
								description: device.description
							},
							message: 'Device verified successfully in TTI'
						}, { status: 200 });
					}
				}
			} catch {
				// Continue to next attempt
			}
		}

		// If direct lookup failed, list all devices and search locally
		const listUrl = `${PRIVATE_TTI_API_URL}/api/v3/applications/${applicationId}/devices`;
		// TTI requires each field_mask.paths as a separate query parameter
		const listParams = new URLSearchParams();
		listParams.append('field_mask.paths', 'ids');
		listParams.append('field_mask.paths', 'name');
		listParams.append('field_mask.paths', 'description');
		listParams.append('limit', '1000');

		const listResponse = await fetch(`${listUrl}?${listParams}`, {
			method: 'GET',
			headers: {
				'Authorization': `Bearer ${PRIVATE_TTI_API_KEY}`,
				'Accept': 'application/json'
			}
		});

		if (!listResponse.ok) {
			const errorText = await listResponse.text();
			console.error('TTI API error:', listResponse.status, errorText);
			
			if (listResponse.status === 401 || listResponse.status === 403) {
				return json({ 
					success: false, 
					error: 'TTI authentication failed. Please contact support.',
					configError: true
				}, { status: 503 });
			}
			
			if (listResponse.status === 404) {
				return json({ 
					success: false, 
					error: 'TTI application not found. The selected device type may have an invalid configuration.',
					notFound: true
				}, { status: 404 });
			}
			
			return json({ 
				success: false, 
				error: 'Failed to verify device with TTI. Please try again later.'
			}, { status: 502 });
		}

		const data = await listResponse.json();
		const devices = data.end_devices || [];
		
		// Search for the device by DevEUI
		const matchingDevice = devices.find((device: { ids?: { dev_eui?: string } }) => {
			const deviceDevEui = device.ids?.dev_eui?.toUpperCase() || '';
			return deviceDevEui === cleanDevEui;
		});

		if (!matchingDevice) {
			return json({ 
				success: false, 
				exists: false,
				error: 'Device not found in TTI. Please ensure the device is registered in The Things Industries before adding it here.',
				devEui: cleanDevEui,
				applicationId
			}, { status: 200 });
		}

		// Device found
		return json({ 
			success: true, 
			exists: true,
			device: {
				deviceId: matchingDevice.ids?.device_id,
				devEui: matchingDevice.ids?.dev_eui,
				name: matchingDevice.name,
				description: matchingDevice.description
			},
			message: 'Device verified successfully in TTI'
		}, { status: 200 });

	} catch (error) {
		console.error('Error verifying device with TTI:', error);
		return json({ 
			success: false, 
			error: 'An unexpected error occurred while verifying the device.'
		}, { status: 500 });
	}
};
