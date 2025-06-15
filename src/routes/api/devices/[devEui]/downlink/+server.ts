import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { container } from '$lib/server/ioc.config';
import { TYPES } from '$lib/server/ioc.types';
import { DeviceRepository } from '$lib/repositories/DeviceRepository';
import { DeviceService } from '$lib/services/DeviceService';
import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';
import { DRAGINO_LT22222L_PAYLOADS } from '$lib/lorawan/dragino';
import { env } from '$env/dynamic/private';

export const POST: RequestHandler = async ({ params, request, locals: { supabase, safeGetSession } }) => {
  const { devEui } = params;
  const { session, user } = await safeGetSession();
  if (!session || !user) {
    throw error(401, 'Authentication required');
  }

  if (!devEui) {
    throw error(400, 'Device EUI is required');
  }

  const errorHandler = container.get<ErrorHandlingService>(TYPES.ErrorHandlingService);
  const repo = new DeviceRepository(supabase, errorHandler);
  const deviceService = new DeviceService(repo);

  const device = await deviceService.getDeviceWithTypeByEui(devEui);
  if (!device) {
    throw error(404, 'Device not found');
  }

  const owner = await repo.findDeviceOwner(devEui, user.id);
  if (!owner) {
    throw error(403, 'Forbidden');
  }

  const body = await request.json();
  const payloadName = body.payloadName as keyof typeof DRAGINO_LT22222L_PAYLOADS | undefined;
  const frm_payload = body.frm_payload as string | undefined;

  const base64Payload = payloadName ? DRAGINO_LT22222L_PAYLOADS[payloadName] : frm_payload;
  if (!base64Payload) {
    throw error(400, 'No payload specified');
  }

  const appId = device.cw_device_type?.TTI_application_id;
  if (!appId) {
    throw error(500, 'Device type missing TTI application id');
  }

  const apiKey = env.TTI_API_KEY;
  if (!apiKey) {
    throw error(500, 'TTI_API_KEY not configured');
  }

  const url = `https://cropwatch.au1.cloud.thethings.industries/api/v3/as/applications/${appId}/devices/${device.dev_eui}/down/replace`;

  const payload = {
    downlinks: [
      {
        frm_payload: base64Payload,
        f_port: 2,
        priority: 'HIGH',
        confirmed: true
      }
    ]
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error('TTI downlink error', text);
    throw error(500, 'Failed to send downlink');
  }

  return json({ success: true });
};
