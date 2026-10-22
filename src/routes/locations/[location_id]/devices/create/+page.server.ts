import { buildLoginPath } from '$lib/utils/auth-redirect';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { NetworkRegion } from '$lib/api/api.dtos';
import type { DeviceTypeOption, LicenseOption } from './device-setup-flow.svelte';

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null;

function mapDeviceTypeOptions(payload: unknown): DeviceTypeOption[] {
	if (!Array.isArray(payload)) return [];

	return payload.flatMap((entry) => {
		if (!isRecord(entry)) return [];
		const { name, id } = entry;
		if (typeof name !== 'string' || (!Number.isFinite(id) && typeof id !== 'string')) {
			return [];
		}
		return [{ label: name, value: String(id) }];
	});
}

const readCoordinate = (value: unknown): number | null => {
	const parsed = typeof value === 'string' ? Number(value) : value;
	// 0,0 is a placeholder some locations carry, not a real position.
	return typeof parsed === 'number' && Number.isFinite(parsed) && parsed !== 0 ? parsed : null;
};

const NETWORK_REGIONS: NetworkRegion[] = ['as1', 'au1', 'eu1', 'nam1'];
const readRegion = (value: unknown): NetworkRegion | null =>
	NETWORK_REGIONS.includes(value as NetworkRegion) ? (value as NetworkRegion) : null;

// Every new device must consume an unassigned license seat (the TTI device
// quota paywall). Licenses fail closed: if the billing API is unreachable the
// page shows the "no available licenses" gate rather than allowing an unpaid create.
const toAvailableLicenses = (licenses: { id: number; seatIndex: number; status: string }[]) =>
	licenses
		.filter((license) => license.status !== 'assigned')
		.map(({ id, seatIndex }): LicenseOption => ({ id, seatIndex }));

/**
 * Guided device setup. The wizard submits straight to the API (CLAUDE.md:
 * complex wizard forms), so this load only gathers what the steps render.
 */
export const load: PageServerLoad = async ({ params, locals, url }) => {
	const locationId = String(params.location_id ?? '').trim();

	const authToken = locals.jwtString ?? null;
	if (!authToken) {
		redirect(
			303,
			buildLoginPath({ redirectTo: `${url.pathname}${url.search}`, reason: 'auth-required' })
		);
	}

	const { billing, devices, locations } = locals.services;

	const [deviceTypeOptions, location, availableLicenses, groupSuggestions] = await Promise.all([
		devices
			.getDeviceTypes()
			.then(mapDeviceTypeOptions)
			.catch(() => []),
		locations.getLocation(locationId).catch(() => null),
		billing
			.getLicenses()
			.then(toAvailableLicenses)
			.catch(() => []),
		// Groups already used at this location, offered as one-tap suggestions
		// (read-scoped by the API, then narrowed to this location).
		devices
			.getDevices({ take: 1000 })
			.then((allDevices) =>
				[
					...new Set(
						allDevices
							.filter((device) => String(device.location_id ?? '') === locationId)
							.map((device) => device.group?.trim() ?? '')
							.filter(Boolean)
					)
				]
					.sort((a, b) => a.localeCompare(b))
					.slice(0, 8)
			)
			.catch(() => [] as string[])
	]);

	return {
		locationId,
		locationName: location?.name ?? '',
		locationLat: readCoordinate(location?.lat),
		locationLong: readCoordinate(location?.long),
		locationRegion: readRegion(location?.network_region),
		deviceTypeOptions,
		availableLicenses,
		groupSuggestions
	};
};
