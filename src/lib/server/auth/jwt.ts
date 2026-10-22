import type { IJWT } from '$lib/interfaces/jwt.interface';

/**
 * The payload of a JWT, **without verifying it** — only for reading `exp`
 * before the token is verified (`supabaseAuth.verifyAccessToken`). Null when
 * the token is not a well-formed JWT.
 */
export function decodeJwtPayload(token: string): IJWT | null {
	const parts = token.split('.');
	if (parts.length !== 3 || !parts[1]) return null;

	try {
		const payload: unknown = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
		if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
		return typeof (payload as { exp?: unknown }).exp === 'number' ? (payload as IJWT) : null;
	} catch {
		return null;
	}
}
