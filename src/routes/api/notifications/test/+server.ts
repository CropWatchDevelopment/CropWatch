import type { RequestHandler } from '@sveltejs/kit';
import { ErrorHandlingService } from '$lib/errors/ErrorHandlingService';
import { OneSignalService } from '$lib/server/OneSignalService';

/**
 * Test endpoint to send a push to either provided externalUserIds or the Test Users segment.
 * Secure this route (add auth / role checks) before using outside local dev.
 * Uses env vars: PUBLIC_ONESIGNAL_APP_ID / PRIVATE_ONESIGNAL_REST_API_KEY
 * POST body JSON: { contents: { en: "Hello" }, externalUserIds?: ["user123"], includedSegments?: ["Test Users"] }
 */
export const POST: RequestHandler = async ({ request }) => {
	const errorHandler = new ErrorHandlingService();
	const oneSignal = new OneSignalService(errorHandler);
	try {
		const body = await request.json();
		// Basic validation
		if (!body.contents) {
			return new Response(JSON.stringify({ error: 'contents required' }), { status: 400 });
		}

		const result = await oneSignal.sendPush({
			contents: body.contents,
			headings: body.headings,
			externalUserIds: body.externalUserIds,
			includedSegments: body.includedSegments || (!body.externalUserIds && ['Test Users']),
			data: body.data,
			iosAttachments: body.iosAttachments,
			bigPicture: body.bigPicture,
			name: body.name || 'Test API Push'
		});

		return new Response(JSON.stringify({ success: true, result }), { status: 200 });
	} catch (err) {
		return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500 });
	}
};
