import type { PageServerLoad } from './$types';
import { PUBLIC_API_BASE_URL, PUBLIC_DEVICE_LATEST_PRIMARY_DATA_ENDPOINT, PUBLIC_DEVICE_STATUS_ENDPOINT } from '$env/static/public';

export const load: PageServerLoad = async ({ fetch, locals }) => {
  const apiBaseUrl = PUBLIC_API_BASE_URL;
  const deviceStatusEndpoint = PUBLIC_DEVICE_STATUS_ENDPOINT;
  const devicesEndpoint = PUBLIC_DEVICE_LATEST_PRIMARY_DATA_ENDPOINT;

  const deviceHeaders = {
    'Content-Type': 'application/json',
    ...(locals.jwtString ? { Authorization: `Bearer ${locals.jwtString}` } : {})
  };

  const devicesResponse = await fetch(`${apiBaseUrl}${devicesEndpoint}`, {
    method: 'GET',
    headers: deviceHeaders
  });

  if (!devicesResponse.ok) {
    throw new Error(`Failed to load devices (${devicesResponse.status})`);
  }

  const pagableDevices = await devicesResponse.json();

  const fetchStatuses = fetch(`${apiBaseUrl}${deviceStatusEndpoint}`, {
    method: 'GET',
    headers: deviceHeaders
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Failed to load statuses (${response.status})`);
    }

    return response.json() as Promise<{ online: number; offline: number }>;
  });

  return {
    pagableDevices,
    locals,
    statuses: fetchStatuses,
  };
};
