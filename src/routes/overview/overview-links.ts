import { resolve } from '$app/paths';
import type { useCwToast } from '@cropwatchdevelopment/cwui';
import { readApiErrorMessage } from '$lib/api/api-error';
import { ApiService } from '$lib/api/api.service';
import { m } from '$lib/paraglide/messages.js';

/** The device page; null when the device has no location (the route needs one). */
export function deviceHref(
	devEui: string | undefined,
	locationId: number | null | undefined
): string | null {
	if (!devEui || locationId == null) return null;
	return resolve('/locations/[location_id]/devices/[dev_eui]', {
		location_id: String(locationId),
		dev_eui: devEui
	});
}

/**
 * Opens a report PDF in a new tab through a 60-second signed URL (the report
 * history dialog's flow). Failures are shown as a toast.
 */
export async function openReport(
	authToken: string | null | undefined,
	devEui: string,
	file: string,
	toast: ReturnType<typeof useCwToast>
): Promise<void> {
	try {
		const response = await new ApiService({ authToken }).getReportTemplateDownloadUrl(devEui, file);
		if (typeof response.url !== 'string' || !response.url) {
			toast.add({ tone: 'danger', message: m.reports_new_download_missing_url() });
			return;
		}
		window.open(response.url, '_blank', 'noopener');
	} catch (error) {
		toast.add({
			tone: 'danger',
			message: readApiErrorMessage(error, m.reports_new_download_failed())
		});
	}
}
