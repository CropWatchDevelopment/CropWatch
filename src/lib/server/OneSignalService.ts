import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';
import { env as publicEnv } from '$env/dynamic/public';
import { env as privateEnv } from '$env/dynamic/private';

/**
 * Server-side OneSignal push helper (2025 docs: Create message API)
 * Uses SvelteKit dynamic env so build won't fail if vars absent at build-time.
 * Required at runtime:
 *  PUBLIC_ONESIGNAL_APP_ID
 *  PRIVATE_ONESIGNAL_REST_API_KEY
 */
export class OneSignalService {
	constructor(private errorHandler: ErrorHandlingService) {}

	private assertEnv() {
		if (!publicEnv.PUBLIC_ONESIGNAL_APP_ID)
			throw new Error('PUBLIC_ONESIGNAL_APP_ID not configured');
		if (!privateEnv.PRIVATE_ONESIGNAL_REST_API_KEY)
			throw new Error('PRIVATE_ONESIGNAL_REST_API_KEY not configured');
	}

	private baseHeaders() {
		this.assertEnv();
		return {
			'content-type': 'application/json; charset=utf-8',
			authorization: `Key ${privateEnv.PRIVATE_ONESIGNAL_REST_API_KEY}`
		};
	}

	async sendPush(options: {
		headings?: Record<string, string>;
		contents: Record<string, string>;
		externalUserIds?: string[];
		includedSegments?: string[];
		data?: Record<string, unknown>;
		iosAttachments?: Record<string, string>;
		bigPicture?: string;
		name?: string;
	}) {
		try {
			this.assertEnv();
			const {
				headings,
				contents,
				externalUserIds,
				includedSegments,
				data,
				iosAttachments,
				bigPicture,
				name
			} = options;
			if (!contents || Object.keys(contents).length === 0) throw new Error('contents is required');
			if (!externalUserIds?.length && !includedSegments?.length)
				throw new Error('Must supply externalUserIds or includedSegments');

			const body: any = {
				app_id: publicEnv.PUBLIC_ONESIGNAL_APP_ID,
				target_channel: 'push',
				contents,
				headings,
				data,
				name
			};
			if (externalUserIds?.length) body.include_external_user_ids = externalUserIds;
			if (includedSegments?.length) body.included_segments = includedSegments;
			if (iosAttachments) body.ios_attachments = iosAttachments;
			if (bigPicture) body.big_picture = bigPicture;

			const res = await fetch('https://api.onesignal.com/notifications', {
				method: 'POST',
				headers: this.baseHeaders(),
				body: JSON.stringify(body)
			});
			if (!res.ok) {
				const text = await res.text();
				throw new Error(`OneSignal error ${res.status}: ${text}`);
			}
			return await res.json();
		} catch (err) {
			this.errorHandler.logError(err as Error);
			throw err;
		}
	}
}
