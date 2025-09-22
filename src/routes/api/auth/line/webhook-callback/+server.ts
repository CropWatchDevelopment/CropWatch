import type { RequestHandler } from '@sveltejs/kit';

/**
 * LINE webhook callback endpoint (POST).
 * Accepts JSON payloads. Responds with a simple acknowledgement.
 * Extend this handler to verify the X-Line-Signature header and process events.
 */
export const POST: RequestHandler = async (event) => {
	let payload: unknown = null;
	try {
		// Attempt to parse JSON body (LINE sends application/json)
		if (event.request.headers.get('content-type')?.includes('application/json')) {
			payload = await event.request.json();
		} else if (event.request.body) {
			// Fallback: read text just in case
			const text = await event.request.text();
			try {
				payload = JSON.parse(text);
			} catch {
				payload = text;
			}
		}
	} catch (err) {
		return new Response(
			JSON.stringify({ ok: false, error: 'Invalid JSON body', detail: (err as Error).message }),
			{ status: 400, headers: { 'content-type': 'application/json' } }
		);
	}

	// TODO (optional): Verify signature
	// const signature = event.request.headers.get('x-line-signature');
	// if (LINE_CHANNEL_SECRET && !verifyLineSignature(signature, LINE_CHANNEL_SECRET, rawBody)) {
	//   return new Response(JSON.stringify({ ok: false, error: 'Invalid signature' }), { status: 403, headers: { 'content-type': 'application/json' } });
	// }

	// Minimal echo response; adapt as needed for your application logic
	return new Response(JSON.stringify({ ok: true, receivedAt: new Date().toISOString(), payload }), {
		status: 200,
		headers: { 'content-type': 'application/json' }
	});
};

// Provide a simple GET response so visiting the URL in a browser doesn't 404 (was causing confusion)
export const GET: RequestHandler = async () => {
	return new Response(
		JSON.stringify({
			ok: true,
			message: 'LINE webhook endpoint is alive. Send POST requests with JSON body.'
		}),
		{ status: 200, headers: { 'content-type': 'application/json' } }
	);
};

// (Optional future helper) Example signature verification placeholder
// function verifyLineSignature(signature: string | null, secret: string, body: string | ArrayBuffer) {
//   if (!signature) return false;
//   // Implement HMAC-SHA256 using secret over raw request body, then compare Base64
//   return true;
// }
