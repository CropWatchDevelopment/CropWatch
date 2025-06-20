import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { SessionService } from '$lib/services/SessionService';
import { container } from '$lib/server/ioc.config';
import { TYPES } from '$lib/server/ioc.types';
import { DeviceRepository } from '$lib/repositories/DeviceRepository';
import { DeviceService } from '$lib/services/DeviceService';
import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';

export const load: PageServerLoad = async ({ params, locals: { supabase } }) => {
  const sessionService = new SessionService(supabase);
  const sessionResult = await sessionService.getSafeSession();
  if (!sessionResult || !sessionResult.user) {
    throw redirect(302, '/auth/login');
  }
  const { devEui } = params;
  const errorHandler = container.get<ErrorHandlingService>(TYPES.ErrorHandlingService);
  const repo = new DeviceRepository(supabase, errorHandler);
  const deviceService = new DeviceService(repo);

  const device = await deviceService.getDeviceWithTypeByEui(devEui);
  if (!device) {
    throw error(404, 'Device not found');
  }

  const owner = await repo.findDeviceOwner(devEui, sessionResult.user.id);
  if (!owner) {
    throw error(403, 'Forbidden');
  }

  return { device };
};
