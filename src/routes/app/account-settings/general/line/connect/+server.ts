import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PUBLIC_LINE_CHANNEL_ID } from '$env/static/public';

// LINE Login start
// Docs: https://developers.line.biz/en/docs/line-login/integrate-line-login/
export const GET: RequestHandler = async ({ url, locals: { safeGetSession } }) => {
	const { session } = await safeGetSession();
	if (!session) redirect(303, '/auth/login');

	const channelId = PUBLIC_LINE_CHANNEL_ID; // define in .env as PUBLIC_LINE_CHANNEL_ID
	if (!channelId) {
		return new Response('LINE channel id missing (PUBLIC_LINE_CHANNEL_ID)', { status: 500 });
	}

	const state = crypto.randomUUID(); // TODO: persist state to validate in callback
	const redirectUri = `${url.origin}/app/account-settings/general/line/callback`;

	const authUrl = new URL('https://access.line.me/oauth2/v2.1/authorize');
	authUrl.searchParams.set('response_type', 'code');
	authUrl.searchParams.set('client_id', channelId);
	authUrl.searchParams.set('redirect_uri', redirectUri);
	authUrl.searchParams.set('state', state);
	authUrl.searchParams.set('scope', 'profile openid');
	authUrl.searchParams.set('prompt', 'consent');

	return redirect(302, authUrl.toString());
};
