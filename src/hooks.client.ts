import type { HandleClientError } from '@sveltejs/kit';
import { clearAllClientState } from '$lib/utils/client-state';

export const handleError: HandleClientError = ({ error, status, message }) => {
	console.error('[CropWatch] Unexpected client error:', error);

	if (status === 500 || status === undefined) {
		clearAllClientState();
		window.location.href = '/auth/login?reason=error-recovery';
		return;
	}

	return {
		message
	};
};
