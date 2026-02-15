import type { Session } from '@supabase/supabase-js';

export type SessionTokens = {
	access_token: string;
	refresh_token?: string | null;
};

type SessionLike = Pick<Session, 'access_token' | 'refresh_token'> | null | undefined;

export function sessionToTokens(session: SessionLike): SessionTokens | undefined {
	if (!session?.access_token) {
		return undefined;
	}

	return {
		access_token: session.access_token,
		refresh_token: session.refresh_token ?? null
	};
}
