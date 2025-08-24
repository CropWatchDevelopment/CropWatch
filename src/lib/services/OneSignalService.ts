import { ErrorHandlingService } from '../errors/ErrorHandlingService';
// SvelteKit env imports. Public App ID may be used on client; REST key must stay private.
import { PUBLIC_ONESIGNAL_APP_ID, PUBLIC_ONESIGNAL_SAFARI_WEB_ID } from '$env/static/public';
import { PRIVATE_ONESIGNAL_REST_API_KEY } from '$env/static/private';

/**
 * OneSignal push helper (2025 docs: Create message API)
 * Env vars (SvelteKit style):
 *  PUBLIC_ONESIGNAL_APP_ID (public)
 *  PUBLIC_ONESIGNAL_SAFARI_WEB_ID (public, optional for Safari web push)
 *  PRIVATE_ONESIGNAL_REST_API_KEY (server only)
 */
export class OneSignalService {
	constructor(private errorHandler: ErrorHandlingService) {}

	private assertEnv() {
		if (!PUBLIC_ONESIGNAL_APP_ID) throw new Error('PUBLIC_ONESIGNAL_APP_ID not configured');
		if (!PRIVATE_ONESIGNAL_REST_API_KEY)
			throw new Error('PRIVATE_ONESIGNAL_REST_API_KEY not configured');
	}

	private baseHeaders() {
		this.assertEnv();
		return {
			'content-type': 'application/json; charset=utf-8',
			authorization: `Key ${PRIVATE_ONESIGNAL_REST_API_KEY}`
		};
	}

	/**
	 * Send a push notification.
	 * Provide either externalUserIds (preferred) or includedSegments.
	 */
	async sendPush(options: {
		headings?: Record<string, string>;
		contents: Record<string, string>;
		externalUserIds?: string[]; // OneSignal External IDs
		includedSegments?: string[]; // e.g. ['Test Users']
		data?: Record<string, unknown>;
		iosAttachments?: Record<string, string>;
		bigPicture?: string; // Android image
		name?: string; // internal name in dashboard
	}): Promise<any> {
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

			if (!contents || Object.keys(contents).length === 0) {
				throw new Error('contents is required');
			}
			if (!externalUserIds?.length && !includedSegments?.length) {
				throw new Error('Must supply externalUserIds or includedSegments');
			}

			const body: any = {
				app_id: PUBLIC_ONESIGNAL_APP_ID,
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

// Optional helper for web push initialization (Safari ID is exposed for completeness)
export const ONE_SIGNAL_PUBLIC_CONFIG = {
	appId: PUBLIC_ONESIGNAL_APP_ID,
	safari_web_id: PUBLIC_ONESIGNAL_SAFARI_WEB_ID
};
