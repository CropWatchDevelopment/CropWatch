import type { PageLoad } from './$types';

export const load = (async ({ parent }) => {
	const { facilities, locations, devices } = await parent();
	return { facilities, locations, devices };
}) satisfies PageLoad;
