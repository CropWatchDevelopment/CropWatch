// src/routes/api/v1/line/+server.ts
import { json, redirect } from '@sveltejs/kit';
import { PRIVATE_LINE_CHAT_KEY } from "$env/static/private"

export async function POST({ request, url, locals: { supabase, safeGetSession } }) {
    const session = await safeGetSession();
    if (!session.user) {
        return redirect(301, '/auth/unauthorized');
    }

    // const code = url.searchParams.get('code');
    // const state = url.searchParams.get('state');
    // const error = url.searchParams.get('error');
    const { code, state, error } = await request.json();

    if (error) {
        return json({ success: false, message: 'Authorization failed', error }, { status: 400 });
    }

    if (!code || !state) {
        return json({ success: false, message: 'Invalid callback' }, { status: 400 });
    }

    // Exchange the code for an access token
    const tokenResponse = await fetch('https://notify-bot.line.me/oauth/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: 'https://app.cropwatch.io/app/lineChat/notifications-callback', // Ensure this matches exactly
            client_id: 'OgvNbMAZkaUJfsdUtSaFlz',
            client_secret: PRIVATE_LINE_CHAT_KEY,
        }),
    });

    const tokenData = await tokenResponse.json();
    if (tokenData.status > 299) {
        return json({ success: false, message: tokenData.message, error: tokenData }, { status: 400 });
    }

    console.log(tokenData);
    const { data, error: dbError } = await supabase.from('profiles').update({ line_notify_token: tokenData.access_token }).eq('id', session.user.id);

    if (dbError) {
        return json({ success: false, message: 'Failed to save LINE Notify token', error: dbError }, { status: 400 });
    }

    if (tokenData.access_token) {
        // Store the access token and any relevant user info
        return json({ success: true, message: 'Successfully registered with LINE Notify', access_token: tokenData.access_token, data });
    } else {
        return json({ success: false, message: 'Failed to acquire access token', error: tokenData }, { status: 400 });
    }
}
