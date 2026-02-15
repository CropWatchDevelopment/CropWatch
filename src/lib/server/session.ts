import { redirect } from '@sveltejs/kit';
import type { Session, User } from '@supabase/supabase-js';

type SafeGetSession = App.Locals['safeGetSession'];
type SessionSource = SafeGetSession | Pick<App.Locals, 'safeGetSession'>;

function resolveSafeGetSession(source: SessionSource): SafeGetSession {
	return typeof source === 'function' ? source : source.safeGetSession;
}

export async function getSessionWithUser(source: SessionSource): Promise<{
	session: Session | null;
	user: User | null;
}> {
	const safeGetSession = resolveSafeGetSession(source);
	return safeGetSession();
}

export async function requireSession(source: SessionSource): Promise<Session> {
	const { session } = await getSessionWithUser(source);
	if (!session) {
		throw redirect(303, '/auth');
	}

	return session;
}
