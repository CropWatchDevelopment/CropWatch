// src/routes/api/v1/devices/[devEui]/downlink/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { DeviceRepository } from '$lib/repositories/DeviceRepository';
import { DeviceService } from '$lib/services/DeviceService';
import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';
import { DRAGINO_LT22222L_PAYLOADS } from '$lib/lorawan/dragino';

// SvelteKit v5: use $env/static/private on the server
import {
	PRIVATE_TTI_DRAGINO_RELAY_KEY,
	TTI_IS_BASE_URL,
	TTI_AS_BASE_URL
} from '$env/static/private';

// --- Config ---
// IS (metadata) on EU1, AS (downlink) on AU1 unless you override via env.
const TTI_IS_BASE = TTI_IS_BASE_URL || 'https://cropwatch.eu1.cloud.thethings.industries';
const TTI_AS_BASE = TTI_AS_BASE_URL || 'https://cropwatch.au1.cloud.thethings.industries';
const TTI_KEY = PRIVATE_TTI_DRAGINO_RELAY_KEY;

// Minimal fields to fetch when listing/searching devices
const FIELD_MASK = 'ids,ids.dev_eui,name';

// --- Helpers ---
function normDevEui(eui: string): string {
	return eui.replace(/[:\-\s]/g, '').toUpperCase();
}

async function ttiFetch(url: string, init?: RequestInit): Promise<Response> {
	if (!TTI_KEY) throw error(500, 'PRIVATE_TTI_DRAGINO_RELAY_KEY not configured');
	const headers = {
		Authorization: `Bearer ${TTI_KEY}`,
		'Content-Type': 'application/json',
		'User-Agent': 'cropwatch-api/1.0',
		...(init?.headers ?? {})
	};
	return fetch(url, { ...init, headers });
}

type EndDeviceLite = { ids?: { device_id?: string; dev_eui?: string }; name?: string };
type ListResp = { end_devices?: EndDeviceLite[] };

// Search (preferred).
async function resolveDeviceIdViaSearch(appId: string, devEui: string): Promise<string | null> {
	const url = new URL(
		`${TTI_IS_BASE}/api/v3/search/applications/${encodeURIComponent(appId)}/devices`
	);
	url.searchParams.set('page', '1');
	url.searchParams.set('limit', '200');
	url.searchParams.set('query', '');
	url.searchParams.set('order', '-created_at');
	url.searchParams.set('field_mask', FIELD_MASK);

	const r = await ttiFetch(url.toString());
	if (r.status === 404) return null; // search not exposed on some tenants
	if (!r.ok) throw error(502, `TTI Search failed (${r.status}): ${await r.text()}`);

	const data = (await r.json()) as ListResp;
	const match = (data.end_devices ?? []).find((d) => d?.ids?.dev_eui?.toUpperCase() === devEui);
	return match?.ids?.device_id ?? null;
}

// Fallback: List + client-side match (always available on EU1).
async function resolveDeviceIdViaList(appId: string, devEui: string): Promise<string | null> {
	const pageSize = 500;
	for (let page = 1; page <= 200; page++) {
		const url = new URL(`${TTI_IS_BASE}/api/v3/applications/${encodeURIComponent(appId)}/devices`);
		url.searchParams.set('field_mask', FIELD_MASK);
		url.searchParams.set('limit', String(pageSize));
		url.searchParams.set('page', String(page));

		const r = await ttiFetch(url.toString());
		if (!r.ok) throw error(502, `TTI List failed (${r.status}): ${await r.text()}`);

		const data = (await r.json()) as ListResp;
		const match = (data.end_devices ?? []).find((d) => d?.ids?.dev_eui?.toUpperCase() === devEui);
		if (match?.ids?.device_id) return match.ids.device_id;

		if ((data.end_devices?.length ?? 0) < pageSize) break;
	}
	return null;
}

async function resolveTtiDeviceId(appId: string, devEuiRaw: string): Promise<string> {
	const eui = normDevEui(devEuiRaw);
	const fromSearch = await resolveDeviceIdViaSearch(appId, eui);
	if (fromSearch) return fromSearch;

	const fromList = await resolveDeviceIdViaList(appId, eui);
	if (fromList) return fromList;

	throw error(404, 'TTI device not found for DevEUI in this application');
}

// --- Route ---
export const POST: RequestHandler = async ({
	params,
	request,
	locals: { supabase, safeGetSession }
}) => {
	const { session, user } = await safeGetSession();
	if (!session || !user) throw error(401, 'Authentication required');

	const devEuiParam = params.devEui;
	if (!devEuiParam) throw error(400, 'Device EUI is required');

	const errorHandler = new ErrorHandlingService();
	const repo = new DeviceRepository(supabase, errorHandler);
	const deviceService = new DeviceService(repo);

	const device = await deviceService.getDeviceWithTypeByEui(devEuiParam);
	if (!device) throw error(404, 'Device not found');

	const owner = await repo.findDeviceOwner(devEuiParam, user.id);
	if (!owner) throw error(403, 'Forbidden');

	const body = await request.json().catch(() => ({}) as any);
	const payloadName = body.payloadName as keyof typeof DRAGINO_LT22222L_PAYLOADS | undefined;
	const frm_payload = body.frm_payload as string | undefined;
	const base64Payload = payloadName ? DRAGINO_LT22222L_PAYLOADS[payloadName] : frm_payload;
	if (!base64Payload) throw error(400, 'No payload specified');

	const appId = device.cw_device_type?.TTI_application_id;
	if (!appId) throw error(500, 'Device type missing TTI application id');

	const ttiDeviceId = device.tti_name || (await resolveTtiDeviceId(appId, devEuiParam));

	const downlink = {
		frm_payload: base64Payload,
		f_port: Number.isInteger(body.f_port) ? body.f_port : 2,
		priority: (body.priority as 'LOW' | 'NORMAL' | 'HIGH' | 'HIGHEST') ?? 'HIGH',
		confirmed: typeof body.confirmed === 'boolean' ? body.confirmed : true
	};

	const url = `${TTI_AS_BASE}/api/v3/as/applications/${encodeURIComponent(
		appId
	)}/devices/${encodeURIComponent(ttiDeviceId)}/down/replace`;

	const resp = await ttiFetch(url, {
		method: 'POST',
		body: JSON.stringify({ downlinks: [downlink] })
	});

	if (!resp.ok) {
		const text = await resp.text();
		console.error('TTI downlink error', text);
		throw error(502, `Failed to send downlink (${resp.status})`);
	}

	return json({ success: true, appId, device_id: ttiDeviceId });
};
