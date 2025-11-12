import { redirect, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PUBLIC_LINE_CHANNEL_ID } from '$env/static/public';
import { LINE_CHANNEL_SECRET } from '$env/static/private';

interface LineTokenResponse {
	access_token: string;
	expires_in: number;
	id_token: string;
	refresh_token?: string;
	scope: string;
	token_type: string;
}
interface LineIdTokenPayload {
	sub: string; // LINE user ID
	aud: string;
	iss: string;
	exp: number;
	iat: number;
	name?: string;
	picture?: string;
}

export const GET: RequestHandler = async ({
	url,
	cookies,
	locals: { supabase, safeGetSession }
}) => {
	const { session } = await safeGetSession();
	if (!session) redirect(303, '/auth/login');

	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const err = url.searchParams.get('error');
	if (err)
		return redirect(303, `/app/account-settings/general?line_error=${encodeURIComponent(err)}`);
	if (!code || !state) throw error(400, 'Missing code/state');

	const storedState = cookies.get('line_oauth_state');
	const codeVerifier = cookies.get('line_oauth_verifier');
	if (!storedState || storedState !== state || !codeVerifier) throw error(400, 'State mismatch');

	// Clear cookies
	cookies.delete('line_oauth_state', { path: '/' });
	cookies.delete('line_oauth_verifier', { path: '/' });

	const clientId = PUBLIC_LINE_CHANNEL_ID;
	const clientSecret = LINE_CHANNEL_SECRET;
	if (!clientId || !clientSecret) throw error(500, 'LINE env missing');

	const redirectUri = `${url.origin}/app/account-settings/general/line/callback`;

	const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'authorization_code',
			code,
			redirect_uri: redirectUri,
			client_id: clientId,
			client_secret: clientSecret,
			code_verifier: codeVerifier
		})
	});
	if (!tokenRes.ok) {
		const text = await tokenRes.text();
		return redirect(
			303,
			`/app/account-settings/general?line_error=token_exchange_failed&detail=${encodeURIComponent(text)}`
		);
	}
	const tokenJson = (await tokenRes.json()) as LineTokenResponse;
	if (!tokenJson.id_token)
		return redirect(303, '/app/account-settings/general?line_error=missing_id_token');

	// Decode (no signature verify yet)
	const [, payloadB64] = tokenJson.id_token.split('.');
	if (!payloadB64) return redirect(303, '/app/account-settings/general?line_error=bad_id_token');
	const payloadJson = JSON.parse(
		Buffer.from(payloadB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
	) as LineIdTokenPayload;
	const lineUserId = payloadJson.sub;
	if (!lineUserId)
		return redirect(303, '/app/account-settings/general?line_error=missing_line_user');

	const { error: upErr } = await supabase
		.from('profiles')
		.update({ line_id: lineUserId, updated_at: new Date().toISOString() })
		.eq('id', session.user.id);
	if (upErr)
		return redirect(
			303,
			`/app/account-settings/general?line_error=save_failed&detail=${encodeURIComponent(upErr.message)}`
		);

	return redirect(303, '/app/account-settings/general?line_connected=1');
};
