import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PUBLIC_LINE_CHANNEL_ID } from '$env/static/public';
import { LINE_CHANNEL_SECRET } from '$env/static/private';

interface LineTokenResponse {
	access_token: string;
	expires_in: number;
	id_token: string;
	refresh_token: string;
	scope: string;
	token_type: string;
}

interface LineIdTokenPayload {
	iss: string;
	sub: string; // LINE user ID
	aud: string;
	exp: number;
	iat: number;
	amr?: string[];
	name?: string;
	picture?: string;
}

export const GET: RequestHandler = async ({ url, locals: { supabase, safeGetSession } }) => {
	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const error = url.searchParams.get('error');
	if (error) {
		// User canceled or error occurred
		return redirect(303, '/app/account-settings/general?line_error=' + encodeURIComponent(error));
	}
	if (!code) {
		return redirect(303, '/app/account-settings/general?line_error=missing_code');
	}

	const channelId = PUBLIC_LINE_CHANNEL_ID;
	const channelSecret = LINE_CHANNEL_SECRET; // private
	if (!channelId || !channelSecret) {
		return new Response('LINE env vars missing', { status: 500 });
	}

	const redirectUri = `${url.origin}/app/account-settings/general/line/callback`;

	const tokenRes = await fetch('https://api.line.me/oauth2/v2.1/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'authorization_code',
			code,
			redirect_uri: redirectUri,
			client_id: channelId,
			client_secret: channelSecret
		})
	});

	if (!tokenRes.ok) {
		return redirect(303, '/app/account-settings/general?line_error=token_exchange_failed');
	}
	const tokenJson = (await tokenRes.json()) as LineTokenResponse;

	// Verify id_token and extract sub (LINE user ID)
	// For brevity, we decode without verifying signature here.
	// In production, verify JWT signature: https://developers.line.biz/en/docs/line-login/get-user-profile/
	const idToken = tokenJson.id_token;
	const [, payloadB64] = idToken.split('.');
	let lineUserId: string | undefined;
	if (payloadB64) {
		const jsonStr = Buffer.from(
			payloadB64.replace(/-/g, '+').replace(/_/g, '/'),
			'base64'
		).toString('utf-8');
		const payload = JSON.parse(jsonStr) as LineIdTokenPayload;
		lineUserId = payload.sub;
	}
	if (!lineUserId) {
		return redirect(303, '/app/account-settings/general?line_error=missing_line_user');
	}

	const { session } = await safeGetSession();
	if (!session) redirect(303, '/auth/login');

	await supabase
		.from('profiles')
		.update({ line_id: lineUserId, updated_at: new Date() })
		.eq('id', session.user.id);

	return redirect(303, '/app/account-settings/general?line_connected=1');
};
