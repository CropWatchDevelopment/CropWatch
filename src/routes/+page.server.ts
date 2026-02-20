import type { PageServerLoad } from './$types';
import { PUBLIC_API_BASE_URL, PUBLIC_DEVICE_LATEST_PRIMARY_DATA_ENDPOINT } from '$env/static/public';

export const load: PageServerLoad = async ({ fetch, locals }) => {
  const response = await fetch(`${PUBLIC_API_BASE_URL}${PUBLIC_DEVICE_LATEST_PRIMARY_DATA_ENDPOINT}`);
  const result = await response.json();
  return { pagableDevices: result, locals };
};