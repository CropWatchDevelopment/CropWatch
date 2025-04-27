import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PRIVATE_DISCORD_CLIENT_SECRET } from '$env/static/private';

export const GET: RequestHandler = async ({ url, locals, cookies, fetch }) => {
	// Get the code from the Discord callback
	const code = url.searchParams.get('code');
	
	// If there's no code, there was a problem with the authorization
	if (!code) {
		// Redirect back to settings with error message
		throw redirect(303, '/app/app-settings?error=discord_auth_failed');
	}
	
	try {
		// Exchange the authorization code for an access token
		const clientId = '1332961064832204893';
		 // Use the environment variable
		const clientSecret = PRIVATE_DISCORD_CLIENT_SECRET;
		
		if (!clientSecret) {
			console.error('DISCORD_CLIENT_SECRET environment variable is not set');
			throw redirect(303, '/app/app-settings?error=discord_config_missing');
		}
		
		const redirectUri = `${url.origin}/api/discord/callback`;
		
		const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: new URLSearchParams({
				client_id: clientId,
				client_secret: clientSecret,
				code,
				grant_type: 'authorization_code',
				redirect_uri: redirectUri,
			})
		});
		
		if (!tokenResponse.ok) {
			console.error('Discord token exchange failed:', await tokenResponse.text());
			throw redirect(303, '/app/app-settings?error=discord_token_exchange_failed');
		}
		
		const tokenData = await tokenResponse.json();
		const { access_token, token_type } = tokenData;
		
		// Get the user's Discord info
		const userResponse = await fetch('https://discord.com/api/users/@me', {
			headers: {
				authorization: `${token_type} ${access_token}`,
			},
		});
		
		if (!userResponse.ok) {
			console.error('Failed to fetch Discord user:', await userResponse.text());
			throw redirect(303, '/app/app-settings?error=discord_user_fetch_failed');
		}
		
		const userData = await userResponse.json();
		
		// Get the current user from our database
		const { data: { session } } = await locals.supabase.auth.getSession();
		if (!session) {
			throw redirect(303, '/auth/login?error=session_expired');
		}
		
		const userId = session.user.id;
		
		// Store the Discord user ID and username in our database
		const { error: upsertError } = await locals.supabase
			.from('user_discord_connections')
			.upsert({
				user_id: userId,
				discord_user_id: userData.id,
				discord_username: userData.username,
				avatar: userData.avatar,
				access_token,
				token_type
			}, {
				onConflict: 'user_id'
			});
		
		if (upsertError) {
			console.error('Failed to save Discord connection:', upsertError);
			throw redirect(303, '/app/app-settings?error=discord_save_failed');
		}
		
		// Redirect back to settings with success message
		throw redirect(303, '/app/app-settings?success=discord_connected');
	} catch (error) {
		console.error('Discord authentication error:', error);
		throw redirect(303, '/app/app-settings?error=discord_authentication_failed');
	}
};