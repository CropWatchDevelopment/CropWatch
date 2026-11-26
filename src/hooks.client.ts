import type { HandleClientError } from '@sveltejs/kit/hooks';
import { clearAllClientState } from '#lib/utils/client-state.ts';

// SvelteKit passes every error here. `error(...)` results keep their status and
// message; framework errors (a 404, …) keep their status and safe message.
export const handleError: HandleClientError = ({ kind, error }) => {
	if (kind === 'app') return;
	console.error('[CropWatch] Unexpected client error:', error);

	if (kind === 'unknown' || error.status === 500) {
		clearAllClientState();
		window.location.href = '/auth/login?reason=error-recovery';
	}
};
