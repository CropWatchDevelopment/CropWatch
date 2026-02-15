import { getTokyoMonthBounds } from '$lib/components/pages/device/logic/device-core.svelte';

type DeviceTypeLike = {
	name?: string | null;
	manufacturer?: string | null;
	model?: string | null;
};

export const normalizeTrafficDeviceType = (
	raw: DeviceTypeLike | DeviceTypeLike[] | null | undefined
) => (Array.isArray(raw) ? (raw[0] ?? null) : (raw ?? null));

export const buildTrafficDeviceLabel = (deviceType: DeviceTypeLike | null | undefined) => {
	const name = deviceType?.name ?? '';
	const manufacturer = deviceType?.manufacturer ?? '';
	const model = deviceType?.model ?? '';
	return `${manufacturer} ${name} ${model}`.trim();
};

export const isTrafficDeviceLabel = (label: string) => {
	const normalized = label.toLowerCase();
	return normalized.includes('cropwatch') && normalized.includes('nvidia') && normalized.includes('jetson');
};

export const resolveTrafficRange = (searchParams: URLSearchParams) => {
	const startParam = searchParams.get('trafficStart');
	const endParam = searchParams.get('trafficEnd');
	const start = startParam ? new Date(startParam) : null;
	const end = endParam ? new Date(endParam) : null;
	if (start && end && Number.isFinite(start.getTime()) && Number.isFinite(end.getTime())) {
		return { start, end };
	}
	return getTokyoMonthBounds(new Date());
};
