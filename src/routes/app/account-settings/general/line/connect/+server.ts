import { redirect, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PUBLIC_LINE_CHANNEL_ID } from '$env/static/public';

// Utility: base64url encode ArrayBuffer
function b64url(buffer: ArrayBuffer) {
	return Buffer.from(buffer)
		.toString('base64')
		.replace(/=/g, '')
		.replace(/\+/g, '-')
		.replace(/\//g, '_');
}
// PKCE code verifier (43-128 chars)
function generateCodeVerifier() {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);
	return b64url(bytes.buffer); // already url-safe
}

export const GET: RequestHandler = async ({ url, cookies, locals: { safeGetSession } }) => {
	const { session } = await safeGetSession();
	if (!session) redirect(303, '/auth/login');

	const clientId = PUBLIC_LINE_CHANNEL_ID;
	if (!clientId) throw error(500, 'Missing PUBLIC_LINE_CHANNEL_ID');

	const state = crypto.randomUUID();
	const codeVerifier = generateCodeVerifier();
	const challengeBuffer = await crypto.subtle.digest(
		'SHA-256',
		new TextEncoder().encode(codeVerifier)
	);
	const codeChallenge = b64url(challengeBuffer);

	// Persist values in httpOnly cookies (10 min lifetime)
	const cookieOpts = {
		path: '/',
		httpOnly: true,
		sameSite: 'lax' as const,
		secure: url.protocol === 'https:',
		maxAge: 600
	};
	cookies.set('line_oauth_state', state, cookieOpts);
	cookies.set('line_oauth_verifier', codeVerifier, cookieOpts);

	const redirectUri = `${url.origin}/app/account-settings/general/line/callback`;

	const authUrl = new URL('https://access.line.me/oauth2/v2.1/authorize');
	authUrl.searchParams.set('response_type', 'code');
	authUrl.searchParams.set('client_id', clientId);
	authUrl.searchParams.set('redirect_uri', redirectUri);
	authUrl.searchParams.set('state', state);
	authUrl.searchParams.set('scope', 'profile openid');
	authUrl.searchParams.set('prompt', 'consent');
	authUrl.searchParams.set('code_challenge', codeChallenge);
	authUrl.searchParams.set('code_challenge_method', 'S256');

	return redirect(302, authUrl.toString());
};
