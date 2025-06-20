import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { DeviceDataService } from '$lib/services/DeviceDataService';

export const GET: RequestHandler = async ({ params, locals: { safeGetSession, supabase } }) => {
  const { devEui } = params;
  const { session } = await safeGetSession();
  if (!session) {
    throw error(401, 'Authentication required');
  }
  if (!devEui) {
    throw error(400, 'Device EUI is required');
  }
  const svc = new DeviceDataService(supabase);
  const latest = await svc.getLatestDeviceData(devEui);
  if (!latest) {
    throw error(404, 'No data');
  }
  return json(latest);
};
